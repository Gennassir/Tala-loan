import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const PACKAGE_PRICES: Record<string, { amount: number; fee: number; totalRepayable: number }> = {
  'pkg-10000': { amount: 10000, fee: 99, totalRepayable: 10099 },
  'pkg-12500': { amount: 12500, fee: 129, totalRepayable: 12629 },
  'pkg-16000': { amount: 16000, fee: 179, totalRepayable: 16179 },
  'pkg-21000': { amount: 21000, fee: 199, totalRepayable: 21199 },
  'pkg-25500': { amount: 25500, fee: 220, totalRepayable: 25720 },
  'pkg-30000': { amount: 30000, fee: 349, totalRepayable: 30349 },
  'pkg-35000': { amount: 35000, fee: 419, totalRepayable: 35419 },
  'pkg-40000': { amount: 40000, fee: 539, totalRepayable: 40539 },
  'pkg-45000': { amount: 45000, fee: 679, totalRepayable: 45679 },
  'pkg-50000': { amount: 50000, fee: 499, totalRepayable: 50499 },
  'pkg-60000': { amount: 60000, fee: 1649, totalRepayable: 61649 },
  'pkg-70000': { amount: 70000, fee: 1999, totalRepayable: 71999 },
};

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

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

async function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
  }

  const GATEWAY_API_URL = (process.env.GATEWAY_API_URL || 'https://harakapaye.co.ke/api/v1').replace(/\/+$/, '');
  const GATEWAY_PUBLIC_KEY = process.env.GATEWAY_PUBLIC_KEY || '';
  const GATEWAY_SECRET_KEY = process.env.GATEWAY_SECRET_KEY || '';

  if (!GATEWAY_SECRET_KEY) {
    return sendJson(res, 500, {
      success: false,
      error: 'GATEWAY_SECRET_KEY is not configured in server environment variables.',
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { success: false, error: 'Invalid JSON request body.' });
  }

  const packageId = typeof body.packageId === 'string' ? body.packageId : '';
  const purpose = body.purpose === 'repayment' ? 'repayment' : 'application_fee';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  const pkg = PACKAGE_PRICES[packageId];
  if (!pkg) {
    return sendJson(res, 422, { success: false, error: 'Selected loan package was not found.' });
  }
  if (fullName.length < 3) {
    return sendJson(res, 422, { success: false, error: 'Applicant full name is required.' });
  }
  if (!/^\d{7,9}$/.test(nationalId)) {
    return sendJson(res, 422, {
      success: false,
      error: 'A valid 7 to 9 digit National ID number is required.',
    });
  }
  const normalizedPhone = normalizeKenyanPhone(phone);
  if (!normalizedPhone) {
    return sendJson(res, 422, {
      success: false,
      error: 'Invalid M-Pesa phone number. Use 07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX.',
    });
  }

  const authoritativeAmount = purpose === 'repayment' ? pkg.totalRepayable : pkg.fee;
  const reference = `LP-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

  const description =
    purpose === 'repayment'
      ? `LendPlus Repay ${pkg.amount}`
      : `LendPlus Fee ${pkg.amount}`;

  const host = req.headers.host;
  const payload: Record<string, unknown> = {
    phone: normalizedPhone,
    amount: authoritativeAmount,
    reference,
    description: description.slice(0, 60),
  };

  if (host && !host.includes('localhost')) {
    payload.callback_url = `https://${host}/api/payments/webhook`;
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
      };
    } | null;

    if (!gwResponse.ok || !gwBody?.success || !gwBody.data) {
      return sendJson(res, gwResponse.status >= 400 ? gwResponse.status : 502, {
        success: false,
        error:
          gwBody?.error ||
          gwBody?.message ||
          'Unable to send M-Pesa STK push request. Please try again.',
      });
    }

    return sendJson(res, 201, {
      success: true,
      message:
        gwBody.message ||
        'An STK push has been sent to your phone. Enter PIN to complete transaction.',
      data: {
        reference,
        gatewayReference: gwBody.data.reference || null,
        status: gwBody.data.status || 'pending',
        amount: authoritativeAmount,
        phone: gwBody.data.phone || normalizedPhone,
        purpose,
        timeoutSeconds: 120,
        serverVerifiedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[HarakaPay Vercel STK push error]', err);
    return sendJson(res, 502, {
      success: false,
      error: 'Could not reach the HarakaPay M-Pesa gateway. Please retry shortly.',
    });
  }
}
