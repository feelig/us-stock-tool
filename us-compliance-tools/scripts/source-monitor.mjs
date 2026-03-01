import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "states");
const REPORT_DIR = path.join(ROOT, "reports");
const BASELINE_PATH = path.join(ROOT, ".source-monitor-baseline.json");

const TIMEOUT_MS = 20000;
const MAX_BYTES = 200_000;
const BODY_SLICE = 80_000;

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeReadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "finlogichub5-source-monitor/1.0",
      },
    });

    const reader = res.body?.getReader();
    let bytes = 0;
    const chunks = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        chunks.push(value);
        if (bytes >= MAX_BYTES) break;
      }
    }

    const bodyBuf = chunks.length
      ? Buffer.concat(chunks.map((u) => Buffer.from(u)))
      : Buffer.from("");
    const bodyStr = bodyBuf.toString("utf-8");
    const bodyHead = bodyStr.slice(0, BODY_SLICE);

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      contentType: res.headers.get("content-type"),
      bodyHash: sha256(bodyHead),
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(t);
  }
}

function listStateFiles() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(DATA_DIR, f));
}

function collectSources() {
  const files = listStateFiles();
  const items = [];

  for (const file of files) {
    const raw = safeReadJson(file, null);
    if (!raw) continue;

    const state = raw.state ?? path.basename(file, ".json");
    const sources = Array.isArray(raw.sources) ? raw.sources : [];
    for (const url of sources) {
      if (typeof url === "string" && url.startsWith("http")) {
        items.push({ state, file: path.relative(ROOT, file), url });
      }
    }
  }

  const seen = new Set();
  return items.filter((x) => {
    const k = `${x.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function diffBaseline(prev, curr) {
  const changes = [];
  const prevMap = new Map(Object.entries(prev ?? {}));

  for (const [url, now] of Object.entries(curr)) {
    const before = prevMap.get(url);
    if (!before) {
      changes.push({ url, type: "NEW", before: null, after: now });
      continue;
    }
    const fields = ["status", "etag", "lastModified", "bodyHash", "finalUrl"];
    const changed = fields.some((k) => (before?.[k] ?? null) !== (now?.[k] ?? null));
    if (changed) changes.push({ url, type: "CHANGED", before, after: now });
    prevMap.delete(url);
  }

  for (const [url, before] of prevMap.entries()) {
    changes.push({ url, type: "REMOVED", before, after: null });
  }

  return changes;
}

function toMarkdown(changes, meta) {
  const lines = [];
  lines.push(`# Source Monitor Report`);
  lines.push(`- Run at: ${meta.runAt}`);
  lines.push(`- Total sources checked: ${meta.total}`);
  lines.push(`- Changes detected: ${changes.length}`);
  lines.push("");

  if (changes.length === 0) {
    lines.push(`✅ No changes detected.`);
    return lines.join("\n");
  }

  lines.push(`## Changes`);
  for (const c of changes) {
    lines.push(`### ${c.type}: ${c.url}`);
    if (c.before) {
      lines.push(`- before.status: ${c.before.status}`);
      lines.push(`- before.etag: ${c.before.etag ?? "null"}`);
      lines.push(`- before.lastModified: ${c.before.lastModified ?? "null"}`);
      lines.push(`- before.bodyHash: ${c.before.bodyHash}`);
      lines.push(`- before.finalUrl: ${c.before.finalUrl ?? c.url}`);
    }
    if (c.after) {
      lines.push(`- after.status: ${c.after.status}`);
      lines.push(`- after.etag: ${c.after.etag ?? "null"}`);
      lines.push(`- after.lastModified: ${c.after.lastModified ?? "null"}`);
      lines.push(`- after.bodyHash: ${c.after.bodyHash}`);
      lines.push(`- after.finalUrl: ${c.after.finalUrl ?? c.url}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  ensureDir(REPORT_DIR);

  const sources = collectSources();
  const baseline = safeReadJson(BASELINE_PATH, {});
  const current = {};

  const results = [];
  for (const s of sources) {
    try {
      const r = await fetchWithTimeout(s.url);
      results.push({ ...s, ...r });
      current[s.url] = {
        status: r.status,
        etag: r.etag ?? null,
        lastModified: r.lastModified ?? null,
        bodyHash: r.bodyHash,
        finalUrl: r.finalUrl ?? s.url,
      };
    } catch (e) {
      const err = String(e?.name || e?.message || e);
      results.push({
        ...s,
        ok: false,
        status: 0,
        finalUrl: s.url,
        etag: null,
        lastModified: null,
        contentType: null,
        bodyHash: sha256("ERROR:" + err),
        checkedAt: new Date().toISOString(),
        error: err,
      });
      current[s.url] = {
        status: 0,
        etag: null,
        lastModified: null,
        bodyHash: sha256("ERROR:" + err),
        finalUrl: s.url,
      };
    }
  }

  const changes = diffBaseline(baseline, current);
  const meta = { runAt: new Date().toISOString(), total: sources.length };

  fs.writeFileSync(
    path.join(REPORT_DIR, "source-monitor.json"),
    JSON.stringify({ meta, changes, results }, null, 2)
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "source-monitor.md"),
    toMarkdown(changes, meta)
  );

  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2));

  if (changes.length > 0) {
    console.warn(`Changes detected: ${changes.length}`);
    process.exit(1);
  }

  console.log("No changes detected.");
}

await main();
