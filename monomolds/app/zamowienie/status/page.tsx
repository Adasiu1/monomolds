import type { Metadata } from "next";
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
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <OrderStatusPage initialToken={token} />;
}
