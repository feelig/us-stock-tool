import { readFile } from "fs/promises";
import path from "path";

export type AnnualReportRule = {
  ruleType: string;
  ruleText: string;
  officialName?: string;
  initialDue?: string;
  recurring?: string;
  feeUSD?: number;
  dueDate?: string;
  lateFeeUSD?: number;
  notes?: string;
};

export type FeeAmount = {
  amount: number;
  currency: string;
  notes: string;
};

export type LateFilingPenalty = {
  type: string;
  fixedAmount: number;
  percentage: number;
  notes: string;
};

export type StateData = {
  stateName: string;
  stateSlug: string;
  entity: string;
  annualReport: AnnualReportRule;
  franchiseTax?: {
    dueDate?: string;
    lateFilingFeeUSD?: number;
    latePenalty?: {
      "1to30days"?: string;
      over30days?: string;
    };
    notes?: string;
  };
  publicationRequirement?: {
    deadline?: string;
    publicationCostRangeUSD?: string;
    certificateFilingFeeUSD?: number;
    notes?: string;
  };
  fees: {
    annualFee: FeeAmount;
  };
  penalties: {
    lateFiling: LateFilingPenalty;
  };
  sources: Array<
    | string
    | {
        title: string;
        url: string;
        retrievedAt?: string;
      }
  >;
  lastVerified: string;
};

export async function loadStateData(stateSlug: string): Promise<StateData> {
  const filePath = path.join(process.cwd(), "data", "states", `${stateSlug}.json`);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as StateData;
}
