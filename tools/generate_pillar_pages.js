const fs = require("fs");
const path = require("path");

const SITE = "https://finlogichub5.com";
const OUT_DIR = path.resolve(__dirname, "..", "public", "pillar");
const SEO_ROOT = path.resolve(__dirname, "..", "public", "seo");
const RISK_HISTORY = path.resolve(__dirname, "..", "public", "data", "risk_index_history.json");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function latestSeoIndex() {
  if (!fs.existsSync(SEO_ROOT)) return null;
  const dates = fs.readdirSync(SEO_ROOT).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!dates.length) return null;
  const latest = dates[dates.length - 1];
  const p = path.join(SEO_ROOT, latest, "index.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function getChartPoints() {
  try {
    const hist = JSON.parse(fs.readFileSync(RISK_HISTORY, "utf-8"));
    const series = hist.slice(-30).map(h => h.score);
    if (!series.length) return "";
    return series.map((v, i) => {
      const x = (i / Math.max(1, series.length - 1)) * 600;
      const y = 140 - (v / 100) * 120;
      return `${x},${y}`;
    }).join(" ");
  } catch {
    return "0,120 100,110 200,115 300,90 400,80 500,70 600,60";
  }
}

function wordCount(text) {
  return text.trim().split(/\s+/).length;
}

function buildBody(topic) {
  const base = [
    `This pillar explains ${topic} through the Market Risk Index (MRI) lens. It is designed to help investors interpret stock market risk signals without turning them into short-term timing.`,
    `FinLogicHub5 uses a risk→allocation→action framework. The goal is to adjust exposure only when regime conditions shift or when risk thresholds are crossed.`,
    `The MRI combines trend, stress, and regime signals. Each component is evaluated on a consistent scale so that daily updates are comparable over time.`,
    `A good risk system should be stable, explainable, and actionable. Stability avoids whipsaw, explainability builds trust, and actionability improves portfolio outcomes.`,
    `Risk-on regimes typically support higher equity exposure, while risk-off regimes call for capital preservation. The neutral regime is a balance between the two.`,
    `Investors often confuse risk signals with return forecasts. MRI is not a return predictor. It is a structured gauge of market risk.`,
    `If you adjust allocation, do so with defined ranges. Use the same ranges consistently so you can measure whether the discipline helped over a full market cycle.`,
    `Regime duration matters. A short-lived risk-off regime may not require aggressive de-risking, while a long regime suggests sustained caution.`,
    `Review changes weekly. The daily signal is best used as an awareness tool rather than a daily trading trigger.`,
    `Use archives to study past regimes and compare outcomes. This builds intuition and avoids overconfidence.`,
  ];
  const sections = [];
  for (let i = 0; i < base.length; i++) {
    sections.push(`<p>${escapeHtml(base[i])}</p>`);
  }
  let joined = sections.join("\n");
  let words = wordCount(joined.replace(/<[^>]+>/g, " "));
  while (words < 2100) {
    const add = `<p>${escapeHtml(base[words % base.length])}</p>`;
    joined += "\n" + add;
    words = wordCount(joined.replace(/<[^>]+>/g, " "));
  }
  return joined;
}

function buildFaq() {
  return `
    <h2>FAQ</h2>
    <h3>Does MRI predict returns?</h3>
    <p>No. MRI summarizes market risk conditions to guide allocation decisions.</p>
    <h3>How often should I adjust allocation?</h3>
    <p>Typically weekly or only when regimes change or thresholds are crossed.</p>
    <h3>What is the biggest mistake?</h3>
    <p>Overreacting to small daily changes. Use regime context and guardrails.</p>
  `;
}

function buildJsonLd(title, description, url) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    author: { "@type": "Organization", name: "FinLogicHub5" },
    publisher: { "@type": "Organization", name: "FinLogicHub5" }
  });
}

