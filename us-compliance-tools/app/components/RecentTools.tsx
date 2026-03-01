"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecentTool } from "./RecordToolView";

const STORAGE_KEY = "recentTools";

function readRecent(): RecentTool[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentTool[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RecentTools() {
  const [items, setItems] = useState<RecentTool[]>([]);

  useEffect(() => {
    setItems(readRecent());

    const handleStorage = () => {
      setItems(readRecent());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
        <h2 className="text-lg font-semibold text-ink-950">Recently viewed</h2>
        <p className="mt-2 text-sm text-ink-600">
          You have not viewed any tools yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
      <h2 className="text-lg font-semibold text-ink-950">Recently viewed</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.url}
            href={item.url}
            className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition hover:border-accent-500 hover:text-accent-600"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
