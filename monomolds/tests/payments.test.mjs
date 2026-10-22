import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checksum, createP24Client, paymentConfig, parseNotification, validNotificationSign } from '../lib/payments/przelewy24.ts';
import { createPaymentService } from '../lib/payments/service.ts';

const config = { merchantId: 123, posId: 123, apiKey: 'test-api', crcKey: 'test-crc', baseUrl: 'https://sandbox.przelewy24.pl', appBaseUrl: 'https://shop.example.test' };
const sessionId = '00000000-0000-4000-8000-000000000001';
const notification = () => {
  const n = { merchantId: 123, posId: 123, sessionId, amount: 7799, originAmount: 7799, currency: 'PLN', orderId: 12345678901, methodId: 1, statement: 'Test / żółć' };
  return { ...n, sign: checksum({ ...n, crc: config.crcKey }) };
};
const attempt = () => ({ id: sessionId, order_id: 'order', session_id: sessionId, status: 'created', amount: 7799, currency: 'PLN', provider_token: null, provider_order_id: null, created_at: new Date(0).toISOString(), expires_at: new Date(900000).toISOString() });
const response = (data, status = 200) => new Response(JSON.stringify({ data }), { status });
function fixture() {
  const a = attempt(), events = [], completed = [];
  let fresh = true;
  const store = {
    async prepare() { const isFresh = fresh; fresh = false; return { attempt: a, fresh: isFresh, email: 'test@example.test', orderNumber: 'MON-000001' }; },
    async saveToken(id, token) { a.status = 'pending'; a.provider_token = token; },
    async endAttempt(id, status) { a.status = status; },
    async findAttempt() { return a; },
    async recordNotification(a, n) { let event = events.find(e => e.id === n.orderId); if (!event) { event = { id: n.orderId, attempt_id: a.id, status: 'received', payload: n }; events.push(event); } return event; },
    async recordRecovery(a, t) {
      const existing = events.find(e => e.id === t.orderId);
      if (existing) return existing;
      const event = { id: t.orderId, attempt_id: a.id, status: 'received', payload: { ...t, source: 'authenticated_provider_api' } };
      events.push(event); return event;
    },
    async complete(id, orderId) { a.status = 'paid'; a.provider_order_id = orderId; events.find(e => e.id === orderId).status = 'verified'; completed.push(orderId); },
  };
  return { a, store, events, completed, reuse: () => { fresh = false; } };
}

