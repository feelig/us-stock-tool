import { readdir, readFile } from "fs/promises";
import path from "path";
import { normalizeStateData } from "../core/stateSchema";

export type StateSummary = {
  stateName: string;
  stateSlug: string;
};

export async function loadStates(): Promise<StateSummary[]> {
  const statesDir = path.join(process.cwd(), "data", "states");
  const files = await readdir(statesDir);
  const slugs = files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""));

  const states = await Promise.all(
    slugs.map(async (slug) => {
      const filePath = path.join(statesDir, `${slug}.json`);
      const raw = await readFile(filePath, "utf8");
      const data = normalizeStateData(JSON.parse(raw));
      const stateName =
        data.state ??
        slug
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
      return { stateName, stateSlug: slug };
    })
  );

  return states.sort((a, b) => a.stateName.localeCompare(b.stateName));
}
