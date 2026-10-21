import { createP24Client, paymentConfig, PaymentProviderError } from '../lib/payments/przelewy24.ts';

try {
  const config = paymentConfig();
  if (process.argv[2] === 'check') {
    await createP24Client(config).testAccess();
    console.log('P24 sandbox API access verified. CRC signing still requires an end-to-end payment test.');
  } else if (process.argv[2] === 'reconcile') {
    const secret = process.env.PAYMENT_RECONCILIATION_SECRET;
    if (!secret) throw new Error('MISSING_RECONCILIATION_SECRET');
    const response = await fetch(`${config.appBaseUrl}/api/payments/przelewy24/reconcile`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error('RECONCILIATION_UNAVAILABLE');
    const { checked, completed } = await response.json();
    console.log(`Payment notifications checked: ${checked}; completed: ${completed}.`);
    if (checked !== completed) process.exitCode = 1;
  } else throw new Error('UNKNOWN_PAYMENT_COMMAND');
} catch (error) {
  console.error(error instanceof PaymentProviderError ? error.code : 'Payment check failed. Check local configuration and the running tunnel.');
  process.exitCode = 1;
}
