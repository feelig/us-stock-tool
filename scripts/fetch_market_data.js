const fs = require("fs");
const path = require("path");

const API_KEY = process.env.ALPHA_VANTAGE_KEY;
const symbols = ["SPY", "QQQ", "TLT", "GLD"];

function sma(values, n) {
  if (!Array.isArray(values) || values.length < n) return null;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  return sum / n;
}

function calc20dChange(closes) {
  if (!Array.isArray(closes) || closes.length < 21) return null;
  const today = closes[0];
  const d20 = closes[20];
  if (!Number.isFinite(today) || !Number.isFinite(d20) || d20 === 0) return null;
  return today / d20 - 1;
}

function ma200Position(closes) {
  if (!Array.isArray(closes) || closes.length < 200) return null;
  const today = closes[0];
  const ma200 = sma(closes.slice(0, 200), 200);
  if (!Number.isFinite(today) || !Number.isFinite(ma200)) return null;
  return { ma200, above: today >= ma200 };
}

function buildSignal(symbol, aboveMA200) {
  const s = String(symbol || "").toUpperCase();
  if (s === "SPY" || s === "QQQ") return aboveMA200 ? "Risk-on" : "Risk-off";
  if (s === "TLT") return aboveMA200 ? "Relief" : "Stress";
  if (s === "GLD") return aboveMA200 ? "Hedge" : "Neutral";
  return aboveMA200 ? "Supportive" : "Defensive";
}

function formatMa200Pos(pos) {
  if (!pos) return "Insufficient data";
  return pos.above ? "Above MA200" : "Below MA200";
}

function toInputsRow(symbol, closes) {
  const price = closes?.[0] ?? null;
  const chg20 = calc20dChange(closes);
  const pos = ma200Position(closes);
  const signal = buildSignal(symbol, pos ? pos.above : false);

  return {
    asset: symbol,
    price: Number.isFinite(price) ? Number(price) : null,
    change20d: Number.isFinite(chg20) ? Number(chg20) : null,
    ma200Pos: formatMa200Pos(pos),
    signal
  };
}

function allocationFromRiskLevel(riskLevel) {
  const v = String(riskLevel || "").toLowerCase();
  if (v === "low") return { equity: "60-80%", bonds: "10-25%", cash: "5-15%" };
  if (v === "high") return { equity: "20-40%", bonds: "30-50%", cash: "15-30%" };
  return { equity: "40-60%", bonds: "20-40%", cash: "10-20%" };
}

function driversFromInputs(inputsTable, riskLevel) {
  const tlt = (inputsTable || []).find(x => x.asset === "TLT");
  const spy = (inputsTable || []).find(x => x.asset === "SPY");
  const qqq = (inputsTable || []).find(x => x.asset === "QQQ");

  const out = [];
  if (spy?.ma200Pos === "Above MA200" && qqq?.ma200Pos === "Above MA200") {
    out.push("Long-term trend remains constructive (SPY/QQQ above MA200).");
  }
  if (tlt?.ma200Pos === "Below MA200") {
    out.push("Bond market pressure persists (TLT below MA200).");
  }
  const lvl = String(riskLevel || "").toLowerCase();
  if (lvl === "neutral" || lvl === "medium") {
    out.push("Risk regime is balanced: neither strong risk-on nor risk-off dominance.");
  }
  if (out.length === 0) out.push("No dominant driver detected; conditions appear mixed.");
  return out.slice(0, 3);
}

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

function buildComponents(inputsTable) {
  const spy = (inputsTable || []).find(x => x.asset === "SPY");
  const qqq = (inputsTable || []).find(x => x.asset === "QQQ");
  const tlt = (inputsTable || []).find(x => x.asset === "TLT");
  const gld = (inputsTable || []).find(x => x.asset === "GLD");

  const trend = (spy?.ma200Pos === "Above MA200" && qqq?.ma200Pos === "Above MA200") ? 25 : 75;
  const stress = (tlt?.ma200Pos === "Below MA200") ? 75 : 25;
  const regime = (gld?.ma200Pos === "Above MA200") ? 50 : 25;

  return { trend, stress, regime };
}

function buildOutlook(riskLevel) {
  const v = String(riskLevel || "").toLowerCase();
  if (v === "high") {
    return {
      baseCase: "Defensive posture remains appropriate while risk stays elevated.",
      upsideTrigger: "Risk regime improves with equities reclaiming MA200.",
      downsideTrigger: "Risk intensifies if bonds remain under pressure.",
    };
  }
  if (v === "low") {
    return {
      baseCase: "Risk environment supportive; maintain disciplined exposure.",
      upsideTrigger: "Sustained trend strength in SPY/QQQ above MA200.",
      downsideTrigger: "Bond stress returning or equity trend breaks MA200.",
    };
  }
  return {
    baseCase: "Balanced regime; keep allocations within neutral ranges.",
    upsideTrigger: "Risk-on tilt if SPY/QQQ hold above MA200.",
    downsideTrigger: "Defensive shift if bond stress persists or trend breaks.",
  };
}

function buildResponsePlan(riskLevel) {
  const v = String(riskLevel || "").toLowerCase();
  if (v === "high") {
    return [
      "Reduce equity exposure toward the lower end of the range.",
      "Increase diversification with higher-quality bonds/cash buffers.",
      "Avoid aggressive risk-on trades; focus on capital preservation.",
    ];
  }
  if (v === "low") {
    return [
      "Maintain equity exposure within the upper end of the range.",
      "Keep rebalancing discipline; avoid leverage.",
      "Monitor regime shifts weekly, not daily.",
    ];
  }
  return [
    "Stay within the neutral allocation band.",
    "Rebalance only if regime changes, not on noise.",
    "Track trend + bond stress for confirmation.",
  ];
}

async function main() {
  const market = {};

  for (const s of symbols) {
    market[s] = await fetchDailyWithRetry(s);
    await sleep(15000);
  }

  const mri = calculateMRI(market);
  const riskLevel = mri < 35 ? "low" : mri < 65 ? "neutral" : "high";
  const alloc = allocationFromRiskLevel(riskLevel);
  const inputsTable = symbols.map(sym => {
    const closes = (market[sym] || []).map(p => p.close);
    return toInputsRow(sym, closes);
  });
  const components = buildComponents(inputsTable);
  const outlook = buildOutlook(riskLevel);
  const responsePlan = buildResponsePlan(riskLevel);

  const output = {
    date: new Date().toISOString().slice(0, 10),
    mri,
    riskLevel,
    equityRange: alloc.equity,
    bondsRange: alloc.bonds,
    cashRange: alloc.cash,
    inputsTable,
    components,
    drivers: driversFromInputs(inputsTable, riskLevel),
    outlook,
    responsePlan
  };

  const outPathA = path.join(process.cwd(), "public", "latest.json");
  const outPathB = path.join(process.cwd(), "public", "data", "latest.json");
  fs.mkdirSync(path.dirname(outPathB), { recursive: true });
  fs.writeFileSync(outPathA, JSON.stringify(output, null, 2));
  fs.writeFileSync(outPathB, JSON.stringify(output, null, 2));

  console.log("MRI generated:", output);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
