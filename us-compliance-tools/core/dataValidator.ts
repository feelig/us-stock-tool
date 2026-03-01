import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data", "states");

function warn(message: string) {
  console.warn(`[state-data] ${message}`);
}

function toTitleCase(slug: string) {
  return slug
    .replace(/\.json$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function validateStateDataFile(filePath: string) {
  const filename = path.basename(filePath);
  const expectedStateName = toTitleCase(filename);

  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    warn(`Failed to read ${filename}: ${(error as Error).message}`);
    return;
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    warn(`Invalid JSON in ${filename}: ${(error as Error).message}`);
    return;
  }

  if (!data?.state) {
    warn(`${filename}: missing required field "state".`);
  } else if (data.state !== expectedStateName) {
    warn(`${filename}: state "${data.state}" does not match filename (${expectedStateName}).`);
  }

  if (!data?.updated_at) {
    warn(`${filename}: missing required field "updated_at".`);
  }

  if (!Array.isArray(data?.sources) || data.sources.length === 0) {
    warn(`${filename}: "sources" must be a non-empty array.`);
  }
}

export function validateAllStateData() {
  if (!fs.existsSync(STATE_DIR)) {
    warn(`State directory not found: ${STATE_DIR}`);
    return;
  }

  const files = fs.readdirSync(STATE_DIR).filter((file) => file.endsWith(".json"));

  if (files.length === 0) {
    warn(`No state JSON files found in ${STATE_DIR}.`);
    return;
  }

  files.forEach((file) => {
    validateStateDataFile(path.join(STATE_DIR, file));
  });
}
