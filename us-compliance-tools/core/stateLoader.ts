import fs from "fs";
import path from "path";

export function getStateData(state: string) {
  const filePath = path.join(process.cwd(), "data/states", `${state}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`State data not found: ${state}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
