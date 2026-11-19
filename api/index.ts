import 'dotenv/config';
import crypto from 'node:crypto';
import express, { Request, Response } from 'express';
import { LOAN_PACKAGES } from '../src/data/loanPackages';

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

function normalizeGatewayStatus(rawStatus: unknown): PaymentStatus {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  if (rawStatus === 'failed') return 'failed';
  return 'pending';
}

async function verifyPaymentWithGateway(reference: string): Promise<ServerPaymentRecord | null> {
  let record = paymentStore.get(reference) || null;
  if (record && record.status !== 'pending') {
    return record;
  }

  const lookupRef = record?.gatewayReference || reference;

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
          phone?: string;
          receipt_code?: string | null;
          message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };

      if (body.success && body.data) {
        const nextStatus = normalizeGatewayStatus(body.data.status);
        if (!record) {
          record = {
            reference: body.data.external_reference || reference,
            gatewayReference: body.data.reference || null,
            checkoutRequestId: null,
            packageId: '',
            purpose: 'application_fee',
            amount: body.data.amount || 0,
            phone: body.data.phone || '',
            fullName: '',
            nationalId: '',
            status: nextStatus,
            receiptCode: body.data.receipt_code || null,
            message: body.data.message || null,
            createdAt: body.data.created_at || new Date().toISOString(),
            completedAt: body.data.completed_at || null,
            serverVerifiedAt: new Date().toISOString(),
          };
          paymentStore.set(record.reference, record);
        } else {
          record.gatewayReference = body.data.reference || record.gatewayReference;
          record.receiptCode = body.data.receipt_code ?? record.receiptCode;
          record.message = body.data.message ?? record.message;
          record.completedAt = body.data.completed_at ?? record.completedAt;
          record.serverVerifiedAt = new Date().toISOString();
          record.status = nextStatus;
        }
        if (record.gatewayReference) {
          gatewayRefIndex.set(record.gatewayReference, record.reference);
        }
      }
    }
  } catch (err) {
    console.error(`[HarakaPay verify error for ${reference}]`, err);
  }

  if (record && record.status === 'pending') {
    const elapsedMs = Date.now() - new Date(record.createdAt).getTime();
    if (Number.isFinite(elapsedMs) && elapsedMs >= STK_TIMEOUT_MS) {
      record.status = 'expired';
      record.message = 'Timed out waiting for M-Pesa PIN confirmation.';
      record.serverVerifiedAt = new Date().toISOString();
    }
  }

  return record;
}

const app = express();

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
          amount?: number;
          phone?: string;
          receipt_code?: string | null;
          message?: string | null;
          completed_at?: string | null;
        };
      };

      const extRef = event.data?.external_reference;
      const gwRef = event.data?.reference;
      const localRef =
        (extRef && paymentStore.has(extRef) ? extRef : undefined) ||
        (gwRef ? gatewayRefIndex.get(gwRef) : undefined) ||
        extRef;

      if (localRef) {
        const existing = paymentStore.get(localRef);
        const nextStatus =
          event.event === 'payment.success'
            ? 'success'
            : normalizeGatewayStatus(event.data?.status);

        if (existing) {
          if (existing.status === 'pending') {
            existing.status = nextStatus;
            existing.receiptCode = event.data?.receipt_code ?? existing.receiptCode;
            existing.message = event.data?.message ?? existing.message;
            existing.completedAt = event.data?.completed_at ?? new Date().toISOString();
            existing.serverVerifiedAt = new Date().toISOString();
          }
        } else {
          paymentStore.set(localRef, {
            reference: localRef,
            gatewayReference: gwRef || null,
            checkoutRequestId: null,
            packageId: '',
            purpose: 'application_fee',
            amount: event.data?.amount || 0,
            phone: event.data?.phone || '',
            fullName: '',
            nationalId: '',
            status: nextStatus,
            receiptCode: event.data?.receipt_code || null,
            message: event.data?.message || null,
            createdAt: new Date().toISOString(),
            completedAt: event.data?.completed_at || new Date().toISOString(),
            serverVerifiedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      return res.sendStatus(400);
    }

    return res.sendStatus(200);
  }
);

app.use(express.json());

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
  const authoritativeAmount = paymentPurpose === 'repayment' ? pkg.totalRepayable : pkg.fee;

  const reference = `LP-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

  const description =
    paymentPurpose === 'repayment'
      ? `LendPlus Repay ${pkg.amount}`
      : `LendPlus Fee ${pkg.amount}`;

  const origin = req.headers.host ? `https://${req.headers.host}` : APP_URL;
  const payload: Record<string, unknown> = {
    phone: normalizedPhone,
    amount: authoritativeAmount,
    reference,
    description: description.slice(0, 60),
  };

  if (origin.startsWith('https://')) {
    payload.callback_url = `${origin}/api/payments/webhook`;
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
      message?: string;
      error?: string;
      data?: {
        reference?: string;
        status?: string;
        phone?: string;
        checkout_request_id?: string | null;
        receipt_code?: string | null;
        message?: string | null;
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
    console.error('[HarakaPay STK push error]', err);
    return res.status(502).json({
      success: false,
      error: 'Could not reach the M-Pesa payment gateway. Please retry shortly.',
    });
  }
});

app.get('/api/payments/:reference', async (req: Request, res: Response) => {
  const record = await verifyPaymentWithGateway(req.params.reference);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Payment reference not found.' });
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

app.get('/api/payments/:reference/stream', async (req: Request, res: Response) => {
  const record = await verifyPaymentWithGateway(req.params.reference);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Payment reference not found.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

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

  if (record.status !== 'pending') {
    return res.end();
  }

  const poller = setInterval(async () => {
    const latest = await verifyPaymentWithGateway(req.params.reference);
    if (!latest) return;
    res.write(
      `event: status\ndata: ${JSON.stringify({
        reference: latest.reference,
        gatewayReference: latest.gatewayReference,
        status: latest.status,
        amount: latest.amount,
        phone: latest.phone,
        receiptCode: latest.receiptCode,
        message: latest.message,
        completedAt: latest.completedAt,
        serverVerifiedAt: latest.serverVerifiedAt,
      })}\n\n`
    );
    if (latest.status !== 'pending') {
      clearInterval(poller);
      res.end();
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(poller);
  });
});

export default app;
