import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  const GATEWAY_SIGNING_SECRET = process.env.GATEWAY_SIGNING_SECRET || '';
  if (!GATEWAY_SIGNING_SECRET) {
    res.statusCode = 500;
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');

  const tsHeader = req.headers['x-gateway-timestamp'];
  const sigHeader = req.headers['x-gateway-signature'];
  const ts = Array.isArray(tsHeader) ? tsHeader[0] : tsHeader || '';
  const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader || '';

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
    res.statusCode = 401;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.end();
}
