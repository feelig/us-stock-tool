"use client";

import { useState } from "react";

type LLCFormationCostCalculatorProps = {
  stateLabel?: string;
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

export default function LLCFormationCostCalculator({
  stateLabel,
  notes,
  isLoading = false,
}: LLCFormationCostCalculatorProps) {
  const [filingFee, setFilingFee] = useState("");
  const [agentFee, setAgentFee] = useState("");
  const [expediteFee, setExpediteFee] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    if (isLoading) {
      setError("State data is still loading.");
      return;
    }

    const filing = Number(filingFee || 0);
    const agent = Number(agentFee || 0);
    const expedite = Number(expediteFee || 0);

    if ([filing, agent, expedite].some((value) => Number.isNaN(value) || value < 0)) {
      setError("Please enter valid non-negative amounts.");
      return;
    }

    const total = filing + agent + expedite;
    setResult(formatCurrency(total));
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">LLC Formation Cost</h2>
        <p className="text-sm text-slate-600">
          Estimate first-year formation costs for {stateLabel ?? "this state"}.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Filing fee
            <input
              type="number"
              min="0"
              step="0.01"
              value={filingFee}
              onChange={(event) => setFilingFee(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Registered agent
            <input
              type="number"
              min="0"
              step="0.01"
              value={agentFee}
              onChange={(event) => setAgentFee(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Expedited filing
            <input
              type="number"
              min="0"
              step="0.01"
              value={expediteFee}
              onChange={(event) => setExpediteFee(event.target.value)}
              placeholder="0.00"
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
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimated total</p>
              <p className="text-lg font-semibold text-slate-900">{result}</p>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Enter your estimated fees to calculate a total.</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {notes || "Verify final fees with official state sources."}
        </p>
      </div>
    </div>
  );
}
