import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function normalizeStatus(rawStatus: unknown): 'pending' | 'success' | 'cancelled' | 'failed' | 'expired' {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  if (rawStatus === 'failed') return 'failed';
  return 'pending';
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method !== 'GET') {
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

  const rawRef = req.query?.reference;
  const reference = Array.isArray(rawRef) ? rawRef[0] : rawRef || '';
  if (!reference) {
    return sendJson(res, 400, { success: false, error: 'Payment reference is required.' });
  }

  try {
    const response = await fetch(`${GATEWAY_API_URL}/payments/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GATEWAY_SECRET_KEY}`,
        ...(GATEWAY_PUBLIC_KEY ? { 'X-Public-Key': GATEWAY_PUBLIC_KEY } : {}),
        Accept: 'application/json',
      },
    });

    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
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
    } | null;

    if (!response.ok || !body?.success || !body.data) {
      return sendJson(res, response.status >= 400 ? response.status : 404, {
        success: false,
        error: body?.error || 'Payment reference not found.',
      });
    }

    return sendJson(res, 200, {
      success: true,
      data: {
        reference: body.data.external_reference || reference,
        gatewayReference: body.data.reference || null,
        status: normalizeStatus(body.data.status),
        amount: body.data.amount || 0,
        phone: body.data.phone || '',
        receiptCode: body.data.receipt_code || null,
        message: body.data.message || null,
        completedAt: body.data.completed_at || null,
        serverVerifiedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[HarakaPay Vercel verify error]', err);
    return sendJson(res, 502, {
      success: false,
      error: 'Could not verify payment status with HarakaPay.',
    });
  }
}
