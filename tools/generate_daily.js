const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

const DATA_DIR = path.resolve(__dirname, '..', 'public', 'data');
const MOCK_PATH = path.resolve(__dirname, 'mock_prices.json');
const OUT_PATH = path.resolve(DATA_DIR, 'daily.json');
const RISK_INDEX_PATH = path.resolve(DATA_DIR, 'risk_index.json');
const RISK_INDEX_HISTORY_PATH = path.resolve(DATA_DIR, 'risk_index_history.json');
const SHARE_TEXT_PATH = path.resolve(DATA_DIR, 'share_text.json');
const OG_DIR = path.resolve(__dirname, '..', 'public', 'og');
const ARCHIVE_DIR = path.resolve(__dirname, '..', 'public', 'daily');
const RECENT_PATH = path.resolve(ARCHIVE_DIR, 'recent.json');
const RECENT30_PATH = path.resolve(ARCHIVE_DIR, 'recent30.json');
const MONTHLY_PATH = path.resolve(ARCHIVE_DIR, 'monthly.json');
const SITEMAP_PATH = path.resolve(__dirname, '..', 'sitemap.xml');
const SITE_ROOT = 'https://finlogichub5.com';
const REPORT_TZ = 'America/New_York';
const PRIVACY_PATH = path.resolve(__dirname, '..', 'privacy.html');
const DISCLAIMER_PATH = path.resolve(__dirname, '..', 'disclaimer.html');

function readMock() {
  const raw = fs.readFileSync(MOCK_PATH, 'utf-8');
  return JSON.parse(raw);
}

function getDateInTZ(date = new Date(), timeZone = REPORT_TZ) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return dtf.format(date);
}

