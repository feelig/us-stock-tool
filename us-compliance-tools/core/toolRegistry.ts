export const tools = {
  "annual-report-deadline": {
    category: "business",
    seo: {
      title: (state: string) => `${state} annual-report-deadline | US Compliance Tool`,
      description: (state: string) =>
        `Check ${state} annual-report-deadline requirements and fees.`,
      faqs: (state: string) => [
        {
          q: "What does this tool calculate?",
          a: `It summarizes the typical annual report filing timeline for ${state} and helps you plan your due date. Always confirm with official sources.`,
        },
        {
          q: "Does this replace official guidance?",
          a: "No. This tool is informational only and does not provide legal advice. Verify deadlines with the state filing office.",
        },
        {
          q: "What information do I need?",
          a: "Usually your entity type and formation date. Requirements can vary, so confirm details before filing.",
        },
      ],
    },
  },
  "late-filing-penalty": {
    category: "business",
    seo: {
      title: (state: string) => `${state} late-filing-penalty | US Compliance Tool`,
      description: (state: string) =>
        `Review ${state} late-filing-penalty rules and fee considerations.`,
      faqs: (state: string) => [
        {
          q: "What does this tool provide?",
          a: `It outlines common late filing penalty structures for ${state} so you can plan ahead. Confirm exact penalties with official sources.`,
        },
        {
          q: "Are penalties fixed or variable?",
          a: "It depends on the state and filing type. Some penalties are fixed, while others are percentage-based.",
        },
        {
          q: "Is this legal advice?",
          a: "No. This is general information. Consult official guidance or a qualified professional for legal advice.",
        },
      ],
    },
  },
  "annual-fee-calculator": {
    category: "business",
    seo: {
      title: (state: string) => `${state} annual-fee-calculator | US Compliance Tool`,
      description: (state: string) =>
        `Estimate ${state} annual-fee-calculator obligations for common entity filings.`,
      faqs: (state: string) => [
        {
          q: "What does this tool estimate?",
          a: `It provides a high-level estimate of common annual fees in ${state} for typical filings. Verify amounts with official sources.`,
        },
        {
          q: "Why might my fee differ?",
          a: "Fees can depend on entity type, revenue thresholds, and filing details. Always confirm the exact amount before paying.",
        },
        {
          q: "Can I rely on this for compliance?",
          a: "Use it as a starting point only. It is not legal advice and may not cover all scenarios.",
        },
      ],
    },
  },
} as const;
