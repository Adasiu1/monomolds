import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OrderStatusPage } from "@/features/order-status/order-status-page";
import "./status.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status zamówienia",
  robots: { index: false, follow: false },
};

export default async function OrderStatusRoute({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; paymentReturn?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const attemptId = typeof params.paymentReturn === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(params.paymentReturn)
    ? params.paymentReturn
    : "";
  const returnCookie = (await cookies()).get("p24_order_return")?.value;
  const paymentReturnAttempt = returnCookie === `${attemptId}.${token}` ? attemptId : "";
  return <OrderStatusPage initialToken={token} paymentReturnAttempt={paymentReturnAttempt} />;
}
