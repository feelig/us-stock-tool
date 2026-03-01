"use client";

import { useState } from "react";

type TexasFranchiseTaxDueDateCalculatorProps = {
  notes?: string;
  isLoading?: boolean;
};

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TexasFranchiseTaxDueDateCalculator({
  notes,
  isLoading = false,
}: TexasFranchiseTaxDueDateCalculatorProps) {
  const [year, setYear] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    if (isLoading) {
      setError("State data is still loading.");
      return;
    }

    const yearValue = Number(year);
    if (!year || Number.isNaN(yearValue) || yearValue < 2000) {
      setError("Please enter a valid report year.");
      return;
    }

    const dueDate = new Date(yearValue, 4, 15);
    setResult(formatDisplayDate(dueDate));
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Texas Franchise Tax Due Date</h2>
        <p className="text-sm text-slate-600">
          Estimate the report due date based on the report year.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Report year
          <input
            type="number"
            min="2000"
            step="1"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="2026"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>

        <button
          type="button"
          onClick={handleCalculate}
          disabled={isLoading}
          className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Loading..." : "Calculate"}
        </button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {error && <p className="text-rose-600">{error}</p>}
          {!error && result && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimated due date</p>
              <p className="text-lg font-semibold text-slate-900">{result}</p>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Enter a report year to estimate the due date.</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {notes || "Verify all deadlines with official Texas sources."}
        </p>
      </div>
    </div>
  );
}
