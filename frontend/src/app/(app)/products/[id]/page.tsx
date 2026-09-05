"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { ProductForm } from "@/components/forms/ProductForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { ProductsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Product } from "@/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => ProductsApi.get(Number(id)), [id]);
  const { data: product, loading, error, retry } = useAsyncData<Product>(
    fetchData,
    "Could not load this product.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !product) return <ErrorState message={error ?? "Product not found."} onRetry={retry} />;
  return <ProductForm product={product} />;
}
