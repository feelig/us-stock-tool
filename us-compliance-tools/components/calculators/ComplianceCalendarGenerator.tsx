"use client";

import { useState } from "react";

type ComplianceCalendarGeneratorProps = {
  stateLabel?: string;
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

export default function ComplianceCalendarGenerator({
  stateLabel,
  notes,
  isLoading = false,
}: ComplianceCalendarGeneratorProps) {
  const [formationDate, setFormationDate] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    setResult(null);

    if (isLoading) {
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

    const nextAnnual = new Date(parsed.getFullYear() + 1, parsed.getMonth(), parsed.getDate());
    const calendarItems = [
      `Annual report window: ${formatDisplayDate(nextAnnual)}`,
      "Tax check-in: 30 days before annual report due date",
      "Renew registered agent details annually",
    ];

    setResult(calendarItems);
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Compliance Calendar</h2>
        <p className="text-sm text-slate-600">
          Generate a simple compliance timeline for {stateLabel ?? "this state"}.
        </p>
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

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Loading..." : "Generate"}
        </button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {error && <p className="text-rose-600">{error}</p>}
          {!error && result && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Suggested timeline</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
                {result.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {!error && !result && (
            <p className="text-slate-500">Enter a formation date to generate a timeline.</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {notes || "Verify all deadlines with official state sources."}
        </p>
      </div>
    </div>
  );
}
