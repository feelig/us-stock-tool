/**
 * Batch 8.0 — SEO Scale Automation
 * Generates 100+ static SEO pages/day under: public/seo/YYYY-MM-DD/<slug>/index.html
 *
 * Usage:
 *   node tools/generate_seo_matrix.js --count 100
 *   node tools/generate_seo_matrix.js --date 2026-02-26 --count 120
 */
const fs = require("fs");
const path = require("path");

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeSlug(s) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function clearDir(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function writeFile(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf-8");
}

function htmlTemplate({ title, description, h1, bodyHtml, canonicalPath, pillarLink, pillarTitle }) {
  const site = "https://finlogichub5.com";
  const canonical = `${site}${canonicalPath}`;
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${site}/` },
      { "@type": "ListItem", "position": 2, "name": pillarTitle, "item": `${site}${pillarLink}` },
      { "@type": "ListItem", "position": 3, "name": title, "item": canonical }
    ]
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: canonical,
    publisher: { "@type": "Organization", name: "FinLogicHub5" },
  })}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>
  <style>
    /* keep ultra-light to protect performance */
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;background:#0B0F1A;color:#e8eefc}
    a{color:#00E5FF;text-decoration:none}
    a:hover{text-decoration:underline}
    .wrap{max-width:1100px;margin:0 auto;padding:48px 24px}
    .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:20px;margin:16px 0}
    .muted{opacity:.75}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
    .col8{grid-column:span 8}
    .col4{grid-column:span 4}
    @media(max-width:900px){.col8,.col4{grid-column:span 12}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="muted">FinLogicHub5 • Market Risk Operating System</div>
      <h1 style="margin:10px 0 0;font-size:36px">${escapeHtml(h1)}</h1>
      <div class="muted" style="margin-top:8px">${escapeHtml(description)}</div>
    </div>

    <div class="grid">
      <div class="col8">
        <div class="card">
          ${bodyHtml}
        </div>

        <div class="card">
          <h2 style="margin:0 0 8px">Framework</h2>
          <p><a href="${pillarLink}">${escapeHtml(pillarTitle)}</a></p>
        </div>
      </div>

      <div class="col4">
        <div class="card">
          <h3 style="margin:0 0 8px">Daily Signal</h3>
          <div class="muted">Check today’s risk signal and allocation guidance.</div>
          <div style="margin-top:12px"><a href="/">Open Daily Risk →</a></div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px">Archive</h3>
          <div class="muted">Browse historical risk reports and regime shifts.</div>
          <div style="margin-top:12px"><a href="/archive/">Open Archive →</a></div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px">Disclaimer</h3>
          <div class="muted">This content is for education only and not investment advice.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Page recipe generator ----------

function buildTopics() {
  // High-intent + long-tail topics for risk/asset allocation.
  // Keep them tightly aligned to "market risk signal + regime + allocation".
  const bases = [
    "what is market risk",
    "risk-on vs risk-off meaning",
    "how to size equity exposure",
    "allocation guidance by risk level",
    "what is a risk regime",
    "how to read a market risk index",
    "volatility stress and risk signals",
    "trend vs stress vs regime explained",
    "how to reduce risk in portfolios",
    "how to increase risk exposure safely",
    "when to rebalance allocation",
    "what triggers regime change",
    "risk regime duration explained",
    "market risk history by month",
    "how to use risk signals for ETFs",
    "SPY QQQ TLT GLD risk framework",
  ];

  // Expand with patterns (monthly / threshold / regime-duration)
  const months = [
    "2023-01","2023-02","2023-03","2023-04","2023-05","2023-06",
    "2024-01","2024-02","2024-03","2024-04","2024-05","2024-06",
    "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06",
  ];

  const expanded = [];
  for (const m of months) expanded.push(`market risk in ${m}`);
  for (const x of [30, 40, 50, 60, 70]) expanded.push(`what does MRI ${x} mean`);
  for (const d of [7, 14, 30, 60]) expanded.push(`risk regime lasting ${d} days: what it implies`);
  const assets = [
    "equity",
    "bonds",
    "cash",
    "gold",
    "commodities",
    "crypto",
    "etf portfolio",
    "retirement portfolio",
  ];
  const riskLevels = [
    "risk-on",
    "neutral",
    "risk-off",
    "high risk",
    "low risk",
    "medium risk",
  ];
  const ranges = [
    "today",
    "this week",
    "this month",
    "2024",
    "2025",
    "long term",
    "short term",
  ];
  const combos = [];
  for (const level of riskLevels) {
    for (const asset of assets) {
      combos.push(`${level} allocation for ${asset}`);
      combos.push(`${level} strategy for ${asset}`);
      combos.push(`${level} risk level for ${asset}`);
    }
  }
  for (const level of riskLevels) {
    for (const range of ranges) {
      combos.push(`${level} allocation ${range}`);
      combos.push(`${level} risk outlook ${range}`);
    }
  }
  for (const asset of assets) {
    for (const d of [7, 14, 30, 60, 90]) {
      combos.push(`risk regime lasting ${d} days for ${asset}`);
      combos.push(`regime duration ${d} days for ${asset}`);
    }
  }
  for (const asset of assets) {
    combos.push(`market risk for ${asset}`);
    combos.push(`market risk signals for ${asset}`);
    combos.push(`market risk strategy for ${asset}`);
  }
  for (const range of ranges) {
    combos.push(`market risk outlook ${range}`);
    combos.push(`risk regime outlook ${range}`);
  }
  return [...bases, ...expanded, ...combos];
}

function pickPillarLink(slug) {
  const pillars = [
    { href: "/pillar/market-risk-framework/", title: "market risk framework" },
    { href: "/pillar/risk-regime-explained/", title: "risk regime explained" },
    { href: "/pillar/asset-allocation-method/", title: "asset allocation strategy" },
    { href: "/pillar/market-risk-history-study/", title: "market risk index model" },
    { href: "/pillar/regime-duration-analysis/", title: "regime duration analysis" },
    { href: "/pillar/how-to-use-mri/", title: "market risk index model" },
    { href: "/pillar/risk-signal-vs-timing/", title: "market risk framework" },
    { href: "/pillar/risk-for-etf-investors/", title: "asset allocation strategy" },
    { href: "/pillar/portfolio-risk-management/", title: "market risk framework" },
    { href: "/pillar/risk-threshold-strategy/", title: "risk regime explained" }
  ];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return pillars[hash % pillars.length];
}

function buildPageContent(topic, context) {
  const { dateISO } = context;
  const h1 = topic.replace(/\b\w/g, (c) => c.toUpperCase());

  // Keep content 800-1400 words equivalent via structured blocks (without heavy libs).
  const bodyHtml = `
    <p class="muted">Updated: ${escapeHtml(dateISO)} • Focus: market risk signals, regime, and allocation guidance.</p>

    <h2>What this means</h2>
    <p>FinLogicHub5 is built around a simple operating loop: <b>risk → allocation → action</b>. This page explains <b>${escapeHtml(topic)}</b> in that framework so you can interpret daily risk signals without turning it into day trading.</p>

    <h2>How to use it (practical)</h2>
    <ul>
      <li><b>Daily:</b> check if risk level changed vs yesterday (signal update).</li>
      <li><b>Weekly:</b> use the weekly strategy page to decide whether to adjust allocation.</li>
      <li><b>Only act on regime shifts:</b> avoid over-trading; adjust when regime changes or thresholds are breached.</li>
    </ul>

    <h2>Allocation guidance (rule-of-thumb)</h2>
    <div class="card" style="margin:12px 0">
      <ul style="margin:0;padding-left:18px">
        <li><b>Risk-On:</b> equity bias (example: 60–80% equity depending on profile)</li>
        <li><b>Neutral:</b> balanced risk budget (example: 40–60% equity)</li>
        <li><b>Risk-Off:</b> capital preservation bias (example: 20–40% equity + more defensive assets)</li>
      </ul>
      <div class="muted">These are educational ranges; use your own constraints and time horizon.</div>
    </div>

    <h2>Why this is different from timing the market</h2>
    <p>Risk signals are not return predictions. They help you avoid being structurally overexposed in risk-off regimes, while staying engaged when conditions are supportive.</p>

    <h2>Next steps</h2>
    <ul>
      <li>Check today’s signal on the <a href="/">homepage</a></li>
      <li>Review the <a href="/weekly/">weekly strategy</a></li>
      <li>Browse <a href="/archive/">risk archive</a> and <a href="/risk-history/">history</a></li>
    </ul>

    <h2>FAQ</h2>
    <h3>Do I need to change allocation every day?</h3>
    <p>No. Daily signals are for awareness; allocation changes are typically weekly or only when regimes shift.</p>
    <h3>What is the biggest mistake?</h3>
    <p>Overreacting to small daily moves. Use regime context and thresholds to avoid noise trading.</p>
  `;

  const title = `${h1} | FinLogicHub5`;
  const description = `Explains “${topic}” using a risk→allocation framework. Learn how to interpret daily market risk signals and adjust exposure without over-trading.`;

  return { title, description, h1, bodyHtml };
}

function main() {
  const count = parseInt(arg("count", "100"), 10);
  const dateISO = arg("date", todayISO());
  if (!Number.isFinite(count) || count <= 0) throw new Error("Invalid --count");

  const topics = buildTopics();
  const used = new Set();

  // deterministic-ish selection for the day
  let i = 0;
  const selected = [];
  while (selected.length < Math.min(count, topics.length)) {
    const t = topics[(i * 7 + dateISO.length * 13) % topics.length];
    i++;
    if (used.has(t)) continue;
    used.add(t);
    selected.push(t);
  }

  const outRoot = path.join(process.cwd(), "public", "seo", dateISO);
  clearDir(outRoot);
  ensureDir(outRoot);

  const index = [];
  const usedSlugs = new Set();
  for (const topic of selected) {
    let slug = safeSlug(topic);
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);
    const canonicalPath = `/seo/${dateISO}/${slug}/`;
    const { title, description, h1, bodyHtml } = buildPageContent(topic, { dateISO });
    const pillar = pickPillarLink(slug);

    const html = htmlTemplate({ title, description, h1, bodyHtml, canonicalPath, pillarLink: pillar.href, pillarTitle: pillar.title });
    const outFile = path.join(outRoot, slug, "index.html");
    writeFile(outFile, html);

    index.push({
      topic,
      slug,
      url: canonicalPath,
      date: dateISO,
    });
  }

  // write an index json for debugging / future use
  writeFile(path.join(outRoot, "index.json"), JSON.stringify({ date: dateISO, count: index.length, pages: index }, null, 2));

  console.log(`[seo-matrix] generated ${index.length} pages at public/seo/${dateISO}/`);
}

main();
