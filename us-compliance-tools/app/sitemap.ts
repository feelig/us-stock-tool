import type { MetadataRoute } from "next";
import { readdir, readFile } from "fs/promises";
import path from "path";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finlogichub5.com";

type ToolDefinition = {
  toolSlug: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/tools`, lastModified: now },
  ];

  const statesDir = path.join(process.cwd(), "data", "states");
  const stateFiles = await readdir(statesDir);
  const states = stateFiles
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\\.json$/, ""));

  const toolsPath = path.join(process.cwd(), "data", "tools.json");
  const toolsRaw = await readFile(toolsPath, "utf8");
  const tools = JSON.parse(toolsRaw) as ToolDefinition[];
  const toolSlugs = tools.map((tool) => tool.toolSlug);

  states.forEach((state) => {
    toolSlugs.forEach((tool) => {
      entries.push({
        url: `${siteUrl}/tools/${state}/${tool}`,
        lastModified: now,
      });
    });
  });

  return entries;
}
