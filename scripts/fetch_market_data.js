const fs = require("fs");
const path = require("path");

const API_KEY = process.env.ALPHA_VANTAGE_KEY;
const symbols = ["SPY", "QQQ", "TLT", "GLD"];

async function fetchDaily(symbol) {
  if (!API_KEY) throw new Error("Missing ALPHA_VANTAGE_KEY");

  const { default: fetch } = await import("node-fetch");
  const url =
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY` +
    `&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  const err =
    data["Error Message"] ||
    data["Note"] ||
    data["Information"] ||
    null;

  if (err) {
    throw new Error(`Alpha response for ${symbol}: ${err}`);
  }

  const series = data["Time Series (Daily)"];
  if (!series) {
    throw new Error(
      `No time series for ${symbol}. Response keys: ${Object.keys(data).join(", ")}`
    );
  }

  const prices = Object.entries(series)
    .slice(0, 250)
    .map(([date, v]) => ({
      date,
      close: Number(v["4. close"])
    }));

  if (!prices.length) throw new Error(`No price rows for ${symbol}`);

  return prices;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchDailyWithRetry(symbol, tries = 5) {
  let wait = 15000;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fetchDaily(symbol);
    } catch (e) {
      const msg = String(e?.message || e);
      const retryable =
        msg.includes("Alpha response") &&
        (msg.includes("frequency") ||
          msg.includes("Thank you") ||
          msg.includes("higher API call") ||
          msg.includes("Note") ||
          msg.includes("Information"));

      if (!retryable || i === tries) throw e;

      console.warn(`Retry ${i}/${tries} for ${symbol}: ${msg}`);
      console.warn(`Sleeping ${Math.round(wait / 1000)}s...`);
      await sleep(wait);
      wait = Math.min(wait * 2, 120000);
    }
  }
  throw new Error(`Failed after retries: ${symbol}`);
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
    market[s] = await fetchDailyWithRetry(s);
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
