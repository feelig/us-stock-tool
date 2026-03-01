"use client";

import { useState } from "react";
export type LateFilingRule = {
  type: string;
  fixedAmount: number;
  percentage: number;
  notes: string;
};

type LateFilingPenaltyCalculatorProps = {
  rule?: LateFilingRule | null;
  currency?: string;
  isLoading?: boolean;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function LateFilingPenaltyCalculator({
  rule,
  currency = "USD",
  isLoading = false,
}: LateFilingPenaltyCalculatorProps) {
  const [unpaidAmount, setUnpaidAmount] = useState("");
  const [daysLate, setDaysLate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    if (isLoading || !rule) {
      setError("State data is still loading.");
      return;
    }

    const unpaidValue = Number(unpaidAmount);
    const daysValue = Number(daysLate);

    if (!unpaidAmount || Number.isNaN(unpaidValue) || unpaidValue < 0) {
      setError("Please enter a valid unpaid amount.");
      return;
    }

    if (!daysLate || Number.isNaN(daysValue) || daysValue < 0) {
      setError("Please enter a valid days-late value.");
      return;
    }

    const penaltyRule = rule;
    let penalty = 0;

    switch (penaltyRule.type) {
      case "fixed":
        penalty = penaltyRule.fixedAmount;
        break;
      case "percentage":
        penalty = unpaidValue * penaltyRule.percentage;
        break;
      case "fixed_plus_percentage":
        penalty = penaltyRule.fixedAmount + unpaidValue * penaltyRule.percentage;
        break;
      default:
        setError("Unsupported penalty rule type.");
        return;
    }

    setResult(formatCurrency(penalty, currency));
  };

  const penaltyRule = rule;

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Late Filing Penalty</h2>
        <p className="text-sm text-slate-600">Estimate penalties based on unpaid amount and days late.</p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Unpaid amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={unpaidAmount}
              onChange={(event) => setUnpaidAmount(event.target.value)}
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
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimated penalty</p>
              <p className="text-lg font-semibold text-slate-900">{result}</p>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Enter amounts to estimate the penalty.</p>
          )}
        </div>

        {penaltyRule && (
          <div className="text-xs text-slate-500">
            <p>
              Rule type: <span className="font-medium text-slate-700">{penaltyRule.type}</span>
            </p>
            {penaltyRule.fixedAmount > 0 && (
              <p>Fixed amount: {formatCurrency(penaltyRule.fixedAmount, currency)}</p>
            )}
            {penaltyRule.percentage > 0 && (
              <p>Percentage rate: {(penaltyRule.percentage * 100).toFixed(2)}%</p>
            )}
            {penaltyRule.notes && <p>Notes: {penaltyRule.notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