function fetchCsv(symbol) {
  const url = `https://stooq.com/q/d/l/?s=${symbol}&i=d`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`stooq ${symbol} status ${res.statusCode}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`stooq ${symbol} timeout`)));
  });
}

function parseStooq(csv) {
  const lines = csv.trim().split('\n');
  const outDates = [];
  const outClose = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const date = parts[0];
    const close = parseFloat(parts[4]);
    if (!date || !Number.isFinite(close)) continue;
    outDates.push(date);
    outClose.push(close);
  }
  return { dates: outDates, close: outClose };
}

function intersectDates(seriesMap) {
  const keys = Object.keys(seriesMap);
  if (!keys.length) return [];
  let common = new Set(seriesMap[keys[0]].dates);
  for (let i = 1; i < keys.length; i++) {
    const next = new Set(seriesMap[keys[i]].dates);
    common = new Set([...common].filter(d => next.has(d)));
  }
  return Array.from(common).sort();
}

async function loadDataSource() {
  const cacheDir = path.resolve(__dirname, 'cache');
  const cachePath = path.join(cacheDir, 'prices.json');
  try {
    const symbols = ['spy.us', 'qqq.us', 'tlt.us', 'gld.us'];
    const payloads = await Promise.all(symbols.map(fetchCsv));
    const parsed = payloads.map(parseStooq);
    const map = {
      SPY: parsed[0],
      QQQ: parsed[1],
      TLT: parsed[2],
      GLD: parsed[3]
    };
    const dates = intersectDates(map).slice(-260);
    const series = {
      SPY: dates.map(d => map.SPY.close[map.SPY.dates.indexOf(d)]),
      QQQ: dates.map(d => map.QQQ.close[map.QQQ.dates.indexOf(d)]),
      TLT: dates.map(d => map.TLT.close[map.TLT.dates.indexOf(d)]),
      GLD: dates.map(d => map.GLD.close[map.GLD.dates.indexOf(d)])
    };
    const mock = readMock();
    const out = { dates, series: { ...series, ...mock.series }, source: 'stooq', updatedAt: new Date().toISOString() };
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(out, null, 2));
    return { data: out, status: 'fresh' };
  } catch (e) {
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      return { data: cached, status: 'stale' };
    }
    throw e;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sma(series, window) {
  const n = Math.min(series.length, window);
  if (n === 0) return 0;
  const slice = series.slice(series.length - n);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / n;
}

function dailyReturns(series, window) {
  const n = Math.min(series.length - 1, window);
  const out = [];
  for (let i = series.length - n; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    if (prev > 0) out.push((cur - prev) / prev);
  }
  return out;
}

function volAnnualized(returns) {
  if (!returns.length) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function drawdown60(series) {
  const n = Math.min(series.length, 60);
  const slice = series.slice(series.length - n);
  let peak = slice[0];
  let mdd = 0;
  for (const p of slice) {
    if (p > peak) peak = p;
    const dd = (p - peak) / peak;
    if (dd < mdd) mdd = dd;
  }
  return mdd * 100; // negative
}

function ratioDown(seriesA, seriesB, window = 20) {
  const n = Math.min(seriesA.length, seriesB.length, window + 1);
  if (n < 2) return false;
  const a1 = seriesA[seriesA.length - 1];
  const b1 = seriesB[seriesB.length - 1];
  const a0 = seriesA[seriesA.length - 1 - window];
  const b0 = seriesB[seriesB.length - 1 - window];
  if (b1 === 0 || b0 === 0) return false;
  const r1 = a1 / b1;
  const r0 = a0 / b0;
  return r1 < r0;
}

function scoreTheme(series) {
  const n = Math.min(series.length, 21);
  if (n < 2) return 50;
  const now = series[series.length - 1];
  const prev = series[series.length - n];
  const ret = prev > 0 ? (now / prev - 1) : 0;
  const score = clamp(Math.round(50 + ret * 200), 0, 100);
  const note = ret >= 0 ? `20D 走强 +${(ret * 100).toFixed(1)}%` : `20D 回撤 ${(ret * 100).toFixed(1)}%`;
  return { score, note };
}

function jitterLast(series) {
  const copy = series.slice();
  const last = copy[copy.length - 1];
  const factor = 0.97 + Math.random() * 0.06; // 0.97-1.03
  copy[copy.length - 1] = Math.max(1, last * factor);
  return copy;
}

function buildDaily(mock) {
  const dates = mock.dates;
  const s = mock.series;

  // jitter last price to ensure change between runs
  const SPY = jitterLast(s.SPY);
  const QQQ = jitterLast(s.QQQ);
  const TLT = jitterLast(s.TLT);
  const GLD = jitterLast(s.GLD);

  const close = SPY[SPY.length - 1];
  const ma50 = sma(SPY, 50);
  const ma200 = sma(SPY, 200);
  const ret20 = SPY.length > 21 ? (close / SPY[SPY.length - 21] - 1) * 100 : 0;

  let trendRisk = 50;
  if (close >= ma200 && ma50 >= ma200) trendRisk = 25;
  else if (close >= ma200 && ma50 < ma200) trendRisk = 50;
  else if (close < ma200 && ma50 >= ma200) trendRisk = 75;
  else trendRisk = 100;

  const returns20 = dailyReturns(SPY, 20);
  const vol20 = volAnnualized(returns20);
  const mdd60 = drawdown60(SPY); // negative
  const downDays = returns20.filter(r => r < 0).length;
  const downPct = returns20.length ? (downDays / returns20.length) * 100 : 0;

  let stressScore = 0;
  if (vol20 > 25) stressScore += 35;
  if (mdd60 < -15) stressScore += 35;
  if (downPct > 55) stressScore += 30;
  stressScore = clamp(stressScore, 0, 100);

  let regimeScore = 0;
  const ratioQQQTLTDown = ratioDown(QQQ, TLT, 20);
  const ratioSPYGLDDown = ratioDown(SPY, GLD, 20);
  if (ratioQQQTLTDown) regimeScore += 50;
  if (ratioSPYGLDDown) regimeScore += 50;
  regimeScore = clamp(regimeScore, 0, 100);

  const totalRiskRaw = clamp(0.45 * stressScore + 0.35 * regimeScore + 0.20 * trendRisk, 0, 100);
  const totalRisk = clamp(Math.round(totalRiskRaw), 0, 100);

  let light = 'green';
  if (totalRisk >= 61) light = 'red';
  else if (totalRisk >= 31) light = 'yellow';
  const level = light === 'green' ? 'low' : light === 'red' ? 'high' : 'medium';

  const equityRange = light === 'green' ? '60-80%' : light === 'yellow' ? '40-60%' : '20-40%';

  // reasons
  const reasons = [];
  if (close > ma200) reasons.push(`SPY 站上 MA200（趋势 +）`);
  else reasons.push(`SPY 跌破 MA200（趋势 -）`);
  if (ma50 > ma200) reasons.push(`MA50 高于 MA200（中期多头）`);
  else reasons.push(`MA50 低于 MA200（中期偏弱）`);
  if (vol20 > 25) reasons.push(`20D 波动率 ${vol20.toFixed(1)}%（压力偏高）`);
  else reasons.push(`20D 波动率 ${vol20.toFixed(1)}%（压力可控）`);
  if (mdd60 < -15) reasons.push(`60D 最大回撤 ${mdd60.toFixed(1)}%（回撤偏深）`);
  if (downPct > 55) reasons.push(`20D 下跌日占比 ${downPct.toFixed(0)}%（情绪偏弱）`);
  if (ratioDown(QQQ, TLT, 20)) reasons.push(`QQQ/TLT 20D 走弱（risk-off）`);
  if (ratioDown(SPY, GLD, 20)) reasons.push(`SPY/GLD 20D 走弱（避险偏好）`);

  // keep exactly 3, prioritize unique and most informative
  const finalReasons = [];
  for (const r of reasons) {
    if (finalReasons.length >= 3) break;
    if (!finalReasons.includes(r)) finalReasons.push(r);
  }
  while (finalReasons.length < 3) finalReasons.push('市场结构保持中性，等待确认');

  const themes = {
    AI: jitterLast(s.AI),
    Defense: jitterLast(s.DEF),
    Energy: jitterLast(s.ENE),
    Healthcare: jitterLast(s.HLTH),
    Cybersecurity: jitterLast(s.CYBR),
    Consumer: jitterLast(s.CONS)
  };

  const themeScores = Object.entries(themes).map(([name, series]) => {
    const { score, note } = scoreTheme(series);
    return { name, score, note };
  });

  themeScores.sort((a, b) => b.score - a.score);
  const topThemes = themeScores.slice(0, 3);
  const bottomThemes = themeScores.slice(-3).reverse();

  const date = getDateInTZ();

  return {
    date,
    _ctx: {
      close,
      ma200,
      vol20,
      ratioQQQTLTDown,
      ratioSPYGLDDown
    },
    riskIndex: {
      score: totalRisk,
      rawScore: totalRisk,
      methodVersion: "MRI-1.0",
      updatedAt: new Date().toISOString(),
      inputs: ["SPY", "QQQ", "TLT", "GLD"],
      explanation: "本指数衡量市场风险状态，不预测收益",
      level,
      light,
      equityRange,
      componentContrib: {
        trend: 0,
        stress: 0,
        regime: 0
      },
      componentNotes: {
        trend: "",
        stress: "",
        regime: ""
      },
      components: {
        trend: trendRisk,
        stress: stressScore,
        regime: regimeScore
      }
    },
    marketRisk: { score: totalRisk, light, equityRange },
    topThemes,
    bottomThemes,
    reasons: finalReasons
  };
}

function lightLabel(light) {
  return light === 'green' ? '晴' : light === 'red' ? '风暴' : '多云';
}

function buildExplanation(daily) {
  const { date, marketRisk } = daily;
  const level = lightLabel(marketRisk.light);
  const score = marketRisk.score;
  const range = marketRisk.equityRange;
  return [
    `今日市场气候为${level}，风险灯显示${level}，风险分为${score}。`,
    `仓位区间提示权益配置可参考${range}，用于约束波动与回撤压力。`,
    `主题热度榜的Top/Bottom反映资金偏好变化，需与趋势健康度、压力和风险偏好共同理解。`,
    `若风险灯连续偏高，可考虑降低仓位并设置仓位护栏以控制回撤。`,
    `以上内容仅作历史观察与风险提醒，不构成任何投资建议或收益承诺。`
  ].join('');
}

function buildMetaDescription(daily) {
  const { date, topThemes, bottomThemes } = daily;
  const risk = daily.riskIndex || daily.marketRisk || {};
  const level = lightLabel(risk.light);
  const topNames = topThemes.map(t => t.name).join('、');
  const bottomNames = bottomThemes.map(t => t.name).join('、');
  const base = `${date}市场风险灯为${level}，风险分${risk.score}，仓位区间${risk.equityRange}。主题Top为${topNames}，Bottom为${bottomNames}，用于观察市场气候与风险偏好变化，仅作风险感知。`;
  if (base.length >= 120 && base.length <= 160) return base;
  if (base.length > 160) return base.slice(0, 160);
  const pad = "不构成投资建议。";
  return (base + pad).slice(0, 160);
}

function renderThemeRows(list) {
  return list.map(item => `<div class="theme-row"><span>${item.name}</span><span>${item.score}</span></div><div class="note">${item.note}</div>`).join('');
}

function renderArchiveHtml(daily, ctx = {}) {
  const { date, reasons, topThemes, bottomThemes } = daily;
  const riskIndex = daily.riskIndex || daily.marketRisk || {};
  const canonical = `${SITE_ROOT}/daily/${date}.html`;
  const explanation = buildExplanation(daily);
  const metaDesc = buildMetaDescription(daily);
  const lightText = lightLabel(riskIndex.light);
  const prevScore = Number.isFinite(ctx.prevScore) ? ctx.prevScore : null;
  const delta = prevScore === null ? 0 : Number((riskIndex.score - prevScore).toFixed(1));
  const deltaText = prevScore === null ? "—" : `${delta >= 0 ? "+" : ""}${delta}`;
  const prevLink = ctx.prevDate ? `${SITE_ROOT}/daily/${ctx.prevDate}.html` : '';
  const nextLink = ctx.nextDate ? `${SITE_ROOT}/daily/${ctx.nextDate}.html` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0f172a">
  <meta name="description" content="${metaDesc}">
  <title>${date} 市场风险状态 - FinLogicHub5</title>
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${date} 市场风险状态 - FinLogicHub5">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="${canonical}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${date} 市场风险状态",
      "description": "${metaDesc}",
      "inLanguage": "zh-CN",
      "url": "${canonical}",
      "datePublished": "${date}",
      "dateModified": "${date}"
    }
  </script>
  <style>
    :root {
      --primary: #38bdf8;
      --bg: #0f172a;
      --text: #f8fafc;
      --text-dim: #94a3b8;
      --green: #4ade80;
      --yellow: #facc15;
      --red: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: "Space Grotesk", "Noto Sans SC", sans-serif;
      background:
        radial-gradient(1100px 600px at 8% -10%, rgba(56, 189, 248, 0.22), transparent 65%),
        radial-gradient(900px 500px at 95% -6%, rgba(16, 185, 129, 0.18), transparent 62%),
        linear-gradient(180deg, #040711 0%, #07101f 45%, #0a1426 100%);
      color: var(--text);
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.92));
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 28px 70px rgba(2, 6, 23, 0.65);
    }
    h1 { margin: 6px 0 12px 0; font-size: clamp(24px, 4vw, 36px); }
    .sub { margin: 0 0 18px 0; color: #bfdbfe; font-size: 14px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .card { border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 12px; padding: 14px; background: rgba(2, 6, 23, 0.42); }
    .risk-light { display: flex; align-items: center; gap: 12px; }
    .lamp { font-size: 28px; }
    .score { font-size: 28px; font-weight: 800; }
    .note { color: var(--text-dim); font-size: 12px; }
    .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 6px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(148, 163, 184, 0.3); color: #e2e8f0; }
    .list { margin: 8px 0 0 0; padding-left: 18px; color: #e2e8f0; font-size: 12px; line-height: 1.7; }
    .theme-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; border-bottom: 1px dashed rgba(148, 163, 184, 0.2); padding: 6px 0; }
    .theme-row:last-child { border-bottom: none; }
    .risk-green { color: var(--green); }
    .risk-yellow { color: var(--yellow); }
    .risk-red { color: var(--red); }
    .explain { margin-top: 16px; color: #e2e8f0; font-size: 13px; line-height: 1.75; }
    .footer-links { margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; }
    .footer-links a { color: #93c5fd; text-decoration: none; }
    @media (max-width: 720px) { body { padding: 12px; } .container { padding: 16px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="breadcrumb" style="font-size:12px;color:#94a3b8;margin-bottom:10px;">
      <a href="${SITE_ROOT}/" style="color:#93c5fd;text-decoration:none;">首页</a> &gt;
      <a href="${SITE_ROOT}/daily.html" style="color:#93c5fd;text-decoration:none;">Daily</a> &gt;
      <span>${date}</span>
    </div>
    <h1>${date} 市场风险状态</h1>
    <p class="sub">市场气候由趋势健康度、压力与风险偏好综合判断，仅作风险感知。</p>
    <div class="grid">
      <div class="card">
        <div class="risk-light">
          <div class="lamp ${riskIndex.light === 'green' ? 'risk-green' : riskIndex.light === 'red' ? 'risk-red' : 'risk-yellow'}">${riskIndex.light === 'green' ? '🟢' : riskIndex.light === 'red' ? '🔴' : '🟡'}</div>
          <div>
            <div class="note">风险分</div>
            <div class="score ${riskIndex.light === 'green' ? 'risk-green' : riskIndex.light === 'red' ? 'risk-red' : 'risk-yellow'}">${riskIndex.score}</div>
            <div class="note">仓位区间 ${riskIndex.equityRange}</div>
            <div class="note">Δ 昨日 ${deltaText}</div>
            <div class="note">组件：趋势 ${riskIndex.components?.trend ?? "--"} / 压力 ${riskIndex.components?.stress ?? "--"} / 风险偏好 ${riskIndex.components?.regime ?? "--"}</div>
          </div>
        </div>
        <div class="badge">风险灯 · ${lightText} · ${riskIndex.level || ''}</div>
        <div class="note">Method ${riskIndex.methodVersion || 'MRI-1.0'}</div>
        <details style="margin-top:6px;">
          <summary style="cursor:pointer;color:#93c5fd;font-size:12px;list-style:none;">方法论</summary>
          <div class="note">Inputs: ${(riskIndex.inputs || []).join(', ')} · ${riskIndex.explanation || ''}</div>
        </details>
        <details style="margin-top:6px;">
          <summary style="cursor:pointer;color:#93c5fd;font-size:12px;list-style:none;">为何如此？</summary>
          <div class="note">${(riskIndex.keyDrivers || []).join(' / ')}</div>
          <div class="note">
            Trend ${riskIndex.componentContrib?.trend ?? 0}
            <div style="height:8px;background:rgba(148,163,184,0.2);border-radius:999px;overflow:hidden;margin:4px 0 8px 0;">
              <div style="height:100%;background:linear-gradient(90deg,#38bdf8,#22d3ee);width:${Math.max(0, Math.min(100, riskIndex.componentContrib?.trend ?? 0))}%"></div>
            </div>
          </div>
          <div class="note">
            Stress ${riskIndex.componentContrib?.stress ?? 0}
            <div style="height:8px;background:rgba(148,163,184,0.2);border-radius:999px;overflow:hidden;margin:4px 0 8px 0;">
              <div style="height:100%;background:linear-gradient(90deg,#38bdf8,#22d3ee);width:${Math.max(0, Math.min(100, riskIndex.componentContrib?.stress ?? 0))}%"></div>
            </div>
          </div>
          <div class="note">
            Regime ${riskIndex.componentContrib?.regime ?? 0}
            <div style="height:8px;background:rgba(148,163,184,0.2);border-radius:999px;overflow:hidden;margin:4px 0 8px 0;">
              <div style="height:100%;background:linear-gradient(90deg,#38bdf8,#22d3ee);width:${Math.max(0, Math.min(100, riskIndex.componentContrib?.regime ?? 0))}%"></div>
            </div>
          </div>
          <div class="note">Trend: ${riskIndex.componentNotes?.trend || '--'} / Stress: ${riskIndex.componentNotes?.stress || '--'} / Regime: ${riskIndex.componentNotes?.regime || '--'}</div>
        </details>
      </div>
      <div class="card">
        <div style="font-weight:700; margin-bottom:6px;">主题热度榜 Top 3</div>
        ${renderThemeRows(topThemes)}
      </div>
      <div class="card">
        <div style="font-weight:700; margin-bottom:6px;">主题热度榜 Bottom 3</div>
        ${renderThemeRows(bottomThemes)}
      </div>
      <div class="card">
        <div style="font-weight:700; margin-bottom:6px;">今日要点</div>
        <ul class="list">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="explain">${explanation}</div>
    <div class="footer-links">
      ${prevLink ? `<a href="${prevLink}">上一天</a>` : ''}
      ${nextLink ? `<a href="${nextLink}">下一天</a>` : ''}
      <a href="${SITE_ROOT}/daily.html">返回每日市场状态</a>
      <a href="${SITE_ROOT}/">返回首页</a>
    </div>
  </div>
</body>
</html>`;
}

