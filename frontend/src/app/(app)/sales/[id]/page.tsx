import { notFound } from "next/navigation";
import { OrderForm } from "@/components/forms/OrderForm";
import { MOCK_SALES_ORDERS } from "@/lib/mock-data";

export default async function SalesOrderPage({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/sales-orders is ready (GET /api/sales-orders/{id}).
  const order = MOCK_SALES_ORDERS.find((record) => String(record.id) === id);
  if (!order) notFound();
  return <OrderForm side="sales" order={order} />;
}
