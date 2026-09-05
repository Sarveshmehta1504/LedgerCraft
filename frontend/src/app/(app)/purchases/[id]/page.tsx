import { notFound } from "next/navigation";
import { OrderForm } from "@/components/forms/OrderForm";
import { MOCK_PURCHASE_ORDERS } from "@/lib/mock-data";

export default async function PurchaseOrderPage({ params }: PageProps<"/purchases/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/purchase-orders is ready (GET /api/purchase-orders/{id}).
  const order = MOCK_PURCHASE_ORDERS.find((record) => String(record.id) === id);
  if (!order) notFound();
  return <OrderForm side="purchase" order={order} />;
}
