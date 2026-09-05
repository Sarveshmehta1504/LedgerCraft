import { notFound } from "next/navigation";
import { ProductForm } from "@/components/forms/ProductForm";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/products is ready (GET /api/products/{id}).
  const product = MOCK_PRODUCTS.find((record) => String(record.id) === id);
  if (!product) notFound();
  return <ProductForm product={product} />;
}