test('sandbox configuration refuses production and non-HTTPS callback origins', () => {
  const env = { P24_ENV: 'sandbox', P24_MERCHANT_ID: '123', P24_POS_ID: '123', P24_API_KEY: 'key', P24_CRC_KEY: 'crc', APP_BASE_URL: 'https://shop.example.test' };
  assert.equal(paymentConfig(env).baseUrl, config.baseUrl);
  for (const change of [{ P24_ENV: 'production' }, { P24_API_KEY: '' }, { APP_BASE_URL: 'http://shop.example.test' }, { P24_POS_ID: '1.5' }, { APP_BASE_URL: 'https://shop.example.test/path' }]) assert.throws(() => paymentConfig({ ...env, ...change }));
});
test('signs each P24 operation separately and sends only the opaque return reference', async () => {
  const calls = [];
  const client = createP24Client(config, async (url, options) => { calls.push({ url, ...options }); return response(url.endsWith('register') ? { token: 'payment-token' } : { status: 'success' }); });
  await client.register(attempt(), 'test@example.test', 'MON-000001');
  await client.verify(notification());
  const registered = JSON.parse(calls[0].body), verified = JSON.parse(calls[1].body);
  assert.equal(registered.amount, 7799);
  assert.equal(registered.timeLimit, 15);
  assert.equal(registered.regulationAccept, false);
  assert.equal(registered.urlReturn, `https://shop.example.test/api/payments/przelewy24/return?attempt=${sessionId}`);
  assert.equal(registered.phone, undefined);
  assert.equal(registered.sign, checksum({ sessionId, merchantId: 123, amount: 7799, currency: 'PLN', crc: 'test-crc' }));
  assert.notEqual(registered.sign, verified.sign);
  assert.equal(calls[1].method, 'PUT');
  assert.equal(verified.sign, checksum({ sessionId, orderId: notification().orderId, amount: 7799, currency: 'PLN', crc: 'test-crc' }));
});
test('validates signed notification fields, integer money, and merchant identity', () => {
  const n = parseNotification(notification());
  assert.equal(validNotificationSign(n, config), true);
  assert.equal(validNotificationSign({ ...n, amount: 7800 }, config), false);
  assert.equal(validNotificationSign(n, { ...config, merchantId: 124 }), false);
  for (const change of [{ amount: 1.5 }, { orderId: Number.MAX_SAFE_INTEGER + 1 }, { currency: 'EUR' }, { sign: 'short' }]) assert.throws(() => parseNotification({ ...n, ...change }));
});
test('reports provider rate limiting with a distinct safe error', async () => {
  const client = createP24Client(config, async () => new Response(null, { status: 429 }));
  await assert.rejects(client.testAccess(), error => error.code === 'PROVIDER_RATE_LIMITED');
});
test('shows a retry-later message when P24 rejects registration due to rate limiting', async () => {
  const f = fixture();
  const service = createPaymentService(f.store, config, async () => new Response(null, { status: 429 }));
  const result = await service.start('token', 'phone', 'fingerprint');
  assert.equal(result.code, 'PAYMENT_RATE_LIMITED');
  assert.match(result.message, /operator płatności ograniczył liczbę prób/i);
  assert.equal(f.a.status, 'failed');
});
test('explains payment rate limits and pending attempts instead of hiding the cause', async () => {
  for (const [failure, expectedCode, expectedMessage] of [
    ['RATE_LIMITED', 'PAYMENT_RATE_LIMITED', 'zbyt wiele prób'],
    ['PAYMENT_PENDING', 'PAYMENT_PENDING', 'jeszcze sprawdzana'],
  ]) {
    const f = fixture();
    f.store.prepare = async () => { throw new Error(failure); };
    const service = createPaymentService(f.store, config);
    const result = await service.start('token', 'phone', 'fingerprint');
    assert.equal(result.code, expectedCode);
    assert.match(result.message, new RegExp(expectedMessage, 'i'));
  }
});
test('reuses the same active attempt after repeated or concurrent starts', async () => {
  const f = fixture(); let registered = 0;
  const service = createPaymentService(f.store, config, async url => { if (url.endsWith('register')) { registered++; return response({ token: 'payment-token' }); } return response(undefined, 404); }, () => 1);
  const results = await Promise.all([service.start('token','phone','fingerprint'), service.start('token','phone','fingerprint')]);
  assert.equal(registered, 1);
  assert.equal(results[0].ok, true);
  const reused = await service.start('token','phone','fingerprint');
  assert.equal(reused.ok, true);
  assert.equal(reused.redirectUrl, results[0].redirectUrl);
  assert.equal(registered, 1);
});
test('does not reopen the same P24 payment when the customer returns without a confirmed payment', async () => {
  const f = fixture();
  let registered = 0;
  const service = createPaymentService(f.store, config, async url => {
    if (url.endsWith('register')) {
      registered++;
      return response({ token: 'payment-token' });
    }
    return response({ sessionId, orderId: 1, amount: 7799, currency: 'PLN', status: 0 });
  }, () => 1);
  const first = await service.start('token', 'phone', 'fingerprint');
  assert.equal(first.ok, true);

  const returned = await service.start('token', 'phone', 'fingerprint', { returnedFromProvider: true });
  assert.equal(returned.code, 'PAYMENT_PENDING');
  assert.match(returned.message, /status nie potwierdza jeszcze błędu/i);
  assert.equal(registered, 1);
});
test('does not retry a P24 transaction that the provider reports as returned', async () => {
  const f = fixture();
  const service = createPaymentService(f.store, config, async url => {
    if (url.endsWith('register')) return response({ token: 'payment-token' });
    return response({ sessionId, orderId: 1, amount: 7799, currency: 'PLN', status: 3 });
  }, () => 1);
  await service.start('token', 'phone', 'fingerprint');
  const returned = await service.start('token', 'phone', 'fingerprint', { returnedFromProvider: true });
  assert.equal(returned.code, 'PAYMENT_PENDING');
  assert.match(returned.message, /operator zwrócił płatność/i);
});
test('an ambiguous registration timeout keeps the attempt and reconciles before retry', async () => {
  const f = fixture(); const paths = [];
  const service = createPaymentService(f.store, config, async url => { paths.push(url); if (url.endsWith('register')) throw new Error('timeout'); return response(undefined, 404); }, () => 1);
  assert.equal((await service.start('token','phone','fp')).ok, false);
  assert.equal(f.a.status, 'created');
  assert.equal((await service.start('token','phone','fp')).code, 'PAYMENT_PENDING');
  assert.equal(paths.filter(p => p.endsWith('register')).length, 1);
  assert.match(paths[1], /by\/sessionId/);
});
test('expired attempts are retired only after provider lookup and a grace period', async () => {
  const f = fixture(); f.reuse();
  const service = createPaymentService(f.store, config, async () => response({ sessionId, orderId: 1, amount: 7799, currency: 'PLN', status: 0 }), () => 1020001);
  await service.start('token','phone','fp');
  assert.equal(f.a.status, 'expired');
});
test('a provider outage or paid transaction prevents opening another payment', async () => {
  for (const status of [1, 2, 3]) {
    const f = fixture(); f.reuse();
    const service = createPaymentService(f.store, config, async () => response({ sessionId, orderId: 1, amount: 7799, currency: 'PLN', status }), () => 1020001);
    assert.equal((await service.start('token','phone','fp')).code, 'PAYMENT_PENDING');
    assert.equal(f.a.status, 'created');
  }
});
test('invalid signature or amount never records or verifies a payment', async () => {
  const f = fixture(); let requests = 0;
  const service = createPaymentService(f.store, config, async () => { requests++; return response({ status: 'success' }); });
  await assert.rejects(service.notify({ ...notification(), sign: 'a'.repeat(96) }));
  f.a.amount++;
  await assert.rejects(service.notify(notification()));
  assert.equal(requests, 0); assert.equal(f.events.length, 0);
});
test('persists before verification and makes duplicate notifications harmless', async () => {
  const f = fixture(); let verifies = 0;
  const service = createPaymentService(f.store, config, async () => { assert.equal(f.events[0].status, 'received'); verifies++; return response({ status: 'success' }); });
  await service.notify(notification()); await service.notify(notification());
  assert.equal(verifies, 1); assert.equal(f.completed.length, 1); assert.equal(f.a.status, 'paid');
});
test('verification failure leaves a durable retryable event and no paid order', async () => {
  const f = fixture();
  const service = createPaymentService(f.store, config, async () => { throw new Error('outage'); });
  await assert.rejects(service.notify(notification()));
  assert.equal(f.events[0].status, 'received'); assert.equal(f.completed.length, 0);
  await createPaymentService(f.store, config, async () => response({ status: 'success' })).notify(f.events[0].payload);
  assert.equal(f.completed.length, 1);
});
test('recovers when P24 already verified a payment but the database commit failed', async () => {
  const f = fixture();
  const service = createPaymentService(f.store, config, async url => url.endsWith('verify') ? response({}, 400) : response({ sessionId, orderId: notification().orderId, amount: 7799, currency: 'PLN', status: 2 }));
  await service.notify(notification());
  assert.equal(f.a.status, 'paid');
});

