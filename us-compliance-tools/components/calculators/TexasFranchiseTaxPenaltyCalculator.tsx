"use client";

import { useState } from "react";

type TexasFranchiseTaxPenaltyCalculatorProps = {
  notes?: string;
  isLoading?: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function TexasFranchiseTaxPenaltyCalculator({
  notes,
  isLoading = false,
}: TexasFranchiseTaxPenaltyCalculatorProps) {
  const [taxDue, setTaxDue] = useState("");
  const [daysLate, setDaysLate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    if (isLoading) {
      setError("State data is still loading.");
      return;
    }

    const taxValue = Number(taxDue);
    const daysValue = Number(daysLate);

    if (!taxDue || Number.isNaN(taxValue) || taxValue < 0) {
      setError("Please enter a valid tax due amount.");
      return;
    }

    if (!daysLate || Number.isNaN(daysValue) || daysValue < 0) {
      setError("Please enter valid days late.");
      return;
    }

    const lowRate = 0.05;
    const highRate = daysValue > 30 ? 0.1 : 0.08;
    const low = taxValue * lowRate;
    const high = taxValue * highRate;

    setResult(`${formatCurrency(low)} - ${formatCurrency(high)}`);
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Texas Franchise Tax Penalty</h2>
        <p className="text-sm text-slate-600">
          Estimate a penalty range based on tax due and days late.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Tax due
            <input
              type="number"
              min="0"
              step="0.01"
              value={taxDue}
              onChange={(event) => setTaxDue(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </label>
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
        </div>

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
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimated penalty range</p>
              <p className="text-lg font-semibold text-slate-900">{result}</p>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Enter inputs to estimate a penalty range.</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {notes || "Verify penalties with official Texas sources."}
        </p>
      </div>
    </div>
  );
}
