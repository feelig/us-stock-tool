"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ToolPageItem = {
  stateId: string;
  stateLabel: string;
  toolSlug: string;
  title: string;
  description: string;
  category: string;
  href: string;
};

type ToolSearchProps = {
  items: ToolPageItem[];
  categories: string[];
  showStateFilter?: boolean;
  states?: { slug: string; name: string }[];
  initialCategory?: string;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
};

function formatBadge(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ToolSearch({
  items,
  categories,
  showStateFilter = false,
  states = [],
  initialCategory,
  selectedCategory,
  onCategoryChange,
}: ToolSearchProps) {
  const [query, setQuery] = useState("");
  const [internalCategory, setInternalCategory] = useState(
    initialCategory ?? "All"
  );
  const [selectedState, setSelectedState] = useState("All");
  const activeCategory = selectedCategory ?? internalCategory;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((entry) => {
      if (activeCategory !== "All" && entry.category !== activeCategory) {
        return false;
      }
      if (showStateFilter && selectedState !== "All") {
        if (entry.stateId !== selectedState) return false;
      }
      if (!normalizedQuery) return true;

      const haystack = [
        entry.stateLabel,
        entry.stateId,
        entry.toolSlug,
        entry.title,
        entry.description,
        entry.category,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query, activeCategory, selectedState, showStateFilter]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-card">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Search tools
            </label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by state, tool, or category"
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent-500"
            />
          </div>
          {showStateFilter && (
            <div className="w-full sm:w-56">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                State
              </label>
              <select
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
                className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent-500"
              >
                <option value="All">All states</option>
                {states.map((state) => (
                  <option key={state.slug} value={state.slug}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                if (onCategoryChange) {
                  onCategoryChange(category);
                } else {
                  setInternalCategory(category);
                }
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                activeCategory === category
                  ? "border-accent-600 bg-accent-600 text-white"
                  : "border-stone-200 text-ink-600 hover:border-accent-500 hover:text-accent-600"
              }`}
            >
              {formatBadge(category)}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {filtered.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-stone-200 p-6 text-sm text-ink-600">
              No tools match your search. Try another keyword or filter.
            </div>
          )}
          {filtered.map((entry) => (
            entry.href ? (
              <Link
                key={`${entry.stateId}-${entry.toolSlug}`}
                href={entry.href}
                className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-ink-700 transition hover:border-accent-500 hover:text-accent-600"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
                  <span className="rounded-full border border-stone-200 px-2 py-1 text-ink-500">
                    {entry.stateLabel}
                  </span>
                  <span className="rounded-full border border-stone-200 px-2 py-1 text-ink-500">
                    {entry.category}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-ink-900">
                  {entry.title}
                </h3>
                <p className="text-xs text-ink-600">{entry.description}</p>
              </Link>
            ) : null
          ))}
        </div>
      </div>
    </div>
  );
}
