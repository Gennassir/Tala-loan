import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

function normalizeStatus(rawStatus: unknown): 'pending' | 'success' | 'cancelled' | 'failed' | 'expired' {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  if (rawStatus === 'failed') return 'failed';
  return 'pending';
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  const GATEWAY_API_URL = (process.env.GATEWAY_API_URL || 'https://harakapaye.co.ke/api/v1').replace(/\/+$/, '');
  const GATEWAY_PUBLIC_KEY = process.env.GATEWAY_PUBLIC_KEY || '';
  const GATEWAY_SECRET_KEY = process.env.GATEWAY_SECRET_KEY || '';

  const rawRef = req.query?.reference;
  const reference = Array.isArray(rawRef) ? rawRef[0] : rawRef || '';

  if (!reference || !GATEWAY_SECRET_KEY) {
    res.statusCode = 400;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const checkOnce = async () => {
    const response = await fetch(`${GATEWAY_API_URL}/payments/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GATEWAY_SECRET_KEY}`,
        ...(GATEWAY_PUBLIC_KEY ? { 'X-Public-Key': GATEWAY_PUBLIC_KEY } : {}),
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
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
    if (!body?.success || !body.data) return null;
    return {
      reference: body.data.external_reference || reference,
      gatewayReference: body.data.reference || null,
      status: normalizeStatus(body.data.status),
      amount: body.data.amount || 0,
      phone: body.data.phone || '',
      receiptCode: body.data.receipt_code || null,
      message: body.data.message || null,
      completedAt: body.data.completed_at || null,
      serverVerifiedAt: new Date().toISOString(),
    };
  };

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  const startedAt = Date.now();
  while (!closed && Date.now() - startedAt < 50_000) {
    try {
      const snapshot = await checkOnce();
      if (snapshot) {
        res.write(`event: status\ndata: ${JSON.stringify(snapshot)}\n\n`);
        if (snapshot.status !== 'pending') {
          break;
        }
      }
    } catch {
      // retry next tick
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  if (!closed) {
    res.end();
  }
}
