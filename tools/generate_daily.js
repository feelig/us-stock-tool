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
const RISK_ALERTS_PATH = path.resolve(DATA_DIR, 'risk_alerts.json');
const SHARE_TEXT_PATH = path.resolve(DATA_DIR, 'share_text.json');
const OG_DIR = path.resolve(__dirname, '..', 'public', 'og');
const ARCHIVE_DIR = path.resolve(__dirname, '..', 'public', 'daily');
const ALERTS_DIR = path.resolve(__dirname, '..', 'public', 'alerts');
const ALERTS_API_DIR = path.resolve(__dirname, '..', 'public', 'api', 'notify');
const ALERTS_TODAY_DIR = path.resolve(__dirname, '..', 'public', 'api', 'alerts-today');
const RECENT_PATH = path.resolve(ARCHIVE_DIR, 'recent.json');
const RECENT30_PATH = path.resolve(ARCHIVE_DIR, 'recent30.json');
const MONTHLY_PATH = path.resolve(ARCHIVE_DIR, 'monthly.json');
const SITEMAP_PATH = path.resolve(__dirname, '..', 'public', 'sitemap.xml');
const SITE_ROOT = 'https://finlogichub5.com';
const SUBSCRIBE_URL = 'https://formspree.io/f/FORM_ID';
const GA_ID = 'G-PQ1DWNMT9K';
const GA_SNIPPET = `<!-- Google Analytics GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>`;
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

function buildDaily(mock, reportDate) {
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

  const date = reportDate || getDateInTZ();

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
  const base = `Market Risk Index Today (MRI) ${date}: risk level ${risk.level || 'medium'}, score ${risk.score}, allocation ${risk.equityRange}. Daily update covers market risk index signals, stock market risk context, and strategy notes.`;
  const target = 155;
  if (base.length >= 150 && base.length <= 160) return base;
  if (base.length > 160) return base.slice(0, 160);
  const pad = " Updated daily for market risk index and stock market risk.";
  const out = (base + pad);
  return out.length > 160 ? out.slice(0, 160) : out;
}

function renderThemeRows(list) {
  return list.map(item => `<div class="theme-row"><span>${item.name}</span><span>${item.score}</span></div><div class="note">${item.note}</div>`).join('');
}

function buildSeoContent(daily) {
  const risk = daily.riskIndex || daily.marketRisk || {};
  const reasons = Array.isArray(daily.reasons) ? daily.reasons : [];
  const topThemes = (daily.topThemes || []).map(t => t.name).filter(Boolean);
  const bottomThemes = (daily.bottomThemes || []).map(t => t.name).filter(Boolean);
  const levelMap = { low: '低', medium: '中性', high: '偏高' };
  const levelCN = levelMap[risk.level] || '中性';
  const score = Number.isFinite(risk.score) ? risk.score : '--';
  const eq = risk.equityRange || '--';
  const trend = risk.components?.trend ?? '--';
  const stress = risk.components?.stress ?? '--';
  const regime = risk.components?.regime ?? '--';
  const reasonText = reasons.length ? reasons.join('；') : '市场结构保持中性，等待确认';
  const topText = topThemes.length ? topThemes.join('、') : '暂无';
  const bottomText = bottomThemes.length ? bottomThemes.join('、') : '暂无';

  return `
      <section class="seo-block" id="seo-content-block">
        <div class="toc" id="toc">
          <strong>Contents</strong>
          <ul>
            <li><a href="#risk-interpretation">Market Risk Interpretation</a></li>
            <li><a href="#strategy-suggestion">Strategy Suggestions</a></li>
            <li><a href="#risk-trend">Risk Trend</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>
        <h2 id="risk-interpretation">今日市场风险解读（market risk index / stock market risk / MRI）</h2>
        <p>本页用于记录 ${daily.date} 的市场风险状态（Market Risk Index, MRI）。当前风险分为 ${score}，风险等级偏${levelCN}，权益仓位区间参考 ${eq}。趋势风险组件为 ${trend}，压力风险组件为 ${stress}，风险偏好组件为 ${regime}，整体反映市场处于可观察的风险温度区间。今日要点包括：${reasonText}。主题热度方面，Top 主题为 ${topText}，Bottom 主题为 ${bottomText}。这些信号主要用于观察市场结构与风险偏好变化，不构成收益预测，也不构成投资建议。</p>

        <h3 id="strategy-suggestion">投资策略建议（参考框架）</h3>
        <p>在 MRI 为偏${levelCN} 的区间内，建议优先关注仓位纪律与回撤管理。若风险分维持在中低区间，可采用分批配置与核心仓位管理的方式；若风险分持续上行，则应适当降低高波动资产敞口，并将风险控制在可承受范围。仓位区间 ${eq} 仅为风险感知参考，具体配置需结合个人风险承受能力与交易周期。</p>

        <h3 id="risk-trend">风险趋势解读</h3>
        <p>趋势风险反映价格相对长期均线的稳定性，压力风险反映波动与回撤强度，风险偏好反映风险资产与防御资产的相对强弱。今日趋势/压力/偏好三组件分布为 ${trend}/${stress}/${regime}，提示市场风险温度处于可控区间但仍需关注结构性变化。若连续多日出现风险分上升，则应关注仓位护栏与分散配置；若风险分下降且趋势稳定，则可逐步提高风险资产权重。</p>

        <h3 id="faq">FAQ</h3>
        <p><strong>Q1: MRI 是什么？</strong> A: MRI 是 Market Risk Index（市场风险指数），用于衡量市场风险状态与风险偏好变化。</p>
        <p><strong>Q2: MRI 能直接指导买卖吗？</strong> A: 不能。MRI 仅用于风险感知与历史观察，不构成投资建议。</p>
        <p><strong>Q3: stock market risk 如何使用？</strong> A: 将 MRI 作为风险温度参考，结合仓位区间与个人风险偏好制定交易计划。</p>
      </section>
  `;
}

function allocationByLevel(level) {
  if (level === 'low') return { equity: '60-80%', bond: '10-25%', cash: '5-15%' };
  if (level === 'high') return { equity: '20-40%', bond: '30-50%', cash: '20-30%' };
  return { equity: '40-60%', bond: '20-40%', cash: '10-20%' };
}

