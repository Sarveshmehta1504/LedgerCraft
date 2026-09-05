"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatMoney, titleCase } from "@/lib/format";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, categoryName, mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import type { Product } from "@/types";

export default function ProductsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  // TODO: replace with real API once backend/products is ready (GET /api/products).
  const fetchData = useCallback(() => mockRequest(MOCK_PRODUCTS), []);
  const { data, loading, error, retry } = useAsyncData<Product[]>(
    fetchData,
    "The products service did not respond.",
  );
  const products = data ?? [];

  const visible = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || product.name.toLowerCase().includes(term);
    const matchesCategory = !categoryId || String(product.category_id) === categoryId;
    return matchesSearch && matchesCategory;
  });

  const filtered = Boolean(search.trim() || categoryId);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      render: (product) => <span className="font-medium">{product.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (product) => (
        <span className="text-[var(--text-muted)]">{categoryName(product.category_id)}</span>
      ),
    },
    { key: "type", header: "Type", render: (product) => titleCase(product.type) },
    {
      key: "sales_price",
      header: "Sales price",
      numeric: true,
      render: (product) => formatMoney(product.sales_price),
    },
    {
      key: "cost_price",
      header: "Cost price",
      numeric: true,
      render: (product) => (
        <span className="text-[var(--text-muted)]">{formatMoney(product.cost_price)}</span>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Products"
        subtitle="Goods and services you buy and sell"
        actions={
          <Link href="/products/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
        trailing={<ViewSwitcher value={view} onChange={setView} />}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-2.5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className="h-8 w-64 rounded-md border border-[var(--line-strong)] px-2.5 text-sm transition-colors duration-150 placeholder:text-[var(--text-subtle)] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]"
        />
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Filter by category"
          className="h-8 cursor-pointer rounded-md border border-[var(--line-strong)] px-2 text-[13px] transition-colors duration-150 focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]"
        >
          <option value="">All categories</option>
          {MOCK_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(product) => product.id}
          onRowClick={(product) => router.push(`/products/${product.id}`)}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle={filtered ? "No products match" : "No products yet"}
          emptyDescription={
            filtered
              ? "Try a different search term or category."
              : "Add the items you trade before creating orders."
          }
          emptyAction={
            filtered ? undefined : (
              <Link href="/products/new">
                <Button variant="primary" size="sm">
                  New product
                </Button>
              </Link>
            )
          }
        />
      ) : loading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : visible.length === 0 ? (
        <EmptyState title="No products match" description="Try a different search or category." />
      ) : (
        <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white p-4 transition-colors duration-150 hover:bg-[var(--surface-sunken)]"
            >
              <p className="text-sm font-medium text-[var(--text)]">{product.name}</p>
              <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                {categoryName(product.category_id)} · {titleCase(product.type)}
              </p>
              <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-2.5">
                <span className="text-xs text-[var(--text-subtle)]">Sales</span>
                <span className="tnum font-mono text-[13px] text-[var(--text)]">
                  {formatMoney(product.sales_price)}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-[var(--text-subtle)]">Cost</span>
                <span className="tnum font-mono text-[13px] text-[var(--text-muted)]">
                  {formatMoney(product.cost_price)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