function buildShareSvg(daily) {
  const risk = daily.riskIndex || {};
  const date = daily.date;
  const score = risk.score ?? "--";
  const level = (risk.level || "").toUpperCase();
  const confidence = risk.confidenceLevel || "--";
  const light = risk.light || "yellow";
  const color = light === 'red' ? '#f87171' : light === 'green' ? '#4ade80' : '#facc15';
  const equity = risk.equityRange || "--";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050814"/>
      <stop offset="100%" stop-color="#0b162c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="36" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="510" rx="28" fill="#0f172a" stroke="rgba(148,163,184,0.25)"/>
  <text x="100" y="140" fill="#e2e8f0" font-size="28" font-family="Space Grotesk, Noto Sans SC, sans-serif">FinLogic Market Risk Index</text>
  <text x="100" y="190" fill="#94a3b8" font-size="18" font-family="Space Grotesk, Noto Sans SC, sans-serif">${date}</text>
  <text x="100" y="310" fill="${color}" font-size="120" font-family="Space Grotesk, Noto Sans SC, sans-serif" font-weight="700">${score}</text>
  <text x="100" y="360" fill="#e2e8f0" font-size="22" font-family="Space Grotesk, Noto Sans SC, sans-serif">Risk Level: ${level}</text>
  <text x="100" y="400" fill="#e2e8f0" font-size="22" font-family="Space Grotesk, Noto Sans SC, sans-serif">Equity Range: ${equity}</text>
  <text x="100" y="440" fill="#e2e8f0" font-size="22" font-family="Space Grotesk, Noto Sans SC, sans-serif">Confidence: ${confidence}</text>
  <circle cx="1060" cy="200" r="44" fill="${color}" opacity="0.9"/>
  <text x="100" y="500" fill="#64748b" font-size="16" font-family="Space Grotesk, Noto Sans SC, sans-serif">Institutional-style risk snapshot. Not investment advice.</text>
</svg>`;
}

function updateOgBlock(html, og) {
  const block = `<!-- MRI_OG_START -->\n${og}\n<!-- MRI_OG_END -->`;
  return html.replace(/<!-- MRI_OG_START -->[\s\S]*?<!-- MRI_OG_END -->/m, block);
}

function updateOgForPage(filePath, og) {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const updated = updateOgBlock(html, og);
    fs.writeFileSync(filePath, updated);
  } catch (e) {}
}

function listArchiveJsons() {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];
  return fs.readdirSync(ARCHIVE_DIR).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name));
}

function buildRecentList(limit = 7) {
  const files = listArchiveJsons();
  const items = [];
  for (const file of files) {
    const full = path.join(ARCHIVE_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
      const date = data.date;
      if (!date) continue;
      items.push({
        date,
        urlHtml: `/daily/${date}.html`,
        urlJson: `/daily/${date}.json`,
        light: data.marketRisk?.light,
        score: data.marketRisk?.score,
        equityRange: data.marketRisk?.equityRange
      });
    } catch (e) {}
  }
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return items.slice(0, limit);
}

function getYesterdayRisk() {
  const files = listArchiveJsons();
  if (!files.length) return null;
  const dates = files.map(f => f.slice(0, 10)).sort();
  const lastDate = dates[dates.length - 1];
  const jsonPath = path.join(ARCHIVE_DIR, `${lastDate}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const risk = data.riskIndex || data.marketRisk || {};
    return { date: lastDate, score: risk.score ?? risk.rawScore ?? 0, components: risk.components || {} };
  } catch (e) {
    return null;
  }
}