function renderDailyHub(recent30) {
  const latest = recent30[0]?.date || '';
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_ROOT}/` },
      { "@type": "ListItem", "position": 2, "name": "Daily Hub", "item": `${SITE_ROOT}/pages/daily-hub.html` }
    ]
  };
  const articleJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Daily Market Risk Hub",
    "datePublished": new Date().toISOString().slice(0, 10),
    "dateModified": new Date().toISOString().slice(0, 10),
    "mainEntityOfPage": `${SITE_ROOT}/pages/daily-hub.html`,
    "description": "Daily hub for market risk index and stock market risk analysis."
  };
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is the Daily Market Risk Hub?", "acceptedAnswer": { "@type": "Answer", "text": "A hub that aggregates the latest daily market risk index snapshots." } },
      { "@type": "Question", "name": "How often is it updated?", "acceptedAnswer": { "@type": "Answer", "text": "Daily, based on the America/New_York report date." } },
      { "@type": "Question", "name": "Can I use it for investment decisions?", "acceptedAnswer": { "@type": "Answer", "text": "No. It is for risk awareness and historical observation only." } }
    ]
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0f172a">
  <title>Daily Market Risk Hub | FinLogicHub5</title>
  <meta name="description" content="Daily hub for market risk index, stock market risk, and recent MRI snapshots. Browse the last 30 daily analyses.">
  <link rel="canonical" href="${SITE_ROOT}/pages/daily-hub.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Daily Market Risk Hub | FinLogicHub5">
  <meta property="og:description" content="Daily hub for market risk index, stock market risk, and recent MRI snapshots.">
  <meta property="og:url" content="${SITE_ROOT}/pages/daily-hub.html">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Daily Market Risk Hub | FinLogicHub5">
  <meta name="twitter:description" content="Daily hub for market risk index, stock market risk, and recent MRI snapshots.">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <script type="application/ld+json">${JSON.stringify(articleJson)}</script>
  <script type="application/ld+json">${JSON.stringify(faqJson)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Noto+Sans+SC:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 24px; font-family: "Space Grotesk","Noto Sans SC",sans-serif; background: #0b1220; color: #f8fafc; }
    .wrap { max-width: 980px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(148,163,184,0.2); border-radius: 16px; padding: 24px; }
    .nav a { color: #38bdf8; text-decoration: none; margin-right: 12px; font-size: 12px; }
    .list { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 10px; }
    .list a { color: #93c5fd; text-decoration: none; padding: 10px 12px; border: 1px solid rgba(148,163,184,0.2); border-radius: 10px; background: rgba(15,23,42,0.6); }
    .toc { margin: 10px 0; font-size: 12px; }
    .toc a { color: #93c5fd; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="nav">
      <a href="/">Daily Risk</a>
      <a href="/weekly/">Weekly Strategy</a>
        <a href="/risk-levels/">Risk Levels</a>
        <a href="/market-risk-explained/">Market Risk Explained</a>
      <a href="/archive/">Risk Archive</a>
      <a href="/methodology/">Methodology</a>
      <a href="/lab/">Lab</a>
    </div>
    <div class="toc">
      <a href="#recent">Recent 30 Days</a> · <a href="#latest">Latest Daily</a>
    </div>
    <h1>Daily Market Risk Hub</h1>
    <p>Latest daily pages for market risk index and stock market risk analysis.</p>
    <h2 id="latest">Latest Daily</h2>
    <p><a href="${latest ? `/daily/${latest}` : '/archive/'}">${latest || 'Daily Archive'}</a></p>
    <h2 id="recent">Recent 30 Days</h2>
    <div class="list">
      ${recent30.map(item => `<a href="/daily/${item.date}">${item.date} · ${item.equityRange || ''}</a>`).join('')}
    </div>
  </div>

  <script>
    (function() {
      var slots = document.querySelectorAll('.ads[data-ad-slot]');
      if (!('IntersectionObserver' in window)) {
        slots.forEach(function(s) { s.dataset.loaded = 'true'; });
        return;
      }
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.dataset.loaded = 'true';
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });
      slots.forEach(function(slot) { observer.observe(slot); });
    })();
  </script>
</body>
</html>`;
}

