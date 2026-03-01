import { STATES } from "./stateConfig";
import { tools } from "./toolRegistry";

export type Faq = { q: string; a: string };

export function getToolSeo(state: string, tool: string) {
  const toolDef = tools[tool as keyof typeof tools];
  if (!toolDef) {
    throw new Error(`Unknown tool: ${tool}`);
  }

  const title = toolDef.seo.title(state);
  const description = toolDef.seo.description(state);
  const faqs = toolDef.seo.faqs(state);

  return { title, description, faqs };
}

export function buildFaqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function getInternalLinks(state: string, tool: string) {
  const toolSlugs = Object.keys(tools);

  const moreToolsForState = toolSlugs
    .filter((slug) => slug !== tool)
    .map((slug) => ({
      tool: slug,
      href: `/tools/${state}/${slug}`,
    }));

  const otherStatesForTool = STATES
    .filter((slug) => slug !== state)
    .map((slug) => ({
      state: slug,
      href: `/tools/${slug}/${tool}`,
    }));

  return { moreToolsForState, otherStatesForTool };
}
