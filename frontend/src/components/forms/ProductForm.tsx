"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Combobox } from "@/components/ui/Combobox";
import { PageHeader } from "@/components/shared/PageHeader";
import { MOCK_CATEGORIES } from "@/lib/mock-data";
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
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>(MOCK_CATEGORIES);

  /**
   * Creates the category locally so the product form never blocks on a second
   * screen. Negative ids mark records that exist only client-side so far.
   */
  function createCategory(name: string) {
    // TODO: replace with real API once backend/product-categories is ready
    // (POST /api/product-categories, then use the id it returns).
    const created: ProductCategory = {
      id: -(categories.length + 1),
      name,
      parent_id: null,
    };
    setCategories((previous) => [...previous, created]);
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
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    // TODO: replace with real API once backend/products is ready
    // (POST /api/products, or PUT /api/products/{id} when editing).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSaving(false);
    router.push("/products");
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
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
