import { timingSafeEqual } from 'node:crypto';
import { reconcilePaymentEvents } from '@/lib/payments/guest-payment';
import { createPaymentStore } from '@/lib/payments/repository';
import { createPaymentService } from '@/lib/payments/service';
import { paymentConfig, PaymentProviderError } from '@/lib/payments/przelewy24';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.PAYMENT_RECONCILIATION_SECRET;
  const provided = request.headers.get('authorization') ?? '';
  if (!expected || provided.length > 512 || Buffer.byteLength(provided) !== Buffer.byteLength(`Bearer ${expected}`)
    || !timingSafeEqual(Buffer.from(provided), Buffer.from(`Bearer ${expected}`))) return new Response('Unauthorized', { status: 401 });
  try {
    const body = await request.text();
    if (body.length > 256) return new Response('Invalid request', { status: 413 });
    if (!body) return Response.json(await reconcilePaymentEvents());
    let input: unknown;
    try { input = JSON.parse(body); } catch { return new Response('Invalid request', { status: 400 }); }
    if (!input || typeof input !== 'object' || !('sessionId' in input) || typeof input.sessionId !== 'string') return new Response('Invalid request', { status: 400 });
    return Response.json(await createPaymentService(createPaymentStore(), paymentConfig()).recover(input.sessionId));
  } catch (error) {
    const code = error instanceof PaymentProviderError ? error.code : 'RECONCILIATION_UNAVAILABLE';
    const status = code === 'INVALID_SESSION' ? 400 : code === 'PAYMENT_MISMATCH' ? 409 : 503;
    return Response.json({ error: code }, { status });
  }
}
