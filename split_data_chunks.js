const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();
const sourcePath = path.join(root, "data.js");
const outDir = path.join(root, "data", "tickers");

if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source not found: ${sourcePath}`);
}

const raw = fs.readFileSync(sourcePath, "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${raw}\nthis.__OUT__ = STOCK_HISTORICAL_DATA;`, sandbox, { timeout: 20000 });
const data = sandbox.__OUT__;

if (!data || typeof data !== "object") {
    throw new Error("Failed to parse STOCK_HISTORICAL_DATA from data.js");
}

fs.mkdirSync(outDir, { recursive: true });

for (const [ticker, payload] of Object.entries(data)) {
    const key = String(ticker || "").trim().toUpperCase();
    if (!key) continue;
    const body = `__registerStockChunk(${JSON.stringify(key)}, ${JSON.stringify(payload)});\n`;
    fs.writeFileSync(path.join(outDir, `${key}.js`), body, "utf8");
}

const tickers = Object.keys(data).map(t => t.toUpperCase()).sort();
console.log(`Generated ${tickers.length} ticker chunks.`);
console.log(tickers.join(","));

