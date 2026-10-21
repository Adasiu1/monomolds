import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isGuestOrderToken } from '@/features/order-status/order-status';
import { paymentConfig } from '@/lib/payments/przelewy24';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const attempt = new URL(request.url).searchParams.get('attempt') ?? '';
  const target = new URL('/zamowienie/status', paymentConfig().appBaseUrl);
  if (/^[0-9a-f-]{36}$/.test(attempt)) {
    const token = (await cookies()).get(`p24_guest_${attempt}`)?.value ?? '';
    if (isGuestOrderToken(token)) target.searchParams.set('token', token);
  }
  const response = NextResponse.redirect(target, 303);
  response.headers.set('Referrer-Policy','no-referrer');
  response.headers.set('Cache-Control','no-store');
  return response;
}
