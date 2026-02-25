const assert = require("assert");

const KNOWN_TICKERS = ["NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "SPY"];

function calcDailyReturns(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    if (prev > 0) out.push((cur - prev) / prev);
  }
  return out;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}

function stdDev(arr, avg) {
  if (arr.length < 2) return 0;
  const m = avg ?? mean(arr);
  const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function calcWorstMdd(series) {
  let maxP = 0;
  let mdd = 0;
  series.forEach((p) => {
    if (p > maxP) maxP = p;
    const dd = (p - maxP) / maxP;
    if (dd < mdd) mdd = dd;
  });
  return mdd * 100;
}

function updateStatsLite(data, labels, cap) {
  const sP = data[0];
  const eP = data[data.length - 1];
  const mult = eP / sP;
  const yrs = labels.length / 252;
  const cagr = (Math.pow(mult, 1 / (yrs > 0 ? yrs : 1)) - 1) * 100;
  const mdd = calcWorstMdd(data);
  const finalValue = Math.round(cap * mult);
  const returns = calcDailyReturns(data);
  const avg = mean(returns);
  const stdev = stdDev(returns, avg);
  return { cagr, mdd, finalValue, annualVol: stdev * Math.sqrt(252) * 100 };
}

function weekBucket(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const day = Math.floor((d - onejan) / 86400000);
  const week = Math.floor((day + onejan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function simulateDca(labels, prices, unit, freq, mode) {
  if (!Array.isArray(labels) || !Array.isArray(prices) || !labels.length || labels.length !== prices.length) return null;
  let shares = 0;
  let invested = 0;
  const interval = freq === "biweekly" ? 2 : 1;
  let lastPeriodKey = null;
  let periodIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    const p = prices[i];
    if (!Number.isFinite(p) || p <= 0) continue;
    const key = freq === "monthly" ? labels[i].slice(0, 7) : weekBucket(labels[i]);
    const isPeriodStart = key !== lastPeriodKey;
    if (isPeriodStart) {
      periodIndex += 1;
      lastPeriodKey = key;
    }
    const shouldBuy = isPeriodStart && (periodIndex % interval === 0);
    if (shouldBuy) {
      if (mode === "fixed_shares") {
        shares += unit;
        invested += unit * p;
      } else {
        shares += unit / p;
        invested += unit;
      }
    }
  }
  if (invested <= 0) return null;
  return { invested, finalValue: shares * prices[prices.length - 1] };
}

function validateAnalysisInput(ticker, compareTicker, cap) {
  if (!KNOWN_TICKERS.includes(ticker)) return { ok: false, code: "invalid_ticker" };
  if (compareTicker !== "none" && !KNOWN_TICKERS.includes(compareTicker)) return { ok: false, code: "invalid_compare_ticker" };
  if (!Number.isFinite(cap) || cap <= 0) return { ok: false, code: "invalid_capital" };
  return { ok: true };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

test("CAGR should be around 100% when value doubles in ~1 trading year", () => {
  const labels = Array.from({ length: 252 }, (_, i) => `2024-01-${String((i % 28) + 1).padStart(2, "0")}`);
  const data = Array.from({ length: 252 }, (_, i) => 100 + (100 * i) / 251);
  const stats = updateStatsLite(data, labels, 10000);
  assert(Math.abs(stats.cagr - 100) < 1.2, `cagr=${stats.cagr}`);
});

test("MDD should be -25% for 120 -> 90 drawdown", () => {
  const mdd = calcWorstMdd([100, 120, 90, 95, 130]);
  assert(Math.abs(mdd + 25) < 1e-9, `mdd=${mdd}`);
});

test("Monthly DCA should buy once per month", () => {
  const labels = ["2024-01-02", "2024-01-05", "2024-02-01", "2024-02-20", "2024-03-01"];
  const prices = [10, 10, 10, 10, 10];
  const out = simulateDca(labels, prices, 100, "monthly", "fixed_amount");
  assert(out, "dca output is null");
  assert.strictEqual(out.invested, 300);
  assert.strictEqual(out.finalValue, 300);
});

test("Biweekly DCA should run every 2 weeks from the first buy", () => {
  const labels = ["2024-01-02", "2024-01-09", "2024-01-16", "2024-01-23"];
  const prices = [10, 10, 10, 10];
  const out = simulateDca(labels, prices, 100, "biweekly", "fixed_amount");
  assert(out, "dca output is null");
  assert.strictEqual(out.invested, 200);
  assert.strictEqual(out.finalValue, 200);
});

test("Input validator should reject invalid capital and ticker", () => {
  assert.deepStrictEqual(validateAnalysisInput("NVDA", "SPY", 10000), { ok: true });
  assert.strictEqual(validateAnalysisInput("BAD", "SPY", 10000).code, "invalid_ticker");
  assert.strictEqual(validateAnalysisInput("NVDA", "BAD", 10000).code, "invalid_compare_ticker");
  assert.strictEqual(validateAnalysisInput("NVDA", "SPY", 0).code, "invalid_capital");
});

console.log("All 5 core tests passed.");
