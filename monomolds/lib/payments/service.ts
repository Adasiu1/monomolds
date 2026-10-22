import { createHash } from 'node:crypto';
import { createP24Client, parseNotification, PaymentProviderError, validNotificationSign, type P24Config, type ProviderTransaction, type PaymentNotification } from './przelewy24';

export type PaymentAttempt = {
  id: string; order_id: string; session_id: string; status: 'created'|'pending'|'paid'|'failed'|'cancelled'|'expired';
  amount: number; currency: 'PLN'; provider_token: string | null; provider_order_id: number | null;
  created_at: string; expires_at: string;
};
export type StoredPaymentEvent = { attempt_id: string; status: string; payload: unknown };
export type PaymentStore = {
  prepare(hash: string, phone: string, fingerprint: string): Promise<{ attempt: PaymentAttempt; fresh: boolean; email: string; orderNumber: string }>;
  saveToken(id: string, token: string): Promise<void>;
  endAttempt(id: string, status: 'failed'|'expired'): Promise<void>;
  findAttempt(sessionId: string): Promise<PaymentAttempt | null>;
  recordNotification(attempt: PaymentAttempt, notification: PaymentNotification): Promise<StoredPaymentEvent>;
  recordRecovery(attempt: PaymentAttempt, transaction: ProviderTransaction): Promise<StoredPaymentEvent>;
  complete(attemptId: string, providerOrderId: number): Promise<void>;
};
export type StartPaymentResult = { ok: true; attemptId: string; expiresAt: string; redirectUrl: string }
  | { ok: false; code: 'PAYMENT_UNAVAILABLE'|'PAYMENT_PENDING'|'PAYMENT_RATE_LIMITED'|'PAYMENT_NOT_ALLOWED'; message: string };
