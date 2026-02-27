const fs = require("fs");
const path = require("path");

const API_KEY = process.env.ALPHA_VANTAGE_KEY;
const symbols = ["SPY", "QQQ", "TLT", "GLD"];

async function fetchDaily(symbol) {
  if (!API_KEY) {
    throw new Error("Missing ALPHA_VANTAGE_KEY");
  }
  const { default: fetch } = await import("node-fetch");
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${symbol}`);
  }
  const data = await res.json();
  const series = data["Time Series (Daily)"];
  if (!series) {
    const note = data["Note"] || data["Error Message"] || "No data";
    throw new Error(`No data for ${symbol}: ${note}`);
  }
  const prices = Object.entries(series)
    .slice(0, 250)
    .map(([date, v]) => ({
      date,
      close: Number(v["5. adjusted close"])
    }));

  return prices;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function movingAverage(data, n) {
  const slice = data.slice(0, n);
  return slice.reduce((a, b) => a + b.close, 0) / n;
}

function calculateMRI(market) {
  const spyMA200 = movingAverage(market.SPY, 200);
  const spyLatest = market.SPY[0].close;

  let score = 50;

  if (spyLatest > spyMA200) score -= 10;
  else score += 10;

  return Math.max(0, Math.min(100, score));
}

async function main() {
  const market = {};

  for (const s of symbols) {
    market[s] = await fetchDaily(s);
    await sleep(15000);
  }

  const mri = calculateMRI(market);
  const output = {
    date: new Date().toISOString().slice(0, 10),
    mri,
    riskLevel: mri < 35 ? "low" : mri < 65 ? "neutral" : "high",
    equityRange: mri < 35 ? "60-80%" : mri < 65 ? "40-60%" : "20-40%"
  };

  const outPath = path.join(process.cwd(), "public", "data", "latest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log("MRI generated:", output);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