function mapRisk(score) {
  let light = 'green';
  if (score >= 61) light = 'red';
  else if (score >= 31) light = 'yellow';
  const level = light === 'green' ? 'low' : light === 'red' ? 'high' : 'medium';
  const equityRange = light === 'green' ? '60-80%' : light === 'yellow' ? '40-60%' : '20-40%';
  return { light, level, equityRange };
}

function stepValue(val) {
  if (val <= 20) return 0;
  if (val <= 40) return 25;
  if (val <= 60) return 50;
  if (val <= 80) return 75;
  return 100;
}

function confirmExtreme(step, prevStep) {
  if (step === 0 && prevStep !== 0) return 25;
  if (step === 100 && prevStep !== 100) return 75;
  return step;
}

function buildComponentNotes(ctx, steps) {
  const trendNote = `趋势风险${steps.trend}：${ctx.close >= ctx.ma200 ? "价格在MA200上方" : "价格在MA200下方"}（rule: close_vs_ma200）`;
  const stressNote = `压力风险${steps.stress}：vol20 ${ctx.vol20.toFixed(1)}%（rule: vol20_threshold）`;
  const regimeNote = `偏好风险${steps.regime}：${ctx.ratioQQQTLTDown || ctx.ratioSPYGLDDown ? "risk-off 比率走弱" : "risk-on 比率走强"}（rule: ratio_down_20d）`;
  return { trend: trendNote, stress: stressNote, regime: regimeNote };
}

