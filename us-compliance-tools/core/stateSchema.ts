export type StateDataV1 = {
  state: string | null;
  updated_at: string | null;
  business: {
    annual_report_required: boolean | null;
    annual_report_deadline: string | null;
    llc_annual_fee: number | null;
  };
  penalties: {
    late_filing_fee: number | null;
  };
  sources: string[];
};

export function normalizeStateData(raw: any): StateDataV1 {
  return {
    state: raw?.state ?? null,
    updated_at: raw?.updated_at ?? null,
    business: {
      annual_report_required: raw?.business?.annual_report_required ?? null,
      annual_report_deadline: raw?.business?.annual_report_deadline ?? null,
      llc_annual_fee: raw?.business?.llc_annual_fee ?? null,
    },
    penalties: {
      late_filing_fee: raw?.penalties?.late_filing_fee ?? null,
    },
    sources: Array.isArray(raw?.sources) ? raw.sources : [],
  };
}