function renderArchiveHtml(daily, ctx = {}) {
  const { date, reasons } = daily;
  const riskIndex = daily.riskIndex || daily.marketRisk || {};
  const canonical = `${SITE_ROOT}/daily/${date}`;
  const metaDesc = buildMetaDescription(daily);
  const levelUpper = (riskIndex.level || 'medium').toUpperCase();
  const shareTitle = `Today Market Risk Index: ${riskIndex.score ?? '--'} (${levelUpper})`;
  const shareText = `${shareTitle}
Full analysis → ${canonical}`;
  const prevScore = Number.isFinite(ctx.prevScore) ? ctx.prevScore : null;
  const delta = prevScore === null ? 0 : Number((riskIndex.score - prevScore).toFixed(1));
  const deltaText = prevScore === null ? "—" : `${delta >= 0 ? "+" : ""}${delta}`;
  const prevLink = ctx.prevDate ? `${SITE_ROOT}/daily/${ctx.prevDate}` : '';
  const nextLink = ctx.nextDate ? `${SITE_ROOT}/daily/${ctx.nextDate}` : '';
  const alloc = allocationByLevel(riskIndex.level);
  const explanation = buildExplanation(daily);
  const regimeLabel = (riskIndex.level || 'neutral').toUpperCase();
  const regimeDuration = Number.isFinite(ctx.regimeDuration) ? ctx.regimeDuration : 0;
  const regimeContext = `We are currently in a ${regimeDuration}-day ${regimeLabel} regime.`;
  const actionHint = (riskIndex.score ?? 0) > 65
    ? "Allocation adjustment likely if risk > 65."
    : "No allocation change suggested today.";
  const alertMsg = alertHeadline(ctx.alerts || []);
  const alertBanner = alertMsg ? `<div class="alert-banner">${alertMsg}</div>` : '';
  const similar = (ctx.similar || []).map(item => `<a href="/daily/${item.date}">${item.date} · MRI ${item.score}</a>`).join("") || "<span>No similar periods found.</span>";
  const relatedLinks = `
    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Explore More</h2>
      <div class="footer-links">
        <a href="/risk-levels/">Risk Levels</a>
        <a href="/risk-regime/">Risk Regime</a>
        <a href="/asset-allocation-guide/">Asset Allocation Guide</a>
        <a href="/archive/">Archive</a>
        <a href="/weekly/">Weekly</a>
      </div>
    </div>
  `;
  const recent7Rows = (ctx.recent7 || []).map(item => {
    const score = item.score ?? '--';
    const range = item.equityRange || '--';
    return `<tr><td>${item.date}</td><td>${score}</td><td>${range}</td></tr>`;
  }).join('');
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_ROOT}/` },
      { "@type": "ListItem", "position": 2, "name": "Daily", "item": `${SITE_ROOT}/archive/` },
      { "@type": "ListItem", "position": 3, "name": date, "item": canonical }
    ]
  };
  const articleJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `Market Risk Index Today (MRI) — ${date}`,
    "datePublished": date,
    "dateModified": date,
    "mainEntityOfPage": canonical,
    "description": metaDesc,
    "author": { "@type": "Organization", "name": "FinLogicHub5" }
  };
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is the market risk index?", "acceptedAnswer": { "@type": "Answer", "text": "A structured score that summarizes stock market risk using trend, stress, and regime signals." } },
      { "@type": "Question", "name": "Does MRI predict returns?", "acceptedAnswer": { "@type": "Answer", "text": "No. It measures risk conditions and supports disciplined allocation decisions." } },
      { "@type": "Question", "name": "How should I use stock market risk signals?", "acceptedAnswer": { "@type": "Answer", "text": "Use MRI as a risk lens for position sizing and drawdown control, not as a buy or sell signal." } }
    ]
  };
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0B0F1A">
  <meta name="description" content="${metaDesc}">
  <title>Market Risk Index Today (MRI) — ${date} | Risk Level & Allocation</title>
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Market Risk Index Today (MRI) — ${date} | Risk Level & Allocation">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${date} 市场风险状态 - FinLogicHub5">
  <meta name="twitter:description" content="${metaDesc}">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
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
  <script type="application/ld+json">${JSON.stringify(articleJson)}</script>
  <script type="application/ld+json">${JSON.stringify(faqJson)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>
  <style>
    :root { --bg:#0B0F1A; --panel:rgba(12,19,32,0.7); --text:#E5EDFF; --muted:#8FA3C8; --green:#4ADE80; --yellow:#FACC15; --red:#F87171; --cyan:#00E5FF; --purple:#7B61FF; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Space Grotesk","Noto Sans SC",sans-serif; background:#0B0F1A; color:var(--text); }
    .container { max-width: 980px; margin:0 auto; padding: 24px; }
    .nav { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted); }
    .nav a { padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.05); }
    h1 { margin:16px 0 6px 0; font-size: clamp(28px, 5vw, 48px); }
    .meta { color: var(--muted); font-size: 12px; }
    .panel { margin-top:16px; padding:18px; border-radius:16px; background:var(--panel); border:1px solid rgba(255,255,255,0.08); }
    .row { display:flex; gap:16px; flex-wrap:wrap; }
    .score { font-size: 56px; font-weight: 700; }
    .pill { padding:6px 10px; border-radius:999px; font-size:12px; background:rgba(255,255,255,0.05); }
    .alloc { margin-top:12px; display:grid; gap:6px; font-size:14px; }
    .chart { margin-top:16px; }
    .ads { margin:16px 0; padding:14px; border:1px dashed rgba(255,255,255,0.15); border-radius:12px; color:var(--muted); font-size:12px; min-height:120px; display:flex; align-items:center; justify-content:center; }
    .ads[data-loaded="false"] { opacity: 0.6; }
    .footer-links { margin-top:16px; display:flex; gap:12px; flex-wrap:wrap; font-size:12px; }
    .alert-banner { margin-top:12px; padding:10px 14px; border-radius:12px; background:rgba(248,113,113,0.18); border:1px solid rgba(248,113,113,0.35); font-size:13px; }
    .progress { position: fixed; top:0; left:0; height:3px; width:0%; background:#00E5FF; z-index:99; }
    .cta-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
    .cta-btn { padding:8px 12px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); font-size:12px; }
    .scroll-prompt { position: fixed; bottom: 20px; right: 20px; background: rgba(0,229,255,0.15); border:1px solid rgba(0,229,255,0.35); padding:10px 12px; border-radius:12px; font-size:12px; display:none; }
  </style>
</head>
<body>
  <div class="progress" id="readProgress"></div>
  <div class="container">
    <div class="nav">
      <a href="/">Daily Risk</a>
      <a href="/weekly/">Weekly Strategy</a>
      <a href="/archive/">Risk Archive</a>
      <a href="/methodology/">Methodology</a>
      <a href="/lab/">Lab</a>
    </div>
    <h1>Market Risk Index — ${date}</h1>
    <div class="meta">Report date based on America/New_York timezone.</div>
    ${alertBanner}

    <div class="panel">
      <div class="row" style="align-items:center;">
        <div class="score">${riskIndex.score ?? '--'}</div>
        <div>
          <div class="pill">Risk Level: ${(riskIndex.level || '--').toUpperCase()}</div>
          <div class="meta" style="margin-top:8px;">Δ vs Yesterday: ${deltaText}</div>
        </div>
      </div>
      <div class="alloc">
        <div>Suggested Allocation — Equity ${alloc.equity}</div>
        <div>Bond ${alloc.bond} · Cash ${alloc.cash}</div>
      </div>
      <div class="meta" style="margin-top:8px;">Components: Trend ${riskIndex.components?.trend ?? '--'} · Stress ${riskIndex.components?.stress ?? '--'} · Regime ${riskIndex.components?.regime ?? '--'}</div>
      <div class="meta">Method ${riskIndex.methodVersion || 'MRI-1.0'} · ${riskIndex.explanation || ''}</div>
    </div>

    <div class="ads" data-ad-slot="daily-top" data-loaded="false">Ad Slot — Top</div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Key Takeaways</h2>
      <div class="meta">Risk level today: ${(riskIndex.level || '--').toUpperCase()}</div>
      <div class="meta">Allocation guidance: Equity ${alloc.equity}</div>
      <div class="meta">Regime context: ${regimeContext}</div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Key Takeaways</h2>
      <div class="meta">Risk level today: ${(riskIndex.level || '--').toUpperCase()}</div>
      <div class="meta">Allocation guidance: Equity ${alloc.equity}</div>
      <div class="meta">Regime context: ${regimeContext}</div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Regime Context</h2>
      <p class="meta" style="line-height:1.7;">${regimeContext}</p>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Explanation</h2>
      <p class="meta" style="line-height:1.7;">${explanation}</p>
    </div>

    <div class="panel chart">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Risk Trend</h2>
      <div style="height:160px;">
        <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
          <polyline fill="none" stroke="#00E5FF" stroke-width="2" points="${(ctx.trendSeries || []).map((v, i, arr) => {
            const x = (i / Math.max(1, arr.length - 1)) * 600;
            const y = 140 - (v / 100) * 120;
            return `${x},${y}`;
          }).join(' ')}" />
        </svg>
      </div>
    </div>

    <div class="ads" data-ad-slot="daily-mid" data-loaded="false">Ad Slot — Mid</div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">What Changed</h2>
      <p class="meta" style="line-height:1.7;">${(reasons || []).slice(0,3).join(' · ') || 'Risk components remained within expected ranges.'}</p>
      <p class="meta" style="margin-top:6px;">${actionHint}</p>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Recent 7-Day Allocation</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;color:#cbd5f5;">
        <thead><tr><th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Date</th><th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Risk</th><th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Allocation</th></tr></thead>
        <tbody>${recent7Rows || '<tr><td colspan=\"3\" style=\"padding:8px 0;\">No data</td></tr>'}</tbody>
      </table>
    </div>

    ${relatedLinks}

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Similar Risk Periods</h2>
      <div class="footer-links">${similar}</div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Continue Reading</h2>
      <div class="footer-links">
        ${prevLink ? `<a href="${prevLink}" data-track="daily_next_prev_click" data-direction="prev">Previous Day</a>` : ''}
        ${nextLink ? `<a href="${nextLink}" data-track="daily_next_prev_click" data-direction="next">Next Day</a>` : ''}
        <a href="/weekly/" data-track="daily_next_steps_click" data-target="weekly">Weekly Strategy</a>
        <a href="/archive/" data-track="daily_next_steps_click" data-target="archive">Risk History</a>
      </div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Next Steps</h2>
      <div class="cta-row">
        ${nextLink ? `<a class="cta-btn" href="${nextLink}" data-track="daily_next_steps_click" data-target="next">Next day</a>` : ''}
        ${prevLink ? `<a class="cta-btn" href="${prevLink}" data-track="daily_next_steps_click" data-target="prev">Previous day</a>` : ''}
        <a class="cta-btn" href="/weekly/" data-track="daily_next_steps_click" data-target="weekly">Weekly strategy</a>
        <a class="cta-btn" href="/alerts/" data-track="daily_next_steps_click" data-target="alerts">Alerts history</a>
      </div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">You may also want to check</h2>
      <div class="footer-links">
        ${nextLink ? `<a href="${nextLink}" data-track="daily_next_steps_click" data-target="next">Next day report</a>` : ''}
        <a href="/weekly/" data-track="daily_next_steps_click" data-target="weekly">Weekly strategy</a>
        <a href="/pillar/market-risk-framework/" data-track="daily_next_steps_click" data-target="pillar">Risk framework</a>
        <a href="/archive/" data-track="daily_next_steps_click" data-target="archive">Risk history</a>
      </div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 8px 0; font-size:18px;">Next Steps</h2>
      <div class="cta-row">
        ${nextLink ? `<a class="cta-btn" href="${nextLink}" data-track="daily_next_steps_click" data-target="next">Next day</a>` : ''}
        ${prevLink ? `<a class="cta-btn" href="${prevLink}" data-track="daily_next_steps_click" data-target="prev">Previous day</a>` : ''}
        <a class="cta-btn" href="/weekly/" data-track="daily_next_steps_click" data-target="weekly">Weekly strategy</a>
        <a class="cta-btn" href="/alerts/" data-track="daily_next_steps_click" data-target="alerts">Alerts history</a>
      </div>
    </div>

    <div class="ads" data-ad-slot="daily-mid-2" data-loaded="false">Ad Slot — Mid 2</div>

    <div class="ads" data-ad-slot="daily-footer" data-loaded="false">Ad Slot — Footer</div>

    <div class="footer-links">
      ${prevLink ? `<a href="${prevLink}">Yesterday (${ctx.prevDate})</a>` : ''}
      ${nextLink ? `<a href="${nextLink}">Next (${ctx.nextDate})</a>` : ''}
      <a href="/archive/">Risk Archive</a>
      <a href="/weekly/">Weekly Strategy</a>
    </div>
  </div>

  <script>
    (function() {
      const bar = document.getElementById('readProgress');
      const onScroll = () => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        const pct = total > 0 ? (doc.scrollTop / total) * 100 : 0;
        bar.style.width = pct + '%';
      };
      document.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();
    (function() {
      var slots = document.querySelectorAll('.ads[data-ad-slot]');
      if (!('IntersectionObserver' in window)) {
        slots.forEach(function(s) { s.dataset.loaded = 'true'; });
        return;
      }
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.dataset.loaded = 'true';
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });
      slots.forEach(function(slot) { observer.observe(slot); });
    })();

    (function() {
      const prompt = document.createElement('div');
      prompt.className = 'scroll-prompt';
      prompt.textContent = "Check tomorrow’s risk update →";
      document.body.appendChild(prompt);
      let shown = false;
      const onScroll = () => {
        if (shown) return;
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        if (total <= 0) return;
        const pct = doc.scrollTop / total;
        if (pct >= 0.9) {
          prompt.style.display = 'block';
          shown = true;
          if (window.track) window.track('daily_scroll_end', { pct: 0.9 });
          setTimeout(() => { prompt.style.display = 'none'; }, 5000);
        }
      };
      document.addEventListener('scroll', onScroll, { passive: true });
    })();

    function trackEvent(name, payload) {
      if (window.track) window.track(name, payload || {});
    }
    document.querySelectorAll('[data-track]').forEach(function(el) {
      el.addEventListener('click', function() {
        trackEvent(el.dataset.track, { target: el.dataset.target || '', direction: el.dataset.direction || '' });
      });
    });
  </script>
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
        urlHtml: `/daily/${date}`,
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

function getPrevDailyData(excludeDate) {
  const files = listArchiveJsons();
  if (!files.length) return null;
  const dates = files.map(f => f.slice(0, 10)).sort();
  let idx = dates.length - 1;
  if (excludeDate) {
    const found = dates.indexOf(excludeDate);
    idx = found > 0 ? found - 1 : (found === 0 ? -1 : dates.length - 1);
  }
  if (idx < 0) return null;
  const date = dates[idx];
  const jsonPath = path.join(ARCHIVE_DIR, `${date}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const risk = data.riskIndex || data.marketRisk || {};
    return { date, risk };
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