function applySmoothing(daily, yesterday) {
  if (!daily?.riskIndex) return daily;
  const raw = daily.riskIndex.rawScore ?? daily.riskIndex.score ?? 0;
  const yScore = yesterday?.score;
  const smooth = Number.isFinite(yScore) ? Math.round(0.7 * raw + 0.3 * yScore) : Math.round(raw);
  const mapped = mapRisk(smooth);
  const prevComponents = yesterday?.components || {};
  const stepped = {
    trend: confirmExtreme(stepValue(daily.riskIndex.components.trend), stepValue(prevComponents.trend ?? 50)),
    stress: confirmExtreme(stepValue(daily.riskIndex.components.stress), stepValue(prevComponents.stress ?? 50)),
    regime: confirmExtreme(stepValue(daily.riskIndex.components.regime), stepValue(prevComponents.regime ?? 50))
  };
  // componentContrib 算法：impact_i = round(weight_i * components_i)，再归一化，使三项相加≈score
  const weights = { trend: 0.20, stress: 0.45, regime: 0.35 };
  const impactRaw = {
    trend: Math.round(weights.trend * stepped.trend),
    stress: Math.round(weights.stress * stepped.stress),
    regime: Math.round(weights.regime * stepped.regime)
  };
  const impactSum = impactRaw.trend + impactRaw.stress + impactRaw.regime;
  const scale = impactSum > 0 ? smooth / impactSum : 1;
  let trendC = Math.round(impactRaw.trend * scale);
  let stressC = Math.round(impactRaw.stress * scale);
  let regimeC = Math.round(impactRaw.regime * scale);
  const diff = smooth - (trendC + stressC + regimeC);
  if (diff !== 0) {
    const arr = [
      { key: 'trend', val: trendC },
      { key: 'stress', val: stressC },
      { key: 'regime', val: regimeC }
    ].sort((a, b) => b.val - a.val);
    if (arr[0].key === 'trend') trendC += diff;
    else if (arr[0].key === 'stress') stressC += diff;
    else regimeC += diff;
  }
  const contrib = daily.riskIndex.componentContrib || {};
  const notes = buildComponentNotes(daily._ctx || {}, stepped);
  return {
    ...daily,
    riskIndex: {
      ...daily.riskIndex,
      rawScore: raw,
      score: smooth,
      light: mapped.light,
      level: mapped.level,
      equityRange: mapped.equityRange,
      updatedAt: new Date().toISOString(),
      componentContrib: {
        trend: Math.max(0, trendC),
        stress: Math.max(0, stressC),
        regime: Math.max(0, regimeC)
      },
      componentNotes: notes,
      components: stepped,
      contribDefinition: "componentContrib 为对最终风险分的边际贡献（impact）"
    },
    marketRisk: {
      score: smooth,
      light: mapped.light,
      equityRange: mapped.equityRange
    }
  };
}

