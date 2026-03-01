"use client";

import { useState } from "react";
export type AnnualReportRule = {
  ruleType: string;
  ruleText: string;
};

type AnnualReportDeadlineCalculatorProps = {
  annualReport?: AnnualReportRule | null;
  isLoading?: boolean;
};

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnnualReportDeadlineCalculator({
  annualReport,
  isLoading = false,
}: AnnualReportDeadlineCalculatorProps) {
  const [formationDate, setFormationDate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCalculate = () => {
    setCopied(false);
    setError(null);
    setResult(null);

    if (isLoading || !annualReport) {
      setError("State data is still loading.");
      return;
    }

    if (!formationDate) {
      setError("Please enter a formation date.");
      return;
    }

    const parsed = new Date(`${formationDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      setError("Invalid formation date.");
      return;
    }

    if (annualReport.ruleType !== "anniversary_month") {
      setError("This calculator only supports anniversary month rules.");
      return;
    }

    const targetMonth = parsed.getMonth();
    const targetDay = parsed.getDate();
    const candidate = new Date(parsed.getFullYear() + 1, targetMonth, targetDay);

    if (candidate.getMonth() !== targetMonth || candidate.getDate() !== targetDay) {
      setError("No matching anniversary date next year for the selected day.");
      return;
    }

    setResult(formatDisplayDate(candidate));
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const ruleText = annualReport?.ruleText ?? "";

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Annual Report Deadline</h2>
        <p className="text-sm text-slate-600">Calculate the next due date based on the formation date.</p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Formation date
          <input
            type="date"
            value={formationDate}
            onChange={(event) => setFormationDate(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={isLoading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Loading..." : "Calculate"}
          </button>
          {result && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500"
            >
              {copied ? "Copied" : "Copy result"}
            </button>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {error && <p className="text-rose-600">{error}</p>}
          {!error && result && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Next due date</p>
              <p className="text-lg font-semibold text-slate-900">{result}</p>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Enter a formation date to calculate the next due date.</p>
          )}
        </div>

        {ruleText && (
          <p className="text-xs text-slate-500">Rule: {ruleText}</p>
        )}
      </div>
    </div>
  );
}
