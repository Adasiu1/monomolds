try {
  const sessionId = process.argv[2] ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)) throw new Error('INVALID_SESSION');
  const secret = process.env.PAYMENT_RECONCILIATION_SECRET;
  if (!secret) throw new Error('MISSING_RECONCILIATION_SECRET');
  const origin = new URL(process.argv[3] ?? 'http://127.0.0.1:3000');
  if (origin.origin !== process.env.APP_BASE_URL && !(origin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(origin.hostname))) throw new Error('INVALID_RECOVERY_ORIGIN');
  const response = await fetch(new URL('/api/payments/przelewy24/reconcile', origin), {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error('PAYMENT_RECOVERY_FAILED');
  console.log(`Payment recovery: ${result.status}. Check the order and event in Supabase.`);
  if (result.status === 'unpaid') process.exitCode = 1;
} catch {
  console.error('Payment recovery failed. Check the local app, configuration, and provider status.');
  process.exitCode = 1;
}
