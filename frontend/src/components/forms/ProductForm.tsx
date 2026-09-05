"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Combobox } from "@/components/ui/Combobox";
import { InlineAlert } from "@/components/ui/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiError } from "@/lib/api";
import { ProductCategoriesApi, ProductsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Product, ProductCategory, ProductType } from "@/types";

const EMPTY: Omit<Product, "id"> = {
  name: "",
  type: "goods",
  sales_price: 0,
  cost_price: 0,
  category_id: 0,
};

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [form, setForm] = useState<Omit<Product, "id">>(product ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(() => ProductCategoriesApi.list(), []);
  const { data: categoriesData, retry: reloadCategories } = useAsyncData<ProductCategory[]>(
    fetchCategories,
    "Could not load categories.",
  );
  const categories = categoriesData ?? [];

  async function createCategory(name: string) {
    const created = await ProductCategoriesApi.create(name);
    reloadCategories();
    return { value: created.id, label: created.name };
  }

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Product name is required.";
    // Category is required by the API contract — a product cannot exist without one.
    if (!form.category_id) next.category_id = "Select a category.";
    if (form.sales_price < 0) next.sales_price = "Cannot be negative.";
    if (form.cost_price < 0) next.cost_price = "Cannot be negative.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      if (product) await ProductsApi.update(product.id, form);
      else await ProductsApi.create(form);
      router.push("/products");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) fieldErrors[field] = messages[0];
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Could not save this product.");
      }
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-lg border border-[var(--line)] bg-white [&>header:first-child]:rounded-t-lg"
    >
      <PageHeader
        title={product ? product.name : "New product"}
        subtitle={product ? "Edit product" : "Create a product or service"}
        actions={
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => router.push("/products")}>
            Back
          </Button>
        }
      />

      {formError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={formError} />
        </div>
      )}

      <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <TextField
            label="Product name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            required
          />
          <SelectField
            label="Product type"
            value={form.type}
            onChange={(event) => update("type", event.target.value as ProductType)}
            options={[
              { value: "goods", label: "Goods" },
              { value: "service", label: "Service" },
              { value: "combo", label: "Combo" },
            ]}
            required
          />
          <Combobox
            label="Category"
            value={form.category_id || null}
            onChange={(next) => update("category_id", next ?? 0)}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            onCreate={createCategory}
            placeholder="Search or type a new category"
            error={errors.category_id}
            hint="Type a name that does not exist yet to create it on the fly."
            required
          />
        </div>

        <div className="flex flex-col gap-5">
          <TextField
            label="Sales price"
            type="number"
            min={0}
            step="0.01"
            value={form.sales_price}
            onChange={(event) => update("sales_price", Number(event.target.value))}
            error={errors.sales_price}
            className="tnum font-mono"
          />
          <TextField
            label="Cost price"
            type="number"
            min={0}
            step="0.01"
            value={form.cost_price}
            onChange={(event) => update("cost_price", Number(event.target.value))}
            error={errors.cost_price}
            className="tnum font-mono"
          />
        </div>
      </div>
    </form>
  );
}