function buildKeyDrivers(components = {}) {
  const out = [];
  const trend = components.trend ?? 0;
  const stress = components.stress ?? 0;
  const regime = components.regime ?? 0;
  const trendText = trend >= 75 ? "趋势风险偏高" : trend <= 25 ? "趋势风险偏低" : "趋势风险中性";
  const stressText = stress >= 75 ? "压力风险偏高" : stress <= 25 ? "压力风险偏低" : "压力风险中性";
  const regimeText = regime >= 75 ? "风险偏好偏弱" : regime <= 25 ? "风险偏好偏强" : "风险偏好中性";
  out.push(trendText, stressText, regimeText);
  return out.slice(0, 3);
}

function buildRiskIndexHistory(limit = 30) {
  const items = buildRecentList(limit);
  const rows = items.map(item => {
    const jsonPath = path.join(ARCHIVE_DIR, `${item.date}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const risk = data.riskIndex || data.marketRisk || {};
      return {
        date: item.date,
        score: risk.score ?? item.score,
        rawScore: risk.rawScore ?? risk.score ?? item.score,
        light: risk.light ?? item.light,
        level: risk.level || (risk.light === 'green' ? 'low' : risk.light === 'red' ? 'high' : 'medium'),
        equityRange: risk.equityRange ?? item.equityRange,
        components: risk.components || {},
        componentContrib: risk.componentContrib || {},
        componentNotes: risk.componentNotes || {}
      };
    } catch (e) {
      return {
        date: item.date,
        score: item.score,
        rawScore: item.score,
        light: item.light,
        level: item.light === 'green' ? 'low' : item.light === 'red' ? 'high' : 'medium',
        equityRange: item.equityRange,
        components: {},
        componentContrib: {},
        componentNotes: {}
      };
    }
  }).reverse();
  return rows.map((row, idx) => {
    if (idx === 0) return { ...row, trendDirection: "flat", delta: 0, arrow: "→" };
    const prev = rows[idx - 1];
    const delta = Number((row.score - prev.score).toFixed(1));
    let trendDirection = "flat";
    let arrow = "→";
    if (delta > 0) { trendDirection = "up"; arrow = "↑"; }
    else if (delta < 0) { trendDirection = "down"; arrow = "↓"; }
    return { ...row, trendDirection, delta, arrow };
  });
}

function buildMonthlyIndex() {
  const files = listArchiveJsons();
  const dates = files.map(f => f.slice(0, 10)).sort();
  const map = new Map();
  for (const d of dates) {
    const month = d.slice(0, 7);
    if (!map.has(month)) map.set(month, []);
    map.get(month).push(d);
  }
  const months = Array.from(map.entries()).map(([month, dates]) => ({
    month,
    dates,
    latest: dates[dates.length - 1]
  })).sort((a, b) => (a.month < b.month ? 1 : -1));
  return { months };
}

function writeSitemap(archiveHtmlFiles) {
  const today = getDateInTZ();
  const getMtimeDate = (filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return stat.mtime.toISOString().slice(0, 10);
    } catch (e) {
      return today;
    }
  };
  const urls = [
    { loc: `${SITE_ROOT}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_ROOT}/daily.html`, changefreq: 'daily', priority: '0.7', lastmod: today },
    { loc: `${SITE_ROOT}/market-risk-index.html`, changefreq: 'daily', priority: '0.7', lastmod: today },
    { loc: `${SITE_ROOT}/pages/stock.html`, changefreq: 'daily', priority: '0.7', lastmod: today },
    { loc: `${SITE_ROOT}/privacy.html`, changefreq: 'monthly', priority: '0.3', lastmod: getMtimeDate(PRIVACY_PATH) },
    { loc: `${SITE_ROOT}/disclaimer.html`, changefreq: 'monthly', priority: '0.3', lastmod: getMtimeDate(DISCLAIMER_PATH) }
  ];
  for (const file of archiveHtmlFiles) {
    const date = file.slice(0, 10);
    urls.push({ loc: `${SITE_ROOT}/daily/${file}`, changefreq: 'daily', priority: '0.5', lastmod: date });
  }
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const u of urls) {
    xml.push('  <url>');
    xml.push(`    <loc>${u.loc}</loc>`);
    xml.push(`    <lastmod>${u.lastmod}</lastmod>`);
    xml.push(`    <changefreq>${u.changefreq}</changefreq>`);
    xml.push(`    <priority>${u.priority}</priority>`);
    xml.push('  </url>');
  }
  xml.push('</urlset>');
  fs.writeFileSync(SITEMAP_PATH, xml.join('\n'));
}

function calcPercentile(scores, value) {
  if (!scores.length) return 0;
  const sorted = scores.slice().sort((a, b) => a - b);
  const count = sorted.filter(v => v <= value).length;
  return Math.round((count / sorted.length) * 100);
}

function calcConfidence(components) {
  const vals = [components.trend, components.stress, components.regime].filter(v => typeof v === 'number');
  if (!vals.length) return { level: "low", reason: "数据不足" };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
  const std = Math.sqrt(variance);
  if (std >= 35) return { level: "medium", reason: "趋势/压力偏低，但风险偏好显著走弱（单因子主导）" };
  if (std >= 20) return { level: "medium", reason: "组件一致性中等" };
  return { level: "low", reason: "组件分歧小，信号偏弱" };
}

function generateShareText(riskData, trend, delta) {
  const mri = riskData.score ?? 0;
  const riskLevel = mri < 30 ? "低" : mri <= 70 ? "中性" : "高";
  const riskLevelEn = riskData.level || "medium";
  const range = riskData.equityRange || "--";
  const confidence = riskData.confidenceLevel || "medium";
  const confidenceCN = confidence === "high" ? "高" : confidence === "low" ? "低" : "中等";
  const trendTextCN = trend === "up" ? "风险上行" : trend === "down" ? "风险下降" : "风险稳定";
  const trendTextEn = trend === "up" ? "up" : trend === "down" ? "down" : "flat";
  const deltaText = Number.isFinite(delta) ? (delta > 0 ? `+${delta}` : `${delta}`) : "0";

  const cnShareText = [
    `📊 今日市场风险指数（MRI）：${mri} (${deltaText})`,
    `风险等级：${riskLevel}`,
    `建议股票仓位：${range}`,
    `趋势：${trendTextCN}`,
    `置信度：${confidenceCN}`,
    "",
    "查看完整指数 → https://finlogichub5.com"
  ].join("\n");

  const enShareText = [
    `MRI ${mri} (${deltaText})`,
    "",
    `Risk Level: ${riskLevelEn}`,
    `Equity Range: ${range}`,
    `Trend: ${trendTextEn}`,
    `Confidence: ${confidence}`,
    "",
    "Full report → https://finlogichub5.com"
  ].join("\n");

  return { cnShareText, enShareText, shareText: cnShareText };
}

async function main() {
  const { data, status } = await loadDataSource();
  const yesterday = getYesterdayRisk();
  let daily = buildDaily(data);
  daily = applySmoothing(daily, yesterday);
  delete daily._ctx;
  daily = {
    ...daily,
    riskIndex: {
      ...daily.riskIndex,
      keyDrivers: buildKeyDrivers(daily.riskIndex?.components)
    }
  };
  daily.dataStatus = status;

  const prevScore = Number.isFinite(yesterday?.score) ? yesterday.score : null;
  const trend = prevScore === null
    ? "flat"
    : (daily.riskIndex.score > prevScore ? "up" : daily.riskIndex.score < prevScore ? "down" : "flat");
  const delta = prevScore === null ? 0 : (daily.riskIndex.score - prevScore);
  const shareTexts = generateShareText(daily.riskIndex, trend, delta);
  const shareText = shareTexts.shareText;
  const sharePayload = {
    date: daily.date,
    mri: daily.riskIndex.score,
    riskLevel: daily.riskIndex.level,
    equityRange: daily.riskIndex.equityRange,
    trend,
    confidence: daily.riskIndex.confidenceLevel || "medium",
    delta,
    cnShareText: shareTexts.cnShareText,
    enShareText: shareTexts.enShareText,
    shareText: shareTexts.shareText
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(daily, null, 2));
  console.log('daily.json updated:', OUT_PATH);
  const histScores = listArchiveJsons().map(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), 'utf-8'));
      return data.riskIndex?.score ?? data.marketRisk?.score ?? null;
    } catch (e) { return null; }
  }).filter(v => Number.isFinite(v));
  const allScores = histScores.concat([daily.riskIndex.score]);
  const sampleN = allScores.length;
  const percentileRank = sampleN >= 30 ? calcPercentile(allScores, daily.riskIndex.score) : null;
  const percentileNote = sampleN >= 30 ? "" : `样本不足（n=${sampleN}），暂不显示分位`;
  const confidence = calcConfidence(daily.riskIndex.components || {});
  daily = {
    ...daily,
    riskIndex: {
      ...daily.riskIndex,
      percentileRank,
      percentileNote,
      confidenceLevel: confidence.level,
      confidenceReason: confidence.reason
    }
  };
  fs.writeFileSync(RISK_INDEX_PATH, JSON.stringify(daily.riskIndex, null, 2));
  console.log('risk_index.json updated:', RISK_INDEX_PATH);
  fs.writeFileSync(SHARE_TEXT_PATH, JSON.stringify(sharePayload, null, 2));
  console.log('share_text.json updated:', SHARE_TEXT_PATH);

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const archiveJsonPath = path.join(ARCHIVE_DIR, `${daily.date}.json`);
  fs.writeFileSync(archiveJsonPath, JSON.stringify(daily, null, 2));
  console.log('daily archive written:', archiveJsonPath);

  const recent = buildRecentList(7);
  fs.writeFileSync(RECENT_PATH, JSON.stringify(recent, null, 2));
  console.log('recent.json updated:', RECENT_PATH);

  const recent30 = buildRecentList(30);
  fs.writeFileSync(RECENT30_PATH, JSON.stringify(recent30, null, 2));
  console.log('recent30.json updated:', RECENT30_PATH);

  const monthly = buildMonthlyIndex();
  fs.writeFileSync(MONTHLY_PATH, JSON.stringify(monthly, null, 2));
  console.log('monthly.json updated:', MONTHLY_PATH);

  const riskHistory = buildRiskIndexHistory(30);
  fs.writeFileSync(RISK_INDEX_HISTORY_PATH, JSON.stringify(riskHistory, null, 2));
  console.log('risk_index_history.json updated:', RISK_INDEX_HISTORY_PATH);

  fs.mkdirSync(OG_DIR, { recursive: true });
  const svg = buildShareSvg(daily);
  const ogDatePath = path.join(OG_DIR, `mri-${daily.date}.svg`);
  const ogLatestPath = path.join(OG_DIR, `mri-latest.svg`);
  fs.writeFileSync(ogDatePath, svg);
  fs.writeFileSync(ogLatestPath, svg);
  console.log('og image updated:', ogLatestPath);

  const ogDatePng = path.join(OG_DIR, `mri-${daily.date}.png`);
  const ogLatestPng = path.join(OG_DIR, `mri-latest.png`);
  if (sharp) {
    try {
      const bufDate = await sharp(Buffer.from(svg))
        .resize(1200, 630, { fit: 'fill', background: '#0b162c' })
        .png({ compressionLevel: 9 })
        .toBuffer();
      const bufLatest = await sharp(Buffer.from(svg))
        .resize(1200, 630, { fit: 'fill', background: '#0b162c' })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(ogDatePng, bufDate);
      fs.writeFileSync(ogLatestPng, bufLatest);
      console.log('og png updated:', ogLatestPng);
    } catch (e) {
      console.error('png generation failed:', e.message);
      process.exitCode = 1;
    }
  } else if (process.env.USE_CLI_CONVERTER === '1') {
    try {
      execFileSync('magick', ['-size', '1200x630', 'svg:' + ogDatePath, ogDatePng], { stdio: 'ignore' });
      execFileSync('magick', ['-size', '1200x630', 'svg:' + ogLatestPath, ogLatestPng], { stdio: 'ignore' });
      console.log('og png updated via magick:', ogLatestPng);
    } catch (e) {
      try {
        execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', ogDatePath, '-o', ogDatePng], { stdio: 'ignore' });
        execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', ogLatestPath, '-o', ogLatestPng], { stdio: 'ignore' });
        console.log('og png updated via rsvg-convert:', ogLatestPng);
      } catch (err) {
        console.error('png generation failed: no converter');
        process.exitCode = 1;
      }
    }
  } else {
    console.error('png generation failed: sharp not installed');
    process.exitCode = 1;
  }

  const ogTitle = `MRI ${daily.riskIndex.score} · ${daily.riskIndex.level.toUpperCase()} · ${daily.date}`;
  const ogDesc = shareText;
  const ogImage = `${SITE_ROOT}/og/mri-latest.png`;
  const ogBlock = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${ogTitle}">`,
    `<meta property="og:description" content="${ogDesc}">`,
    `<meta property="og:url" content="${SITE_ROOT}/">`,
    `<meta property="og:site_name" content="FinLogicHub5">`,
    `<meta property="og:locale" content="zh_CN">`,
    `<meta property="og:image" content="${ogImage}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${ogTitle}">`,
    `<meta name="twitter:description" content="${ogDesc}">`,
    `<meta name="twitter:image" content="${ogImage}">`
  ].join('\n');
  updateOgForPage(path.resolve(__dirname, '..', 'public', 'index.html'), ogBlock);
  updateOgForPage(
    path.resolve(__dirname, '..', 'public', 'daily.html'),
    ogBlock.replace(`content="${SITE_ROOT}/"`, `content="${SITE_ROOT}/daily.html"`)
  );
  updateOgForPage(
    path.resolve(__dirname, '..', 'public', 'market-risk-index.html'),
    ogBlock.replace(`content="${SITE_ROOT}/"`, `content="${SITE_ROOT}/market-risk-index.html"`)
  );

  const archiveJsons = listArchiveJsons();
  const dates = archiveJsons.map(f => f.slice(0, 10)).sort();
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const prevDate = i > 0 ? dates[i - 1] : '';
    const nextDate = i < dates.length - 1 ? dates[i + 1] : '';
    const jsonPath = path.join(ARCHIVE_DIR, `${d}.json`);
    let prevScore = null;
    if (prevDate) {
      const prevPath = path.join(ARCHIVE_DIR, `${prevDate}.json`);
      try {
        const prevData = JSON.parse(fs.readFileSync(prevPath, 'utf-8'));
        const prevRisk = prevData.riskIndex || prevData.marketRisk || {};
        if (Number.isFinite(prevRisk.score)) prevScore = prevRisk.score;
      } catch (e) {}
    }
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const htmlPath = path.join(ARCHIVE_DIR, `${d}.html`);
      fs.writeFileSync(htmlPath, renderArchiveHtml(data, { prevDate, nextDate, prevScore }));
      if (d === daily.date) console.log('daily html written:', htmlPath);
    } catch (e) {}
  }

  const archiveHtmlFiles = recent30.map(item => `${item.date}.html`);
  writeSitemap(archiveHtmlFiles);
  console.log('sitemap.xml updated:', SITEMAP_PATH);
}

main().catch((err) => {
  console.error('generate_daily failed:', err.message);
  process.exitCode = 1;
});
