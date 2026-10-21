import { createPaymentStore } from '@/lib/payments/repository';
import { createPaymentService } from '@/lib/payments/service';
import { paymentConfig, PaymentProviderError } from '@/lib/payments/przelewy24';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length')) > 8192) return new Response('Invalid notification', { status: 413 });
    const body = await request.text();
    if (body.length > 8192) return new Response('Invalid notification', { status: 413 });
    let notification: unknown;
    try { notification = JSON.parse(body); } catch { return new Response('Invalid notification', { status: 400 }); }
    await createPaymentService(createPaymentStore(), paymentConfig()).notify(notification);
    return new Response('OK', { status: 200 });
  } catch (error) {
    const code = error instanceof PaymentProviderError ? error.code : 'PAYMENT_PROCESSING_FAILED';
    console.error('Payment notification rejected.', { code });
    return new Response('Notification not processed', { status: ['INVALID_NOTIFICATION','INVALID_SIGNATURE','PAYMENT_MISMATCH'].includes(code) ? 400 : 503 });
  }
}