function mapLevelToRegime(level) {
  if (level === 'low') return 'risk_on';
  if (level === 'high') return 'risk_off';
  return 'neutral';
}

function buildDailyAlerts(todayRisk, prevRisk, date) {
  const alerts = [];
  if (!todayRisk || !date) return alerts;
  const todayLevel = todayRisk.level || '';
  const todayRegime = mapLevelToRegime(todayLevel);
  const prevLevel = prevRisk?.level || '';
  const prevRegime = prevLevel ? mapLevelToRegime(prevLevel) : null;
  if (prevRegime && todayRegime !== prevRegime) {
    alerts.push({ type: 'regime_change', from: prevRegime, to: todayRegime, date });
  }
  const score = Number(todayRisk.score);
  const prevScore = Number(prevRisk?.score);
  if (Number.isFinite(score)) {
    if (score > 70 && (!Number.isFinite(prevScore) || prevScore <= 70)) {
      alerts.push({ type: 'threshold_high', level: 'high', score, date });
    }
    if (score < 30 && (!Number.isFinite(prevScore) || prevScore >= 30)) {
      alerts.push({ type: 'threshold_low', level: 'low', score, date });
    }
  }
  return alerts;
}

function mergeAlertHistory(history, alerts) {
  const list = Array.isArray(history) ? history.slice() : [];
  const key = (a) => `${a.type}:${a.date}:${a.from || ''}:${a.to || ''}:${a.level || ''}`;
  const seen = new Set(list.map(key));
  alerts.forEach((a) => {
    const k = key(a);
    if (!seen.has(k)) {
      list.push(a);
      seen.add(k);
    }
  });
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  return list;
}

