"use client";

import { useState } from "react";

type FloridaAnnualReportLateFeeCalculatorProps = {
  notes?: string;
  isLoading?: boolean;
};

export default function FloridaAnnualReportLateFeeCalculator({
  notes,
  isLoading = false,
}: FloridaAnnualReportLateFeeCalculatorProps) {
  const [daysLate, setDaysLate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = () => {
    setError(null);
    setResult(null);

    if (isLoading) {
      setError("State data is still loading.");
      return;
    }

    const daysValue = Number(daysLate);
    if (!daysLate || Number.isNaN(daysValue) || daysValue < 0) {
      setError("Please enter a valid days-late value.");
      return;
    }

    const range = daysValue === 0 ? "$0" : "$50 - $400";
    setResult(range);
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Florida Late Fee</h2>
        <p className="text-sm text-slate-600">
          Estimate late fees based on how many days past due the report is.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Days late
          <input
            type="number"
            min="0"
            step="1"
            value={daysLate}
            onChange={(event) => setDaysLate(event.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
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
            <p className="text-slate-500">Enter days late to estimate the fee range.</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {notes || "Verify late fees with official Florida sources."}
        </p>
      </div>
    </div>
  );
}
