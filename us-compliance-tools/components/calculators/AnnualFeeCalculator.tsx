"use client";

export type AnnualFee = {
  amount: number;
  currency: string;
  notes: string;
};

type AnnualFeeCalculatorProps = {
  fee?: AnnualFee | null;
  stateLabel?: string;
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

export default function AnnualFeeCalculator({
  fee,
  stateLabel,
  isLoading = false,
}: AnnualFeeCalculatorProps) {
  if (isLoading || !fee) {
    return (
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Annual Fee</h2>
          <p className="text-sm text-slate-600">Loading state data...</p>
        </div>
      </div>
    );
  }

  const formattedFee = formatCurrency(fee.amount, fee.currency);

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Annual Fee</h2>
        <p className="text-sm text-slate-600">
          Current LLC annual fee for {stateLabel ?? "this state"}.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Annual fee</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{formattedFee}</p>
        <p className="mt-1 text-sm text-slate-600">Currency: {fee.currency}</p>
        {fee.notes ? (
          <p className="mt-2 text-sm text-slate-500">Notes: {fee.notes}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Notes: None provided.</p>
        )}
      </div>
    </div>
  );
}
