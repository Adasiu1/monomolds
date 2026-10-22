import { createHash, timingSafeEqual } from 'node:crypto';

export type P24Config = { merchantId: number; posId: number; apiKey: string; crcKey: string; baseUrl: string; appBaseUrl: string };
export type PaymentNotification = {
  merchantId: number; posId: number; sessionId: string; amount: number; originAmount: number;
  currency: string; orderId: number; methodId: number; statement: string; sign: string;
};
export type ProviderTransaction = { sessionId: string; orderId: number; amount: number; currency: string; status: number };

export class PaymentProviderError extends Error {
  constructor(public readonly code: string, public readonly ambiguous = false) { super(code); }
}

export function paymentConfig(env: NodeJS.ProcessEnv = process.env): P24Config {
  if (env.P24_ENV !== 'sandbox') throw new PaymentProviderError('PAYMENT_CONFIGURATION_MISSING');
  const merchantId = Number(env.P24_MERCHANT_ID), posId = Number(env.P24_POS_ID);
  if (!Number.isSafeInteger(merchantId) || merchantId < 1 || !Number.isSafeInteger(posId) || posId < 1 || !env.P24_API_KEY || !env.P24_CRC_KEY || !env.APP_BASE_URL) {
    throw new PaymentProviderError('PAYMENT_CONFIGURATION_MISSING');
  }
  const app = new URL(env.APP_BASE_URL);
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash || app.pathname !== '/') throw new PaymentProviderError('PAYMENT_CONFIGURATION_MISSING');
  return { merchantId, posId, apiKey: env.P24_API_KEY, crcKey: env.P24_CRC_KEY,
    baseUrl: 'https://sandbox.przelewy24.pl', appBaseUrl: app.origin };
}

export function checksum(value: Record<string, unknown>) {
  return createHash('sha384').update(JSON.stringify(value)).digest('hex');
}

export function parseNotification(value: unknown): PaymentNotification {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PaymentProviderError('INVALID_NOTIFICATION');
  const v = value as Record<string, unknown>;
  for (const key of ['merchantId','posId','amount','originAmount','orderId','methodId']) {
    if (typeof v[key] !== 'number' || !Number.isSafeInteger(v[key]) || (v[key] as number) < (key === 'methodId' ? 0 : 1)) throw new PaymentProviderError('INVALID_NOTIFICATION');
  }
  if (typeof v.sessionId !== 'string' || !/^[0-9a-f-]{36}$/.test(v.sessionId) || v.currency !== 'PLN'
    || typeof v.statement !== 'string' || v.statement.length > 1024 || typeof v.sign !== 'string' || !/^[a-f0-9]{96}$/i.test(v.sign)) throw new PaymentProviderError('INVALID_NOTIFICATION');
  return { merchantId: v.merchantId, posId: v.posId, sessionId: v.sessionId, amount: v.amount,
    originAmount: v.originAmount, currency: v.currency, orderId: v.orderId, methodId: v.methodId,
    statement: v.statement, sign: v.sign } as PaymentNotification;
}

export function validNotificationSign(n: PaymentNotification, config: P24Config) {
  const expected = checksum({ merchantId: n.merchantId, posId: n.posId, sessionId: n.sessionId,
    amount: n.amount, originAmount: n.originAmount, currency: n.currency, orderId: n.orderId,
    methodId: n.methodId, statement: n.statement, crc: config.crcKey });
  return n.merchantId === config.merchantId && n.posId === config.posId
    && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(n.sign, 'hex'));
}

export function createP24Client(config: P24Config, fetcher: typeof fetch = fetch) {
  async function request(path: string, method = 'GET', body?: unknown) {
    let response: Response;
    try {
      response = await fetcher(`${config.baseUrl}/api/v1/${path}`, { method, cache: 'no-store',
        headers: { Authorization: `Basic ${Buffer.from(`${config.posId}:${config.apiKey}`).toString('base64')}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
    } catch { throw new PaymentProviderError('PROVIDER_UNAVAILABLE', true); }
    if (response.status === 404 && method === 'GET') return null;
    if (response.status === 429) throw new PaymentProviderError('PROVIDER_RATE_LIMITED');
    if (!response.ok) throw new PaymentProviderError('PROVIDER_REJECTED', response.status >= 500 || response.status === 408);
    try { return await response.json() as { data?: unknown }; }
    catch { throw new PaymentProviderError('PROVIDER_RESPONSE_INVALID', true); }
  }
  return {
    async testAccess() {
      const result = await request('testAccess');
      if (result?.data !== true) throw new PaymentProviderError('PROVIDER_ACCESS_DENIED');
    },
    async register(attempt: { session_id: string; amount: number; currency: string; id: string }, email: string, orderNumber: string) {
      const sign = checksum({ sessionId: attempt.session_id, merchantId: config.merchantId, amount: attempt.amount, currency: attempt.currency, crc: config.crcKey });
      const result = await request('transaction/register', 'POST', { merchantId: config.merchantId, posId: config.posId,
        sessionId: attempt.session_id, amount: attempt.amount, currency: attempt.currency, description: `Zamówienie ${orderNumber}`,
        email, country: 'PL', language: 'pl', timeLimit: 15, regulationAccept: false,
        urlReturn: `${config.appBaseUrl}/api/payments/przelewy24/return?attempt=${attempt.id}`,
        urlStatus: `${config.appBaseUrl}/api/payments/przelewy24/notify`, sign });
      const token = (result?.data as { token?: unknown } | undefined)?.token;
      if (typeof token !== 'string' || token.length === 0 || token.length > 512) throw new PaymentProviderError('PROVIDER_RESPONSE_INVALID', true);
      return token;
    },
    async lookup(sessionId: string): Promise<ProviderTransaction | null> {
      const result = await request(`transaction/by/sessionId/${encodeURIComponent(sessionId)}`);
      if (result === null) return null;
      const data = result.data as ProviderTransaction | undefined;
      if (!data || data.sessionId !== sessionId || !Number.isSafeInteger(data.orderId) || !Number.isSafeInteger(data.amount)
        || data.currency !== 'PLN' || ![0,1,2,3].includes(data.status)) throw new PaymentProviderError('PROVIDER_RESPONSE_INVALID', true);
      return { sessionId: data.sessionId, orderId: data.orderId, amount: data.amount, currency: data.currency, status: data.status };
    },
    async verify(n: Pick<PaymentNotification, 'sessionId'|'orderId'|'amount'|'currency'>) {
      const result = await request('transaction/verify', 'PUT', { merchantId: config.merchantId, posId: config.posId,
        sessionId: n.sessionId, orderId: n.orderId, amount: n.amount, currency: n.currency,
        sign: checksum({ sessionId: n.sessionId, orderId: n.orderId, amount: n.amount, currency: n.currency, crc: config.crcKey }) });
      if ((result?.data as { status?: string } | undefined)?.status !== 'success') throw new PaymentProviderError('PROVIDER_VERIFY_FAILED', true);
    },
    redirectUrl(token: string) { return `${config.baseUrl}/trnRequest/${encodeURIComponent(token)}`; },
  };
}
