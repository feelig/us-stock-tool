"use client";

import { useState } from "react";

type NYPublicationCostEstimatorProps = {
  notes?: string;
  isLoading?: boolean;
};

export default function NYPublicationCostEstimator({
  notes,
  isLoading = false,
}: NYPublicationCostEstimatorProps) {
  const [countyType, setCountyType] = useState("nyc");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = () => {
    setError(null);
    setResult(null);

    if (isLoading) {
      setError("State data is still loading.");
      return;
    }

    const range =
      countyType === "nyc" ? "$1,200 - $2,000" : "$400 - $800";
    setResult(range);
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">NY Publication Cost</h2>
        <p className="text-sm text-slate-600">
          Estimate publication costs based on county grouping.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          County group
          <select
            value={countyType}
            onChange={(event) => setCountyType(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="nyc">NYC (Manhattan, Brooklyn, Queens, Bronx, Staten Island)</option>
            <option value="other">Other counties</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleEstimate}
          disabled={isLoading}
          className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Loading..." : "Estimate"}
        </button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {error && <p className="text-rose-600">{error}</p>}
          {!error && result && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimated range</p>
              <p className="text-lg font-semibold text-slate-900">{result}</p>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Choose a county group to estimate a range.</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {notes || "Verify publication costs with official sources."}
        </p>
      </div>
    </div>
  );
}
