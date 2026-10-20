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
  return {
    async prepare(hash, phone, fingerprint) {
      const { data, error } = await db.rpc('prepare_guest_payment', { p_guest_token_hash: hash, p_phone: phone, p_request_fingerprint: fingerprint });
      if (error || !data) throw new Error('PAYMENT_NOT_ALLOWED');
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
      const { error } = await db.from('payment_events').upsert({ order_id: attempt.order_id, attempt_id: attempt.id,
        provider: 'przelewy24', provider_event_id: String(notification.orderId), event_type: 'payment_notification', status: 'received',
        payload: notification as unknown as Json }, { onConflict: 'provider,provider_event_id', ignoreDuplicates: true });
      if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
      const result = await db.from('payment_events').select('attempt_id,status,payload').eq('provider','przelewy24').eq('provider_event_id',String(notification.orderId)).single();
      if (result.error || !result.data) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
      return result.data as StoredPaymentEvent;
    },
    async complete(attemptId, providerOrderId) {
      const { error } = await db.rpc('complete_verified_payment', { p_attempt_id: attemptId, p_provider_order_id: providerOrderId });
      if (error) throw new Error('PAYMENT_DATABASE_UNAVAILABLE');
    },
  };
}
