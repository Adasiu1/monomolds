import { timingSafeEqual } from 'node:crypto';
import { reconcilePaymentEvents } from '@/lib/payments/guest-payment';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.PAYMENT_RECONCILIATION_SECRET;
  const provided = request.headers.get('authorization') ?? '';
  if (!expected || provided.length > 512 || Buffer.byteLength(provided) !== Buffer.byteLength(`Bearer ${expected}`)
    || !timingSafeEqual(Buffer.from(provided), Buffer.from(`Bearer ${expected}`))) return new Response('Unauthorized', { status: 401 });
  try { return Response.json(await reconcilePaymentEvents()); }
  catch { return new Response('Reconciliation unavailable', { status: 503 }); }
}
