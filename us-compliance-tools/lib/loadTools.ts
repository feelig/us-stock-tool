import { readFile } from "fs/promises";
import path from "path";

export type ToolDefinition = {
  toolSlug: string;
  titleTemplate: string;
  descriptionTemplate: string;
  category: string;
  faq: Array<Record<string, unknown>>;
  allowedStates?: string[];
  relatedToolSlugs: string[];
};

export async function loadTools(): Promise<ToolDefinition[]> {
  const filePath = path.join(process.cwd(), "data", "tools.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as ToolDefinition[];
}
