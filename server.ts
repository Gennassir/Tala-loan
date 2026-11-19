import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { LOAN_PACKAGES } from './src/data/loanPackages.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const GATEWAY_API_URL = (process.env.GATEWAY_API_URL || 'https://harakapaye.co.ke/api/v1').replace(/\/+$/, '');
const GATEWAY_PUBLIC_KEY = process.env.GATEWAY_PUBLIC_KEY || '';
const GATEWAY_SECRET_KEY = process.env.GATEWAY_SECRET_KEY || '';
const GATEWAY_SIGNING_SECRET = process.env.GATEWAY_SIGNING_SECRET || '';
const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '');

type PaymentStatus = 'pending' | 'success' | 'cancelled' | 'failed' | 'expired';
type PaymentPurpose = 'application_fee' | 'repayment';

interface ServerPaymentRecord {
  reference: string;
  gatewayReference: string | null;
  checkoutRequestId: string | null;
  packageId: string;
  purpose: PaymentPurpose;
  amount: number;
  phone: string;
  fullName: string;
  nationalId: string;
  status: PaymentStatus;
  receiptCode: string | null;
  message: string | null;
  createdAt: string;
  completedAt: string | null;
  serverVerifiedAt: string | null;
}

const paymentStore = new Map<string, ServerPaymentRecord>();
const gatewayRefIndex = new Map<string, string>();
const sseClients = new Map<string, Set<Response>>();
const activePollers = new Map<string, NodeJS.Timeout>();

const STK_TIMEOUT_MS = 120_000;

function normalizeKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && (digits.startsWith('07') || digits.startsWith('01'))) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return `254${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('254')) {
    return digits;
  }
  return null;
}

function broadcastPaymentUpdate(record: ServerPaymentRecord): void {
  const listeners = sseClients.get(record.reference);
  if (!listeners || listeners.size === 0) return;

  const payload = JSON.stringify({
    reference: record.reference,
    gatewayReference: record.gatewayReference,
    status: record.status,
    amount: record.amount,
    phone: record.phone,
    receiptCode: record.receiptCode,
    message: record.message,
    completedAt: record.completedAt,
    serverVerifiedAt: record.serverVerifiedAt,
  });

  for (const res of listeners) {
    res.write(`event: status\ndata: ${payload}\n\n`);
  }
}

function stopPoller(reference: string): void {
  const existing = activePollers.get(reference);
  if (existing) {
    clearInterval(existing);
    activePollers.delete(reference);
  }
}

function normalizeGatewayStatus(rawStatus: unknown): PaymentStatus {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  if (rawStatus === 'failed') return 'failed';
  return 'pending';
}

async function verifyPaymentWithGateway(reference: string): Promise<ServerPaymentRecord | null> {
  const record = paymentStore.get(reference);
  if (!record) return null;

  if (record.status !== 'pending') {
    return record;
  }

  const lookupRef = record.gatewayReference || record.reference;

  try {
    const response = await fetch(`${GATEWAY_API_URL}/payments/${encodeURIComponent(lookupRef)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GATEWAY_SECRET_KEY}`,
        ...(GATEWAY_PUBLIC_KEY ? { 'X-Public-Key': GATEWAY_PUBLIC_KEY } : {}),
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const body = (await response.json()) as {
        success?: boolean;
        data?: {
          reference?: string;
          external_reference?: string;
          status?: string;
          amount?: number;
          receipt_code?: string | null;
          message?: string | null;
          completed_at?: string | null;
        };
      };

      if (body.success && body.data) {
        const nextStatus = normalizeGatewayStatus(body.data.status);
        record.gatewayReference = body.data.reference || record.gatewayReference;
        if (record.gatewayReference) {
          gatewayRefIndex.set(record.gatewayReference, record.reference);
        }
        record.receiptCode = body.data.receipt_code ?? record.receiptCode;
        record.message = body.data.message ?? record.message;
        record.completedAt = body.data.completed_at ?? record.completedAt;
        record.serverVerifiedAt = new Date().toISOString();

        if (nextStatus !== record.status) {
          record.status = nextStatus;
          broadcastPaymentUpdate(record);
          stopPoller(record.reference);
        }
      }
    }
  } catch (err) {
    console.error(`[HarakaPay verify error for ${reference}]`, err);
  }

  // Enforce server-side timeout if still pending past STK window
  const elapsedMs = Date.now() - new Date(record.createdAt).getTime();
  if (record.status === 'pending' && elapsedMs >= STK_TIMEOUT_MS) {
    record.status = 'expired';
    record.message = 'Timed out waiting for M-Pesa PIN confirmation.';
    record.serverVerifiedAt = new Date().toISOString();
    broadcastPaymentUpdate(record);
    stopPoller(record.reference);
  }

  return record;
}

function startServerVerificationLoop(reference: string): void {
  stopPoller(reference);
  const timer = setInterval(async () => {
    const updated = await verifyPaymentWithGateway(reference);
    if (!updated || updated.status !== 'pending') {
      stopPoller(reference);
    }
  }, 3000);
  activePollers.set(reference, timer);
}

async function startServer() {
  const app = express();

  // Webhook route MUST receive raw body bytes for HMAC-SHA256 verification
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response) => {
      if (!GATEWAY_SIGNING_SECRET) {
        return res.status(500).json({ error: 'Signing secret not configured.' });
      }

      const ts = req.header('X-Gateway-Timestamp') || '';
      const sig = req.header('X-Gateway-Signature') || '';
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

      const expected =
        'sha256=' +
        crypto
          .createHmac('sha256', GATEWAY_SIGNING_SECRET)
          .update(`${ts}.${rawBody}`)
          .digest('hex');

      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      const sigMatches =
        sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      const tsSeconds = Number(ts);
      const tsValid = Number.isFinite(tsSeconds) && Math.abs(Date.now() / 1000 - tsSeconds) <= 300;

      if (!sigMatches || !tsValid) {
        return res.sendStatus(401);
      }

      try {
        const event = JSON.parse(rawBody) as {
          event?: string;
          data?: {
            reference?: string;
            external_reference?: string;
            status?: string;
            receipt_code?: string | null;
            message?: string | null;
            completed_at?: string | null;
          };
        };

        const extRef = event.data?.external_reference;
        const gwRef = event.data?.reference;
        const localRef =
          (extRef && paymentStore.has(extRef) ? extRef : undefined) ||
          (gwRef ? gatewayRefIndex.get(gwRef) : undefined);

        if (localRef) {
          const record = paymentStore.get(localRef);
          if (record && record.status === 'pending') {
            const nextStatus = normalizeGatewayStatus(event.data?.status);
            if (event.event === 'payment.success' || nextStatus === 'success') {
              record.status = 'success';
            } else if (nextStatus !== 'pending') {
              record.status = nextStatus;
            }
            record.receiptCode = event.data?.receipt_code ?? record.receiptCode;
            record.message = event.data?.message ?? record.message;
            record.completedAt = event.data?.completed_at ?? new Date().toISOString();
            record.serverVerifiedAt = new Date().toISOString();

            broadcastPaymentUpdate(record);
            if (record.status !== 'pending') {
              stopPoller(record.reference);
            }
          }
        }
      } catch (err) {
        console.error('[HarakaPay webhook parse error]', err);
        return res.sendStatus(400);
      }

      return res.sendStatus(200);
    }
  );

  app.use(express.json());

  // Initiate M-Pesa STK Push via HarakaPay server-side
  app.post('/api/payments/stk-push', async (req: Request, res: Response) => {
    if (!GATEWAY_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway secret key is not configured on the server.',
      });
    }

    const {
      packageId,
      purpose = 'application_fee',
      fullName,
      nationalId,
      phone,
    } = req.body as {
      packageId?: string;
      purpose?: PaymentPurpose;
      fullName?: string;
      nationalId?: string;
      phone?: string;
    };

    const pkg = LOAN_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return res.status(422).json({
        success: false,
        error: 'Selected loan package was not found.',
      });
    }

    if (!fullName || fullName.trim().length < 3) {
      return res.status(422).json({
        success: false,
        error: 'Applicant full name is required.',
      });
    }

    if (!nationalId || !/^\d{7,9}$/.test(nationalId.trim())) {
      return res.status(422).json({
        success: false,
        error: 'A valid 7 to 9 digit National ID number is required.',
      });
    }

    const normalizedPhone = phone ? normalizeKenyanPhone(phone) : null;
    if (!normalizedPhone) {
      return res.status(422).json({
        success: false,
        error: 'Invalid M-Pesa phone number. Use 07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX.',
      });
    }

    const paymentPurpose: PaymentPurpose = purpose === 'repayment' ? 'repayment' : 'application_fee';
    const authoritativeAmount =
      paymentPurpose === 'repayment' ? pkg.totalRepayable : pkg.fee;

    const reference = `LP-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    const description =
      paymentPurpose === 'repayment'
        ? `LendPlus Repay ${pkg.amount}`
        : `LendPlus Fee ${pkg.amount}`;

    const payload: Record<string, unknown> = {
      phone: normalizedPhone,
      amount: authoritativeAmount,
      reference,
      description: description.slice(0, 60),
    };

    if (APP_URL.startsWith('https://')) {
      payload.callback_url = `${APP_URL}/api/payments/webhook`;
    }

    try {
      const gwResponse = await fetch(`${GATEWAY_API_URL}/stk/push`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GATEWAY_SECRET_KEY}`,
          ...(GATEWAY_PUBLIC_KEY ? { 'X-Public-Key': GATEWAY_PUBLIC_KEY } : {}),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const gwBody = (await gwResponse.json().catch(() => null)) as {
        success?: boolean;
        duplicate?: boolean;
        message?: string;
        error?: string;
        data?: {
          reference?: string;
          external_reference?: string;
          status?: string;
          amount?: number;
          phone?: string;
          checkout_request_id?: string | null;
          receipt_code?: string | null;
          message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      } | null;

      if (!gwResponse.ok || !gwBody?.success || !gwBody.data) {
        return res.status(gwResponse.status >= 400 ? gwResponse.status : 502).json({
          success: false,
          error:
            gwBody?.error ||
            gwBody?.message ||
            'Unable to send M-Pesa STK push request. Please try again.',
        });
      }

      const record: ServerPaymentRecord = {
        reference,
        gatewayReference: gwBody.data.reference || null,
        checkoutRequestId: gwBody.data.checkout_request_id || null,
        packageId: pkg.id,
        purpose: paymentPurpose,
        amount: authoritativeAmount,
        phone: gwBody.data.phone || normalizedPhone,
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        status: normalizeGatewayStatus(gwBody.data.status),
        receiptCode: gwBody.data.receipt_code || null,
        message: gwBody.data.message || gwBody.message || null,
        createdAt: new Date().toISOString(),
        completedAt: gwBody.data.completed_at || null,
        serverVerifiedAt: new Date().toISOString(),
      };

      paymentStore.set(reference, record);
      if (record.gatewayReference) {
        gatewayRefIndex.set(record.gatewayReference, reference);
      }

      if (record.status === 'pending') {
        startServerVerificationLoop(reference);
      }

      return res.status(201).json({
        success: true,
        message:
          gwBody.message ||
          'An STK push has been sent to your phone. Enter PIN to complete transaction.',
        data: {
          reference: record.reference,
          gatewayReference: record.gatewayReference,
          status: record.status,
          amount: record.amount,
          phone: record.phone,
          purpose: record.purpose,
          timeoutSeconds: STK_TIMEOUT_MS / 1000,
          serverVerifiedAt: record.serverVerifiedAt,
        },
      });
    } catch (err) {
      console.error('[HarakaPay STK push network error]', err);
      return res.status(502).json({
        success: false,
        error: 'Could not reach the M-Pesa payment gateway. Please retry shortly.',
      });
    }
  });

  // Authoritative server-side payment status verification endpoint
  app.get('/api/payments/:reference', async (req: Request, res: Response) => {
    const ref = req.params.reference;
    const record = await verifyPaymentWithGateway(ref);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payment reference not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        reference: record.reference,
        gatewayReference: record.gatewayReference,
        status: record.status,
        amount: record.amount,
        phone: record.phone,
        receiptCode: record.receiptCode,
        message: record.message,
        completedAt: record.completedAt,
        serverVerifiedAt: record.serverVerifiedAt,
      },
    });
  });

  // Real-time Server-Sent Events (SSE) stream for live payment card updates
  app.get('/api/payments/:reference/stream', async (req: Request, res: Response) => {
    const ref = req.params.reference;
    const record = paymentStore.get(ref);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Payment reference not found.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let clients = sseClients.get(ref);
    if (!clients) {
      clients = new Set();
      sseClients.set(ref, clients);
    }
    clients.add(res);

    // Send immediate current server-verified snapshot
    res.write(
      `event: status\ndata: ${JSON.stringify({
        reference: record.reference,
        gatewayReference: record.gatewayReference,
        status: record.status,
        amount: record.amount,
        phone: record.phone,
        receiptCode: record.receiptCode,
        message: record.message,
        completedAt: record.completedAt,
        serverVerifiedAt: record.serverVerifiedAt,
      })}\n\n`
    );

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      clients?.delete(res);
      if (clients && clients.size === 0) {
        sseClients.delete(ref);
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LendPlus server running on http://localhost:${PORT}`);
  });
}

startServer();
