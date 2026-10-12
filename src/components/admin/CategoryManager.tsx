"use client";

import { useState, useTransition } from "react";
import { addCategory } from "@/lib/admin-actions";
import type { Category } from "@/types/database";
import { BUSINESS_TYPE_LABELS } from "@/lib/utils";

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("erkek_beber");
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await addCategory(name.trim(), businessType);
      window.location.reload();
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Kategoriler</h1>

      <form onSubmit={handleAdd} className="mt-5 flex flex-wrap gap-2 rounded-xl2 border border-stone-200 bg-white p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kategori adı (örn. Nail Art Stüdyoları)"
          className="focus-ring flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
        />
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="focus-ring rounded-lg border border-stone-200 px-3 py-2 text-sm"
        >
          {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button disabled={isPending} className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
          Ekle
        </button>
      </form>

      <div className="mt-5 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
        {initialCategories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-ink">{c.name}</span>
            <span className="text-stone-500">{BUSINESS_TYPE_LABELS[c.business_type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
