import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isGuestOrderToken } from '@/features/order-status/order-status';
import { paymentConfig } from '@/lib/payments/przelewy24';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const attempt = new URL(request.url).searchParams.get('attempt') ?? '';
  const target = new URL('/zamowienie/status', paymentConfig().appBaseUrl);
  let returnAccess: string | null = null;
  const attemptCookieName = `p24_guest_${attempt}`;
  const validAttemptId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(attempt);
  if (validAttemptId) {
    const token = (await cookies()).get(attemptCookieName)?.value ?? '';
    if (isGuestOrderToken(token)) {
      target.searchParams.set('token', token);
      target.searchParams.set('paymentReturn', attempt);
      returnAccess = `${attempt}.${token}`;
    }
  }
  const response = NextResponse.redirect(target, 303);
  if (returnAccess) {
    response.cookies.set(attemptCookieName, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/payments/przelewy24/return',
      maxAge: 0,
    });
    response.cookies.set('p24_order_return', returnAccess, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
  }
  response.headers.set('Referrer-Policy','no-referrer');
  response.headers.set('Cache-Control','no-store');
  return response;
}