test('matches an independently calculated SHA-384 registration vector', () => {
  assert.equal(checksum({ sessionId: 'unique-session-id', merchantId: 999999, amount: 1000, currency: 'PLN', crc: 'crc-from-p24-panel' }),
    'fa0884ad02af86fc26fae39be19dc76ac45c793c6322824283ff86052a51d7540989712d0f383df38e4388bc768d29b6');
});
test('database commit failure leaves a signed event that can recover after verification', async () => {
  const f = fixture();
  const complete = f.store.complete;
  f.store.complete = async () => { throw new Error('database disconnected'); };
  await assert.rejects(createPaymentService(f.store, config, async () => response({ status: 'success' })).notify(notification()));
  assert.equal(f.events[0].status, 'received');
  assert.notEqual(f.a.status, 'paid');
  f.store.complete = complete;
  await createPaymentService(f.store, config, async url => url.endsWith('verify') ? response({}, 400) : response({ sessionId, orderId: notification().orderId, amount: 7799, currency: 'PLN', status: 2 })).notify(f.events[0].payload);
  assert.equal(f.completed.length, 1);
});
test('the API access check never registers a payment', async () => {
  let called;
  await createP24Client(config, async url => { called = url; return response(true); }).testAccess();
  assert.equal(called, 'https://sandbox.przelewy24.pl/api/v1/testAccess');
});

