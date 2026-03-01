import { readdir, readFile } from "fs/promises";
import path from "path";

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
      const data = JSON.parse(raw) as StateSummary;
      return { stateName: data.stateName, stateSlug: data.stateSlug };
    })
  );

  return states.sort((a, b) => a.stateName.localeCompare(b.stateName));
}
