"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ComboboxControl } from "@/components/ui/Combobox";
import { DataTable, type Column } from "@/components/shared/DataTable";
import {
  ClearFilters,
  FilterBar,
  SearchInput,
  SegmentedFilter,
} from "@/components/shared/FilterBar";
import { ArchiveAction, ShowArchivedToggle, useArchive } from "@/components/shared/Archive";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pager, usePagination } from "@/components/shared/Pagination";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from "@/components/ui/States";
import { formatMoney, titleCase } from "@/lib/format";
import { ProductCategoriesApi, ProductsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Product, ProductCategory, ProductType } from "@/types";

const TYPE_FILTERS: { value: ProductType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "goods", label: "Goods" },
  { value: "service", label: "Service" },
  { value: "combo", label: "Combo" },
];

export default function ProductsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "">("");
  const [categoryId, setCategoryId] = useState<string>("");
  // useAsyncData's retry is defined below the hook that needs it, so the
  // hook refreshes through a ref rather than reordering the file.
  const retryRef = useRef<() => void>(() => {});
  const {
    isAdmin,
    showArchived,
    setShowArchived,
    busyId,
    error: archiveError,
    toggle: toggleArchived,
    listParam: archiveListParam,
  } = useArchive(ProductsApi, () => retryRef.current());

  const fetchData = useCallback(() => ProductsApi.list(archiveListParam), [archiveListParam]);
  const { data, loading, error, retry } = useAsyncData<Product[]>(
    fetchData,
    "The products service did not respond.",
  );
  useEffect(() => {
    retryRef.current = retry;
  });
  const products = data ?? [];

  const fetchCategories = useCallback(() => ProductCategoriesApi.list(), []);
  const { data: categoriesData } = useAsyncData<ProductCategory[]>(
    fetchCategories,
    "Could not load categories.",
  );
  const categories = categoriesData ?? [];

  const visible = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || product.name.toLowerCase().includes(term);
    const matchesType = !typeFilter || product.type === typeFilter;
    const matchesCategory = !categoryId || String(product.category_id) === categoryId;
    return matchesSearch && matchesType && matchesCategory;
  });

  const filtered = Boolean(search.trim() || typeFilter || categoryId);

  // The card view needs its own pager: DataTable pages the list view itself,
  // and only one of the two is ever mounted.
  const { visible: cards, pager: cardPager } = usePagination(visible);

  function clearFilters() {
    setSearch("");
    setTypeFilter("");
    setCategoryId("");
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      render: (product) => <span className="font-medium">{product.name}</span>,
      sortValue: (product) => product.name,
    },
    {
      key: "category",
      header: "Category",
      render: (product) => (
        <span className="text-[var(--text-muted)]">{product.category?.name ?? "—"}</span>
      ),
      sortValue: (product) => product.category?.name,
    },
    {
      key: "type",
      header: "Type",
      render: (product) => titleCase(product.type),
      sortValue: (product) => product.type,
    },
    {
      key: "sales_price",
      header: "Sales price",
      numeric: true,
      render: (product) => formatMoney(product.sales_price),
      sortValue: (product) => product.sales_price,
    },
    {
      key: "cost_price",
      header: "Cost price",
      numeric: true,
      render: (product) => (
        <span className="text-[var(--text-muted)]">{formatMoney(product.cost_price)}</span>
      ),
      sortValue: (product) => product.cost_price,
    },
     ...(isAdmin
      ? [
          {
            key: "archive",
            header: "",
            render: (row: Product) => (
              <ArchiveAction row={row} busy={busyId === row.id} onToggle={toggleArchived} />
            ),
          } satisfies Column<Product>,
        ]
      : []),
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
        trailing={
          <>
            {isAdmin && (
              <ShowArchivedToggle value={showArchived} onChange={setShowArchived} />
            )}
            <ViewSwitcher value={view} onChange={setView} />
          </>
        }
      />

      {archiveError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={archiveError} />
        </div>
      )}

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products"
          label="Search products"
        />
        <SegmentedFilter
          value={typeFilter}
          options={TYPE_FILTERS}
          onChange={setTypeFilter}
          label="Filter by product type"
        />
        <div className="w-56">
          <ComboboxControl
            ariaLabel="Filter by category"
            size="sm"
            value={categoryId ? Number(categoryId) : null}
            onChange={(value) => setCategoryId(value === null ? "" : String(value))}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            placeholder="All categories"
            clearLabel="All categories"
          />
        </div>
        {filtered && <ClearFilters onClear={clearFilters} />}
      </FilterBar>

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(product) => product.id}
          onRowClick={(product) => router.push(`/products/${product.id}`)}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle={

            showArchived

              ? "No archived products"

              : filtered

                ? "No products match"

                : "No products yet"

          }
          emptyDescription={

            showArchived

              ? "Every one of your products is currently active."

              : filtered

                              ? "Try a different search term or category."

                              : "Add the items you trade before creating orders."

          }
          emptyAction={

            showArchived ? undefined : (
            filtered ? undefined : (
              <Link href="/products/new">
                <Button variant="primary" size="sm">
                  New product
                </Button>
              </Link>
            )

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
        <>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="rounded-lg border border-[var(--line)] bg-white p-4 transition-colors duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <p className="text-sm font-medium text-[var(--text)]">{product.name}</p>
              <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                {product.category?.name ?? "—"} · {titleCase(product.type)}
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
        <Pager state={cardPager} />
        </>
      )}
    </div>
  );
}