test('recovers a paid advance without a webhook and retains a distinct audit source', async () => {
  const f = fixture(); let verifies = 0;
  const service = createPaymentService(f.store, config, async url => {
    if (url.endsWith('verify')) { verifies++; assert.equal(f.events[0].payload.source, 'authenticated_provider_api'); return response({ status: 'success' }); }
    return response({ sessionId, orderId: 99, amount: 7799, currency: 'PLN', status: 1, clientEmail: 'private@example.test' });
  });
  assert.equal((await service.recover(sessionId)).status, 'processed');
  assert.equal(f.a.status, 'paid');
  assert.equal(f.events[0].payload.sign, undefined);
  assert.equal(f.events[0].payload.clientEmail, undefined);
  assert.equal((await service.recover(sessionId)).status, 'already_processed');
  assert.equal(verifies, 1);
});
test('recovery never verifies unpaid, refunded, or mismatched provider transactions', async () => {
  for (const change of [{ status: 0 }, { status: 3 }, { amount: 7800 }, { currency: 'EUR' }, { sessionId: '00000000-0000-4000-8000-000000000002' }, { orderId: 0 }]) {
    const f = fixture(); let verifies = 0;
    const service = createPaymentService(f.store, config, async url => {
      if (url.endsWith('verify')) { verifies++; return response({ status: 'success' }); }
      return response({ sessionId, orderId: 99, amount: 7799, currency: 'PLN', status: 1, ...change });
    });
    if (change.status === 0) assert.equal((await service.recover(sessionId)).status, 'unpaid');
    else await assert.rejects(service.recover(sessionId));
    assert.equal(verifies, 0); assert.equal(f.events.length, 0); assert.notEqual(f.a.status, 'paid');
  }
});
test('recovery persists before verification and can resume after verification or database failure', async () => {
  const f = fixture(); const complete = f.store.complete;
  f.store.complete = async () => { throw new Error('database unavailable'); };
  const paid = { sessionId, orderId: 99, amount: 7799, currency: 'PLN', status: 1 };
  await assert.rejects(createPaymentService(f.store, config, async url => response(url.endsWith('verify') ? { status: 'success' } : paid)).recover(sessionId));
  assert.equal(f.events[0].status, 'received'); assert.equal(f.completed.length, 0);
  f.store.complete = complete;
  await createPaymentService(f.store, config, async url => url.endsWith('verify') ? response({},400) : response({ ...paid, status: 2 })).recover(sessionId);
  assert.equal(f.events[0].status, 'verified'); assert.equal(f.completed.length, 1);
});
test('provider lookup returns only reconciliation fields, never customer data', async () => {
  const data = await createP24Client(config, async () => response({ sessionId, orderId: 99, amount: 7799, currency: 'PLN', status: 1, clientEmail: 'private@example.test', clientAddress: 'private address' })).lookup(sessionId);
  assert.deepEqual(Object.keys(data).sort(), ['amount','currency','orderId','sessionId','status']);
});