export const hashGuestToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createPaymentService(store: PaymentStore, config: P24Config, fetcher: typeof fetch = fetch, now = () => Date.now()) {
  const provider = createP24Client(config, fetcher);
  async function verifyAndComplete(attempt: PaymentAttempt, confirmation: Pick<PaymentNotification, 'sessionId'|'orderId'|'amount'|'currency'>) {
    try { await provider.verify(confirmation); }
    catch (error) {
      const transaction = await provider.lookup(confirmation.sessionId);
      if (!transaction || transaction.status !== 2 || transaction.orderId !== confirmation.orderId
        || transaction.amount !== attempt.amount || transaction.currency !== attempt.currency) throw error;
    }
    await store.complete(attempt.id, confirmation.orderId);
  }
  return {
    async recover(sessionId: string) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)) throw new PaymentProviderError('INVALID_SESSION');
      const attempt = await store.findAttempt(sessionId);
      if (!attempt || attempt.session_id !== sessionId) throw new PaymentProviderError('PAYMENT_MISMATCH');
      const transaction = await provider.lookup(sessionId);
      if (!transaction || transaction.status === 0) return { status: 'unpaid' as const };
      if (![1,2].includes(transaction.status) || transaction.amount !== attempt.amount || transaction.currency !== attempt.currency
        || transaction.sessionId !== attempt.session_id || transaction.orderId < 1
        || (attempt.provider_order_id !== null && attempt.provider_order_id !== transaction.orderId)) throw new PaymentProviderError('PAYMENT_MISMATCH');
      const event = await store.recordRecovery(attempt, transaction);
      if (event.attempt_id !== attempt.id) throw new PaymentProviderError('PAYMENT_MISMATCH');
      if (event.status === 'verified' || event.status === 'review_required') return { status: 'already_processed' as const };
      // Recovery uses authenticated provider data, never a fabricated webhook signature.
      await verifyAndComplete(attempt, transaction);
      return { status: 'processed' as const };
    },
    async start(
      token: string,
      phone: string,
      fingerprint: string,
      options: { returnedFromProvider?: boolean } = {},
    ): Promise<StartPaymentResult> {
      let prepared;
      try { prepared = await store.prepare(hashGuestToken(token), phone, fingerprint); }
      catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "PAYMENT_PENDING") {
          return { ok: false, code: "PAYMENT_PENDING", message: "Poprzednia próba płatności jest jeszcze sprawdzana. Odśwież status za chwilę." };
        }
        if (code === "RATE_LIMITED") {
          return { ok: false, code: "PAYMENT_RATE_LIMITED", message: "Wykonano zbyt wiele prób płatności. Odczekaj chwilę i spróbuj ponownie." };
        }
        return { ok: false, code: 'PAYMENT_NOT_ALLOWED', message: 'Nie można rozpocząć płatności. Sprawdź dane i odśwież status zamówienia.' };
      }
      const { attempt, fresh, email, orderNumber } = prepared;
      try {
        if (fresh) {
          let providerToken: string;
          try { providerToken = await provider.register(attempt, email, orderNumber); }
          catch (error) {
            if (error instanceof PaymentProviderError && !error.ambiguous) await store.endAttempt(attempt.id, 'failed');
            throw error;
          }
          await store.saveToken(attempt.id, providerToken);
          return { ok: true, attemptId: attempt.id, expiresAt: attempt.expires_at, redirectUrl: provider.redirectUrl(providerToken) };
        }
        if (!options.returnedFromProvider && attempt.provider_token && now() < Date.parse(attempt.expires_at)) {
          return { ok: true, attemptId: attempt.id, expiresAt: attempt.expires_at, redirectUrl: provider.redirectUrl(attempt.provider_token) };
        }
        // Never open a second payment while the first may still accept money.
        const transaction = await provider.lookup(attempt.session_id);
        if (transaction && (transaction.amount !== attempt.amount || transaction.currency !== attempt.currency)) throw new PaymentProviderError('PAYMENT_MISMATCH');
        if (options.returnedFromProvider && transaction?.status === 3) {
          return {
            ok: false,
            code: 'PAYMENT_PENDING',
            message: 'Operator zwrócił płatność. Skontaktuj się z nami, aby sprawdzić zwrot.',
          };
        }
        if (options.returnedFromProvider && transaction?.status === 2) {
          return {
            ok: false,
            code: 'PAYMENT_PENDING',
            message: 'Operator potwierdził płatność - aktualizujemy status zamówienia',
          };
        }
        if (options.returnedFromProvider && transaction?.status === 1) {
          return {
            ok: false,
            code: 'PAYMENT_PENDING',
            message: 'Płatność jest nadal przetwarzana przez operatora. Poczekaj na aktualizację statusu.',
          };
        }
        if (now() >= Date.parse(attempt.expires_at) + 120000 && (!transaction || transaction.status === 0)) {
          await store.endAttempt(attempt.id, 'expired');
          return { ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'Poprzednia próba wygasła. Możesz teraz ponowić płatność.' };
        }
        if (options.returnedFromProvider && (!transaction || transaction.status === 0)) {
          return {
            ok: false,
            code: 'PAYMENT_PENDING',
            message: 'Ta próba płatności nie została zakończona, sprawdź jej status na stronie pośrednika.',
          };
        }
        return { ok: false, code: 'PAYMENT_PENDING', message: 'Sprawdzamy poprzednią próbę płatności. Odśwież status za chwilę.' };
      } catch (error) {
        const errorCode = error instanceof PaymentProviderError ? error.code : 'PAYMENT_STORAGE_FAILED';
        console.error('Payment start failed.', { attemptId: attempt.id, code: errorCode });
        if (errorCode === "PROVIDER_RATE_LIMITED") {
          return { ok: false, code: "PAYMENT_RATE_LIMITED", message: "Operator płatności ograniczył liczbę prób. Odczekaj chwilę i spróbuj ponownie." };
        }
        return { ok: false, code: 'PAYMENT_UNAVAILABLE', message: 'Nie udało się połączyć z płatnościami. Zamówienie jest zapisane. Spróbuj ponownie za chwilę.' };
      }
    },
    async notify(value: unknown) {
      const notification = parseNotification(value);
      if (!validNotificationSign(notification, config)) throw new PaymentProviderError('INVALID_SIGNATURE');
      const attempt = await store.findAttempt(notification.sessionId);
      if (!attempt || attempt.amount !== notification.amount || attempt.amount !== notification.originAmount || attempt.currency !== notification.currency
        || (attempt.provider_order_id !== null && attempt.provider_order_id !== notification.orderId)) throw new PaymentProviderError('PAYMENT_MISMATCH');
      const event = await store.recordNotification(attempt, notification);
      if (event.attempt_id !== attempt.id) throw new PaymentProviderError('PAYMENT_MISMATCH');
      if (event.status === 'verified' || event.status === 'review_required') return;
      // Save before verifying: P24 can stop notifications once verification succeeds.
      await verifyAndComplete(attempt, notification);
    },
  };
}
