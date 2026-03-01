"use client";

import { useEffect } from "react";

const STORAGE_KEY = "recentTools";

export type RecentTool = {
  title: string;
  url: string;
};

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

function writeRecent(items: RecentTool[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore write errors
  }
}

export default function RecordToolView({ title, url }: RecentTool) {
  useEffect(() => {
    if (!url || !title) return;
    const existing = readRecent().filter((item) => item.url !== url);
    const next = [{ title, url }, ...existing].slice(0, 6);
    writeRecent(next);
  }, [title, url]);

  return null;
}