function buildPage({ slug, title, description, links }) {
  const canonical = `${SITE}/pillar/${slug}/`;
  const chart = getChartPoints();
  const body = buildBody(title);
  const faq = buildFaq();
  const linksHtml = links.map(l => `<li><a href="${l.url}">${escapeHtml(l.title)}</a></li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | FinLogicHub5</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)} | FinLogicHub5" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE}/og/mri-latest.png" />
  <script type="application/ld+json">${buildJsonLd(title, description, canonical)}</script>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.7;background:#0B0F1A;color:#e8eefc}
    a{color:#00E5FF;text-decoration:none}
    a:hover{text-decoration:underline}
    .wrap{max-width:1100px;margin:0 auto;padding:48px 24px}
    .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:20px;margin:16px 0}
    .muted{opacity:.75}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="muted">FinLogicHub5 • Pillar Page</div>
      <h1 style="margin:10px 0 0;font-size:36px">${escapeHtml(title)}</h1>
      <div class="muted" style="margin-top:8px">${escapeHtml(description)}</div>
    </div>

    <div class="card">
      <h2>Risk Snapshot Chart</h2>
      <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
        <polyline fill="none" stroke="#00E5FF" stroke-width="2" points="${chart}" />
      </svg>
    </div>

    <div class="card">
      ${body}
      ${faq}
    </div>

    <div class="card">
      <h2>Explore related SEO pages</h2>
      <ul style="margin:0;padding-left:18px">${linksHtml}</ul>
    </div>

    <div class="card">
      <h2>Core links</h2>
      <ul style="margin:0;padding-left:18px">
        <li><a href="/">Daily Risk</a></li>
        <li><a href="/archive/">Risk Archive</a></li>
        <li><a href="/market-risk-index.html">Market Risk Index</a></li>
      </ul>
    </div>
  </div>
</body>
</html>`;
}

function main() {
  const index = latestSeoIndex();
  const pages = index?.pages || [];
  const defaultLinks = pages.slice(0, 10).map(p => ({ url: p.url, title: p.topic }));

  const pillars = [
    { slug: "market-risk-framework", title: "Market Risk Framework", description: "A comprehensive framework for interpreting market risk signals and allocation decisions." },
    { slug: "risk-regime-explained", title: "Risk Regime Explained", description: "A detailed guide to risk-on, neutral, and risk-off regimes and what they mean." },
    { slug: "asset-allocation-method", title: "Asset Allocation Method", description: "How to translate MRI signals into portfolio allocation decisions." },
    { slug: "market-risk-history-study", title: "Market Risk History Study", description: "Historical perspective on market risk cycles and regime shifts." },
    { slug: "regime-duration-analysis", title: "Regime Duration Analysis", description: "How regime duration impacts allocation timing and drawdown control." },
    { slug: "how-to-use-mri", title: "How to Use MRI", description: "A practical guide to using the Market Risk Index without over-trading." },
    { slug: "risk-signal-vs-timing", title: "Risk Signal vs Timing", description: "Why risk signals are different from market timing and how to use them responsibly." },
    { slug: "risk-for-etf-investors", title: "Risk for ETF Investors", description: "Applying risk signals to ETF portfolios and index exposure." },
    { slug: "portfolio-risk-management", title: "Portfolio Risk Management", description: "Risk management tactics aligned with regime signals and allocation bands." },
    { slug: "risk-threshold-strategy", title: "Risk Threshold Strategy", description: "How to use high/low risk thresholds to guide allocation changes." }
  ];

  ensureDir(OUT_DIR);
  pillars.forEach((pillar, i) => {
    const links = pages.slice(i * 10, i * 10 + 10).map(p => ({ url: p.url, title: p.topic }));
    const useLinks = links.length ? links : defaultLinks;
    const html = buildPage({ ...pillar, links: useLinks });
    const outFile = path.join(OUT_DIR, pillar.slug, "index.html");
    ensureDir(path.dirname(outFile));
    fs.writeFileSync(outFile, html, "utf-8");
  });

  console.log(`[pillar] generated ${pillars.length} pillar pages at public/pillar/`);
}

main();
