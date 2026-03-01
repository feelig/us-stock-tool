import { NextResponse } from "next/server";
import { STATES } from "../../core/stateConfig";
import { tools } from "../../core/toolRegistry";
import { getStateData } from "../../core/stateLoader";

function resolveSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl;

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

const siteUrl = resolveSiteUrl().replace(/\/+$/, "");

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getLastMod(state: string) {
  try {
    const data = getStateData(state);
    if (data?.updated_at) return data.updated_at;
  } catch {
    // ignore
  }
  return formatDate(new Date());
}

function buildUrl(path: string) {
  return `${siteUrl}${path}`;
}

export async function GET() {
  const toolSlugs = Object.keys(tools);
  const urls: Array<{ loc: string; lastmod: string }> = [];

  urls.push({ loc: buildUrl("/"), lastmod: formatDate(new Date()) });
  urls.push({ loc: buildUrl("/tools"), lastmod: formatDate(new Date()) });

  STATES.forEach((state) => {
    const lastmod = getLastMod(state);
    toolSlugs.forEach((tool) => {
      urls.push({
        loc: buildUrl(`/tools/${state}/${tool}`),
        lastmod,
      });
    });
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (entry) =>
          `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>`;

  return new NextResponse(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
