import 'server-only';
import { cookies } from 'next/headers';
import { isGuestOrderToken, isGuestPhone, normalizeGuestPhone } from '@/features/order-status/order-status';
import { paymentConfig } from './przelewy24';
import { createPaymentStore, paymentDatabase } from './repository';
import { createPaymentService, type StartPaymentResult } from './service';

export async function beginGuestPayment(token: string, phone: string, fingerprint: string): Promise<StartPaymentResult> {
  if (!isGuestOrderToken(token) || !isGuestPhone(phone)) return { ok: false, code: 'PAYMENT_NOT_ALLOWED', message: 'Nie udało się potwierdzić danych zamówienia.' };
  try {
    const config = paymentConfig();
    const result = await createPaymentService(createPaymentStore(), config).start(token, normalizeGuestPhone(phone), fingerprint);
    if (result.ok) {
      (await cookies()).set(`p24_guest_${result.attemptId}`, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/payments/przelewy24/return', maxAge: 86400 });
    }
    return result;
  } catch {
    return { ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'Płatności są chwilowo niedostępne. Zamówienie jest zapisane. Spróbuj ponownie później.' };
  }
}

export async function reconcilePaymentEvents(orderId?: string) {
  const db = paymentDatabase();
  let query = db.from('payment_events').select('id,payload').eq('provider','przelewy24').eq('status','received').order('created_at').limit(orderId ? 1 : 20);
  if (orderId) query = query.eq('order_id', orderId);
  const { data, error } = await query;
  if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
  const service = createPaymentService(createPaymentStore(), paymentConfig());
  let completed = 0;
  for (const event of data ?? []) {
    try { await service.notify(event.payload); completed++; }
    catch { console.error('Payment reconciliation deferred.', { eventId: event.id }); }
  }
  return { checked: data?.length ?? 0, completed };
}
