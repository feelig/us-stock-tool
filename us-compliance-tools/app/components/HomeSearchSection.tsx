"use client";

import { useState } from "react";
import ToolSearch from "./ToolSearch";

type HomeSearchSectionProps = {
  items: Array<{
    stateId: string;
    stateLabel: string;
    toolSlug: string;
    title: string;
    description: string;
    category: string;
    href: string;
  }>;
  categories: string[];
  popularCategories: { label: string; category: string }[];
};

export default function HomeSearchSection({
  items,
  categories,
  popularCategories,
}: HomeSearchSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <div className="grid gap-6">
      <ToolSearch
        items={items}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
        <h2 className="text-lg font-semibold text-ink-950">Popular categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {popularCategories.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedCategory(item.category)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                selectedCategory === item.category
                  ? "border-accent-600 bg-accent-600 text-white"
                  : "border-stone-200 text-ink-600 hover:border-accent-500 hover:text-accent-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
