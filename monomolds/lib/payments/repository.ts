import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import type { PaymentAttempt, PaymentStore, StoredPaymentEvent } from './service';

export function paymentDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
  return createClient<Database>(url.replace(/\/rest\/v1\/?$/, ''), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createPaymentStore(): PaymentStore {
  const db = paymentDatabase();
  async function recordEvent(attempt: PaymentAttempt, providerOrderId: number, eventType: string, payload: Json) {
    const { error } = await db.from('payment_events').upsert({ order_id: attempt.order_id, attempt_id: attempt.id,
      provider: 'przelewy24', provider_event_id: String(providerOrderId), event_type: eventType, status: 'received', payload },
      { onConflict: 'provider,provider_event_id', ignoreDuplicates: true });
    if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
    const result = await db.from('payment_events').select('attempt_id,status,payload').eq('provider','przelewy24').eq('provider_event_id',String(providerOrderId)).single();
    if (result.error || !result.data) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
    return result.data as StoredPaymentEvent;
  }
  return {
    async prepare(hash, phone, fingerprint) {
      const { data, error } = await db.rpc('prepare_guest_payment', { p_guest_token_hash: hash, p_phone: phone, p_request_fingerprint: fingerprint });
      if (error) {
        if (error.message.includes('RATE_LIMITED')) throw new Error('RATE_LIMITED');
        if (error.message.includes('PAYMENT_PENDING')) throw new Error('PAYMENT_PENDING');
        throw new Error('PAYMENT_NOT_ALLOWED');
      }
      if (!data) throw new Error('PAYMENT_NOT_ALLOWED');
      return data as unknown as { attempt: PaymentAttempt; fresh: boolean; email: string; orderNumber: string };
    },
    async saveToken(id, token) {
      const { data, error } = await db.from('payment_attempts').update({ provider_token: token, status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', id).eq('status', 'created').select('id');
      if (error || !data?.length) throw new Error('PAYMENT_STATE_CHANGED');
    },
    async endAttempt(id, status) {
      const { error } = await db.from('payment_attempts').update({ status, updated_at: new Date().toISOString() })
        .eq('id', id).in('status', ['created','pending']);
      if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
    },
    async findAttempt(sessionId) {
      const { data, error } = await db.from('payment_attempts').select('*').eq('session_id', sessionId).maybeSingle();
      if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
      return data as PaymentAttempt | null;
    },
    async recordNotification(attempt, notification) {
      return recordEvent(attempt, notification.orderId, 'payment_notification', notification as unknown as Json);
    },
    async recordRecovery(attempt, transaction) {
      return recordEvent(attempt, transaction.orderId, 'payment_recovery', {
        sessionId: transaction.sessionId, orderId: transaction.orderId, amount: transaction.amount,
        currency: transaction.currency, providerStatus: transaction.status, source: 'authenticated_provider_api',
      });
    },
    async complete(attemptId, providerOrderId) {
      const { error } = await db.rpc('complete_verified_payment', { p_attempt_id: attemptId, p_provider_order_id: providerOrderId });
      if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
    },
  };
}