function alertHeadline(alerts) {
  if (!Array.isArray(alerts) || !alerts.length) return '';
  const hasRegime = alerts.find(a => a.type === 'regime_change');
  if (hasRegime) return 'Risk Alert: Regime Changed';
  const hasHigh = alerts.find(a => a.type === 'threshold_high');
  if (hasHigh) return 'High Risk Warning';
  const hasLow = alerts.find(a => a.type === 'threshold_low');
  if (hasLow) return 'Low Risk Warning';
  return 'Risk Alert Triggered';
}

function renderAlertsPage(alertHistory = []) {
  const rows = alertHistory.map(item => {
    const label = item.type === 'regime_change'
      ? `Regime Change: ${item.from} → ${item.to}`
      : item.type === 'threshold_high'
        ? 'High Risk Alert'
        : item.type === 'threshold_low'
          ? 'Low Risk Alert'
          : item.type;
    return `<tr><td>${item.date}</td><td>${label}</td><td><a href="/daily/${item.date}">Daily</a></td></tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0B0F1A">
  <title>Risk Alerts — FinLogicHub5</title>
  <meta name="description" content="Historical market risk alerts, including regime changes and threshold warnings.">
  <link rel="canonical" href="${SITE_ROOT}/alerts/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Risk Alerts — FinLogicHub5">
  <meta property="og:description" content="Historical market risk alerts, including regime changes and threshold warnings.">
  <meta property="og:url" content="${SITE_ROOT}/alerts/">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <style>
    body { margin:0; font-family:"Space Grotesk", sans-serif; background:#0B0F1A; color:#E5EDFF; }
    .container { max-width: 860px; margin:0 auto; padding:24px; }
    table { width:100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding:10px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:left; }
    a { color:#7DD3FC; text-decoration:none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Risk Alerts</h1>
    <p><a href="${SUBSCRIBE_URL}">Subscribe for alerts</a></p>
    <p>Historical alerts for regime changes and risk thresholds.</p>
    <table>
      <thead><tr><th>Date</th><th>Alert</th><th>Daily</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3">No alerts recorded.</td></tr>'}</tbody>
    </table>
  </div>
</body>
</html>`;
}

function renderSeoStatus() {
  const seoRoot = path.resolve(__dirname, '..', 'public', 'seo');
  const pillarRoot = path.resolve(__dirname, '..', 'public', 'pillar');
  let total = 0;
  let todayCount = 0;
  let todayDate = '';
  if (fs.existsSync(seoRoot)) {
    const dates = fs.readdirSync(seoRoot).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    dates.forEach((d) => {
      const dir = path.join(seoRoot, d);
      const slugs = fs.readdirSync(dir).filter(s => fs.existsSync(path.join(dir, s, 'index.html')));
      total += slugs.length;
    });
    if (dates.length) {
      todayDate = dates[dates.length - 1];
      const idxPath = path.join(seoRoot, todayDate, 'index.json');
      if (fs.existsSync(idxPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(idxPath, 'utf-8'));
          todayCount = data.count || 0;
        } catch (e) {}
      } else {
        const slugs = fs.readdirSync(path.join(seoRoot, todayDate)).filter(s => fs.existsSync(path.join(seoRoot, todayDate, s, 'index.html')));
        todayCount = slugs.length;
      }
    }
  }
  let pillarCount = 0;
  if (fs.existsSync(pillarRoot)) {
    pillarCount = fs.readdirSync(pillarRoot).filter(p => fs.existsSync(path.join(pillarRoot, p, 'index.html'))).length;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0B0F1A">
  <title>SEO Status — FinLogicHub5</title>
  <meta name="description" content="SEO status dashboard for FinLogicHub5: total pages, today’s new pages, and pillar count.">
  <link rel="canonical" href="${SITE_ROOT}/seo-status/">
  <style>
    body { margin:0; font-family:"Space Grotesk", sans-serif; background:#0B0F1A; color:#E5EDFF; }
    .container { max-width: 820px; margin:0 auto; padding: 32px 24px; }
    .card { margin-top:16px; padding:18px; border-radius:16px; background:rgba(12,19,32,0.7); border:1px solid rgba(255,255,255,0.08); }
    .metric { font-size: 28px; font-weight: 700; }
    .muted { color:#8FA3C8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SEO Status</h1>
    <div class="card">
      <div class="muted">Total SEO pages</div>
      <div class="metric">${total}</div>
    </div>
    <div class="card">
      <div class="muted">Today new pages (${todayDate || '—'})</div>
      <div class="metric">${todayCount}</div>
    </div>
    <div class="card">
      <div class="muted">Pillar pages</div>
      <div class="metric">${pillarCount}</div>
    </div>
  </div>
</body>
</html>`;
}

function renderGrowthStatus() {
  const seoRoot = path.resolve(__dirname, '..', 'public', 'seo');
  const pillarRoot = path.resolve(__dirname, '..', 'public', 'pillar');
  const dailyRoot = path.resolve(__dirname, '..', 'public', 'daily');
  const sitemapPath = path.resolve(__dirname, '..', 'public', 'sitemap.xml');
  let totalSeo = 0;
  let todaySeo = 0;
  let latestSeoDate = '';
  if (fs.existsSync(seoRoot)) {
    const dates = fs.readdirSync(seoRoot).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    dates.forEach((d) => {
      const dir = path.join(seoRoot, d);
      const slugs = fs.readdirSync(dir).filter(s => fs.existsSync(path.join(dir, s, 'index.html')));
      totalSeo += slugs.length;
    });
    if (dates.length) {
      latestSeoDate = dates[dates.length - 1];
      const idxPath = path.join(seoRoot, latestSeoDate, 'index.json');
      if (fs.existsSync(idxPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(idxPath, 'utf-8'));
          todaySeo = data.count || 0;
        } catch (e) {}
      }
    }
  }
  let pillarCount = 0;
  if (fs.existsSync(pillarRoot)) {
    pillarCount = fs.readdirSync(pillarRoot).filter(p => fs.existsSync(path.join(pillarRoot, p, 'index.html'))).length;
  }
  let dailyCount = 0;
  if (fs.existsSync(dailyRoot)) {
    dailyCount = fs.readdirSync(dailyRoot).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).length;
  }
  let sitemapCount = 0;
  if (fs.existsSync(sitemapPath)) {
    try {
      const xml = fs.readFileSync(sitemapPath, 'utf-8');
      sitemapCount = (xml.match(/<url>/g) || []).length;
    } catch (e) {}
  }
  let latestDaily = '';
  try {
    const daily = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'public', 'data', 'daily.json'), 'utf-8'));
    latestDaily = daily.date || '';
  } catch (e) {}
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0B0F1A">
  <title>Growth Dashboard — FinLogicHub5</title>
  <meta name="description" content="Growth monitoring for FinLogicHub5: page counts, sitemap size, latest daily, SEO matrix stats.">
  <link rel="canonical" href="${SITE_ROOT}/growth/">
  <style>
    body { margin:0; font-family:"Space Grotesk", sans-serif; background:#0B0F1A; color:#E5EDFF; }
    .container { max-width: 820px; margin:0 auto; padding: 32px 24px; }
    .card { margin-top:16px; padding:18px; border-radius:16px; background:rgba(12,19,32,0.7); border:1px solid rgba(255,255,255,0.08); }
    .metric { font-size: 28px; font-weight: 700; }
    .muted { color:#8FA3C8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Growth Dashboard</h1>
    <div class="card"><div class="muted">Sitemap URL count</div><div class="metric">${sitemapCount}</div></div>
    <div class="card"><div class="muted">Total SEO pages</div><div class="metric">${totalSeo}</div></div>
    <div class="card"><div class="muted">Latest SEO Matrix (${latestSeoDate || '—'})</div><div class="metric">${todaySeo}</div></div>
    <div class="card"><div class="muted">Pillar pages</div><div class="metric">${pillarCount}</div></div>
    <div class="card"><div class="muted">Daily pages</div><div class="metric">${dailyCount}</div></div>
    <div class="card"><div class="muted">Latest Daily</div><div class="metric">${latestDaily || '—'}</div></div>
  </div>
</body>
</html>`;
}

function injectGa4ToHtml() {
  const root = path.resolve(__dirname, '..', 'public');
  const inject = (file) => {
    if (!file.endsWith('.html')) return;
    let html = '';
    try { html = fs.readFileSync(file, 'utf-8'); } catch { return; }
    if (html.includes(`gtag/js?id=${GA_ID}`)) return;
    if (!html.includes('</head>')) return;
    const updated = html.replace('</head>', `${GA_SNIPPET}\n</head>`);
    fs.writeFileSync(file, updated);
  };
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else inject(full);
    });
  };
  walk(root);
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

function findSimilarRiskDates(history, targetScore, currentDate, limit = 5) {
  if (!Array.isArray(history) || !Number.isFinite(targetScore)) return [];
  return history
    .filter(r => r.date !== currentDate && Number.isFinite(r.score))
    .map(r => ({ date: r.date, score: r.score, diff: Math.abs(r.score - targetScore) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, limit);
}

function calcMomentum(history) {
  if (!Array.isArray(history) || history.length < 10) return "Stable";
  const scores = history.map(h => Number(h.score)).filter(v => Number.isFinite(v));
  if (scores.length < 10) return "Stable";
  const last5 = scores.slice(-5);
  const prev5 = scores.slice(-10, -5);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const recent = avg(last5);
  const previous = avg(prev5);
  if (recent > previous) return "Rising";
  if (recent < previous) return "Falling";
  return "Stable";
}

function calcRegimeDuration(history, idx) {
  if (!Array.isArray(history) || history.length === 0) return 0;
  const i = Number.isFinite(idx) ? idx : history.length - 1;
  const current = history[i]?.level;
  if (!current) return 0;
  let count = 1;
  for (let j = i - 1; j >= 0; j -= 1) {
    if (history[j]?.level === current) count += 1;
    else break;
  }
  return count;
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
  const pagesDir = path.resolve(__dirname, '..', 'public', 'pages');
  let seoPages = [];
  try {
    seoPages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  } catch (e) {
    seoPages = [];
  }
  const urls = [
    { loc: `${SITE_ROOT}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_ROOT}/daily.html`, changefreq: 'daily', priority: '0.6', lastmod: today },
    { loc: `${SITE_ROOT}/weekly/`, changefreq: 'weekly', priority: '0.6', lastmod: today },
    { loc: `${SITE_ROOT}/archive/`, changefreq: 'daily', priority: '0.6', lastmod: today },
    { loc: `${SITE_ROOT}/methodology/`, changefreq: 'monthly', priority: '0.5', lastmod: today },
    { loc: `${SITE_ROOT}/lab/`, changefreq: 'monthly', priority: '0.4', lastmod: today },
    { loc: `${SITE_ROOT}/lab/backtest/`, changefreq: 'monthly', priority: '0.3', lastmod: today },
    { loc: `${SITE_ROOT}/lab/ai-analysis/`, changefreq: 'monthly', priority: '0.3', lastmod: today },
    { loc: `${SITE_ROOT}/lab/research/`, changefreq: 'monthly', priority: '0.3', lastmod: today },
    { loc: `${SITE_ROOT}/market-risk-index.html`, changefreq: 'daily', priority: '0.7', lastmod: today },
    { loc: `${SITE_ROOT}/alerts/`, changefreq: 'daily', priority: '0.5', lastmod: today },
    { loc: `${SITE_ROOT}/thanks/`, changefreq: 'monthly', priority: '0.3', lastmod: today },
    { loc: `${SITE_ROOT}/privacy/`, changefreq: 'monthly', priority: '0.3', lastmod: today },
    { loc: `${SITE_ROOT}/unsubscribe/`, changefreq: 'monthly', priority: '0.3', lastmod: today },
    { loc: `${SITE_ROOT}/seo-status/`, changefreq: 'daily', priority: '0.4', lastmod: today },
    { loc: `${SITE_ROOT}/about/`, changefreq: 'monthly', priority: '0.4', lastmod: today },
    { loc: `${SITE_ROOT}/growth/`, changefreq: 'daily', priority: '0.4', lastmod: today },
    { loc: `${SITE_ROOT}/press/`, changefreq: 'monthly', priority: '0.4', lastmod: today },
    { loc: `${SITE_ROOT}/stock.html`, changefreq: 'daily', priority: '0.6', lastmod: today },
    { loc: `${SITE_ROOT}/privacy.html`, changefreq: 'monthly', priority: '0.3', lastmod: getMtimeDate(PRIVACY_PATH) },
    { loc: `${SITE_ROOT}/disclaimer.html`, changefreq: 'monthly', priority: '0.3', lastmod: getMtimeDate(DISCLAIMER_PATH) }
  ];
  const growthPages = [
    'risk-levels',
    'risk-regime',
    'risk-history',
    'market-risk-explained',
    'asset-allocation-guide',
    'risk-regime-history',
    'market-risk-today'
  ];
  growthPages.forEach((slug) => {
    urls.push({ loc: `${SITE_ROOT}/${slug}/`, changefreq: 'monthly', priority: '0.5', lastmod: today });
  });
  seoPages.forEach((file) => {
    urls.push({ loc: `${SITE_ROOT}/pages/${file}`, changefreq: 'monthly', priority: '0.4', lastmod: today });
  });
  const riskDir = path.resolve(__dirname, '..', 'public', 'risk');
  if (fs.existsSync(riskDir)) {
    const years = fs.readdirSync(riskDir).filter(y => /^\d{4}$/.test(y));
    years.forEach((y) => {
      const yDir = path.join(riskDir, y);
      const months = fs.readdirSync(yDir).filter(m => /^\d{2}$/.test(m));
      months.forEach((m) => {
        urls.push({ loc: `${SITE_ROOT}/risk/${y}/${m}/`, changefreq: 'monthly', priority: '0.4', lastmod: today });
      });
    });
  }
  const seoRoot = path.resolve(__dirname, '..', 'public', 'seo');
  if (fs.existsSync(seoRoot)) {
    const dates = fs.readdirSync(seoRoot).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    dates.forEach((d) => {
      const dateDir = path.join(seoRoot, d);
      const slugs = fs.readdirSync(dateDir).filter(s => fs.existsSync(path.join(dateDir, s, 'index.html')));
      slugs.forEach((s) => {
        urls.push({ loc: `${SITE_ROOT}/seo/${d}/${s}/`, changefreq: 'daily', priority: '0.3', lastmod: d });
      });
    });
  }
  const pillarRoot = path.resolve(__dirname, '..', 'public', 'pillar');
  if (fs.existsSync(pillarRoot)) {
    const pillars = fs.readdirSync(pillarRoot).filter(p => fs.existsSync(path.join(pillarRoot, p, 'index.html')));
    pillars.forEach((p) => {
      urls.push({ loc: `${SITE_ROOT}/pillar/${p}/`, changefreq: 'monthly', priority: '0.6', lastmod: today });
    });
  }
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
  const reportDate = getDateInTZ();
  const reportHtmlPath = path.join(ARCHIVE_DIR, reportDate, 'index.html');
  const reportJsonPath = path.join(ARCHIVE_DIR, `${reportDate}.json`);
  let daily = null;
  let reuseExisting = false;
  if (fs.existsSync(reportHtmlPath)) {
    try {
      const html = fs.readFileSync(reportHtmlPath, 'utf-8');
      const ok = html.includes(`Market Risk Index — ${reportDate}`)
        && html.includes('Report date based on America/New_York timezone.')
        && html.includes('Risk Archive')
        && html.includes('Risk Trend')
        && html.includes('Ad Slot');
      if (ok && fs.existsSync(reportJsonPath)) {
        daily = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'));
        daily.dataStatus = status;
        reuseExisting = true;
        console.log(`report exists, reuse daily data: ${reportJsonPath}`);
      }
    } catch (e) {}
  }

  if (!daily) {
    daily = buildDaily(data, reportDate);
  }
  if (!reuseExisting) {
    daily = applySmoothing(daily, yesterday);
    delete daily._ctx;
  }
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

  const dailyHubPath = path.resolve(__dirname, '..', 'public', 'pages', 'daily-hub.html');
  try {
    const dailyHub = renderDailyHub(recent30);
    fs.mkdirSync(path.dirname(dailyHubPath), { recursive: true });
    fs.writeFileSync(dailyHubPath, dailyHub);
  } catch (e) {}

  const riskHistory = buildRiskIndexHistory(90);
  fs.writeFileSync(RISK_INDEX_HISTORY_PATH, JSON.stringify(riskHistory, null, 2));
  console.log('risk_index_history.json updated:', RISK_INDEX_HISTORY_PATH);

  const momentum = calcMomentum(riskHistory);
  const regimeDuration = calcRegimeDuration(riskHistory);
  daily = {
    ...daily,
    riskIndex: {
      ...daily.riskIndex,
      momentum,
      regimeDuration
    }
  };
  fs.writeFileSync(RISK_INDEX_PATH, JSON.stringify(daily.riskIndex, null, 2));
  fs.writeFileSync(OUT_PATH, JSON.stringify(daily, null, 2));
  fs.writeFileSync(archiveJsonPath, JSON.stringify(daily, null, 2));

  const prevDaily = getPrevDailyData(daily.date);
  const todayAlerts = buildDailyAlerts(daily.riskIndex, prevDaily?.risk, daily.date);
  let existingAlerts = null;
  if (fs.existsSync(RISK_ALERTS_PATH)) {
    try { existingAlerts = JSON.parse(fs.readFileSync(RISK_ALERTS_PATH, 'utf-8')); } catch (e) {}
  }
  const historyList = Array.isArray(existingAlerts)
    ? existingAlerts
    : (existingAlerts && Array.isArray(existingAlerts.history) ? existingAlerts.history : []);
  const mergedHistory = mergeAlertHistory(historyList, todayAlerts);
  const alertPayload = { date: daily.date, alerts: todayAlerts, history: mergedHistory };
  fs.writeFileSync(RISK_ALERTS_PATH, JSON.stringify(alertPayload, null, 2));
  console.log('risk_alerts.json updated:', RISK_ALERTS_PATH);
  fs.mkdirSync(ALERTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ALERTS_DIR, 'index.html'), renderAlertsPage(mergedHistory));
  fs.mkdirSync(ALERTS_API_DIR, { recursive: true });
  const apiPayload = { date: daily.date, hasAlert: todayAlerts.length > 0, alerts: todayAlerts };
  fs.writeFileSync(path.join(ALERTS_API_DIR, 'index.json'), JSON.stringify(apiPayload, null, 2));
  fs.writeFileSync(path.join(ALERTS_API_DIR, 'index.html'), JSON.stringify(apiPayload, null, 2));
  fs.mkdirSync(ALERTS_TODAY_DIR, { recursive: true });
  const alertsTodayPayload = {
    date: daily.date,
    hasAlerts: todayAlerts.length > 0,
    alerts: todayAlerts,
    dailyUrl: `${SITE_ROOT}/daily/${daily.date}`,
    alertsUrl: `${SITE_ROOT}/alerts/`
  };
  fs.writeFileSync(path.join(ALERTS_TODAY_DIR, 'index.json'), JSON.stringify(alertsTodayPayload, null, 2));

  const seoStatusDir = path.resolve(__dirname, '..', 'public', 'seo-status');
  fs.mkdirSync(seoStatusDir, { recursive: true });
  fs.writeFileSync(path.join(seoStatusDir, 'index.html'), renderSeoStatus());

  const growthDir = path.resolve(__dirname, '..', 'public', 'growth');
  fs.mkdirSync(growthDir, { recursive: true });
  fs.writeFileSync(path.join(growthDir, 'index.html'), renderGrowthStatus());

  injectGa4ToHtml();

  fs.mkdirSync(OG_DIR, { recursive: true });
  const svg = buildShareSvg(daily);
  const ogDatePath = path.join(OG_DIR, `mri-${daily.date}.svg`);
  const ogLatestPath = path.join(OG_DIR, `mri-latest.svg`);
  fs.writeFileSync(ogDatePath, svg);
  fs.writeFileSync(ogLatestPath, svg);
  console.log('og image updated:', ogLatestPath);

  const ogDatePng = path.join(OG_DIR, `mri-${daily.date}.png`);
  const ogLatestPng = path.join(OG_DIR, `mri-latest.png`);
  const ogDateWebp = path.join(OG_DIR, `mri-${daily.date}.webp`);
  const ogLatestWebp = path.join(OG_DIR, `mri-latest.webp`);
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
      const webpDate = await sharp(Buffer.from(svg))
        .resize(1200, 630, { fit: 'fill', background: '#0b162c' })
        .webp({ quality: 92 })
        .toBuffer();
      const webpLatest = await sharp(Buffer.from(svg))
        .resize(1200, 630, { fit: 'fill', background: '#0b162c' })
        .webp({ quality: 92 })
        .toBuffer();
      fs.writeFileSync(ogDateWebp, webpDate);
      fs.writeFileSync(ogLatestWebp, webpLatest);
      console.log('og webp updated:', ogLatestWebp);
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
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
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
      const htmlDir = path.join(ARCHIVE_DIR, d);
      const htmlPath = path.join(htmlDir, 'index.html');
      fs.mkdirSync(htmlDir, { recursive: true });
      const idx = dateIndex.get(d);
      const recent7 = riskHistory.slice(Math.max(0, idx - 6), idx + 1).map(row => ({
        date: row.date,
        score: row.score,
        equityRange: row.equityRange
      }));
      const html = renderArchiveHtml(data, {
        similar: findSimilarRiskDates(riskHistory, data.riskIndex?.score ?? data.marketRisk?.score ?? 0, data.date, 5),
        prevDate,
        nextDate,
        prevScore,
        trendSeries: riskHistory.slice(Math.max(0, idx - 89), idx + 1).map(r => r.score),
        regimeDuration: calcRegimeDuration(riskHistory, idx),
        recent7,
        alerts: (mergedHistory || []).filter(a => a.date === d)
      });
      fs.writeFileSync(htmlPath, html);
      // Legacy .html for backward compatibility
      fs.writeFileSync(path.join(ARCHIVE_DIR, `${d}.html`), html);
      if (d === daily.date) console.log('daily html written:', htmlPath);
    } catch (e) {}
  }

  const archiveHtmlFiles = recent30.map(item => `${item.date}`);
  writeSitemap(archiveHtmlFiles);
  console.log('sitemap.xml updated:', SITEMAP_PATH);
}

main().catch((err) => {
  console.error('generate_daily failed:', err.message);
  process.exitCode = 1;
});
