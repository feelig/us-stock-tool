const fs = require('fs');
const path = require('path');

const SITE_ROOT = 'https://finlogichub5.com';
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'pages');
const DAILY_DIR = path.resolve(__dirname, '..', 'public', 'daily');

const SLUGS = [
  'what-is-market-risk-index',
  'stock-market-risk-level-explained',
  'how-to-use-market-risk-index',
  'market-risk-index-strategy',
  'stock-market-risk-indicator',
  'market-volatility-vs-risk',
  'market-risk-trading-strategy',
  'stock-market-risk-guide',
  'market-risk-score-explained',
  'market-risk-forecast',
  'risk-level-investment-strategy',
  'low-market-risk-strategy',
  'high-market-risk-strategy',
  'market-risk-vs-volatility',
  'stock-risk-management-guide',
  'bear-market-risk-analysis',
  'bull-market-risk-analysis',
  'portfolio-risk-allocation-guide',
  'market-risk-metrics-explained',
  'daily-market-risk-analysis'
];

function titleFromSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

function getLatestDailyPath() {
  if (!fs.existsSync(DAILY_DIR)) return '/daily.html';
  const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.html') && /^\d{4}-\d{2}-\d{2}\.html$/.test(f));
  if (!files.length) return '/daily.html';
  files.sort();
  const latest = files[files.length - 1];
  return `/daily/${latest}`;
}

function paragraphBlock(topic) {
  return [
    `The market risk index is a structured lens for measuring stock market risk in a consistent, repeatable way. Instead of relying on headlines, a market risk index converts trend, stress, and regime signals into a single risk score. This makes it easier to compare conditions across time. The goal is not to predict returns, but to measure risk temperature and support disciplined decisions. In practice, the Market Risk Index (MRI) helps investors avoid overreacting to short-term noise and focus on risk control.`,
    `A strong ${topic} framework starts with clarity: what is the risk level, how stable is the trend, and how intense is market stress? When trend is healthy and stress is moderate, the MRI may indicate lower risk. When volatility rises and defensive assets outperform, stock market risk can shift higher. The market risk index does not promise a direction, but it tells you whether the environment is more fragile or more stable.`,
    `Using a market risk strategy means aligning exposure with risk conditions. In low risk regimes, some investors keep a higher equity allocation. In medium risk regimes, they maintain core exposure and rebalance more often. In high risk regimes, they prioritize capital preservation. This approach turns the market risk index into a practical guardrail. It is especially useful for portfolios that need consistent risk controls across different cycles.`,
    `The Market Risk Index is also a communication tool. It explains why a risk score is rising or falling by referencing trend, stress, and regime drivers. This transparency supports better decision-making and helps teams remain consistent. While the MRI can change day to day, its value lies in the longer-term risk context. When combined with your own objectives, it can guide exposure, rebalancing, and risk budgeting.`,
    `Any stock market risk analysis should acknowledge uncertainty. Even a low risk reading can be followed by volatility, and a high risk reading can persist longer than expected. That is why the market risk index is used for awareness, not prediction. The best results come from applying it consistently, documenting decisions, and reviewing outcomes over time. This creates a disciplined process rather than a reaction to noise.`,
  ].map(p => `<p>${p}</p>`).join('\n');
}

function faqBlock() {
  const faqs = [
    ['What is the market risk index?', 'It is a structured score that summarizes stock market risk using trend, stress, and regime signals.'],
    ['How should I use a market risk strategy?', 'Use MRI as a risk lens for position sizing and drawdown control, not as a buy or sell signal.'],
    ['Does MRI predict returns?', 'No. It measures risk conditions and supports disciplined allocation decisions.'],
    ['Why track stock market risk daily?', 'Daily snapshots create a history that helps compare risk regimes and improve process discipline.'],
    ['What is the difference between risk and volatility?', 'Volatility is one input; market risk combines volatility with trend and regime signals.']
  ];
  return `
    <h3>FAQ</h3>
    ${faqs.map(f => `<p><strong>Q: ${f[0]}</strong><br> A: ${f[1]}</p>`).join('\n')}
  `;
}

function linkBlock(slug, idx) {
  const next1 = SLUGS[(idx + 1) % SLUGS.length];
  const next2 = SLUGS[(idx + 2) % SLUGS.length];
  const latestDaily = getLatestDailyPath();
  return `
    <div class="links">
      <a href="/market-risk-index.html">Market Risk Index</a>
      <a href="/daily.html">Daily Archive</a>
      <a href="${latestDaily}">Latest Daily</a>
      <a href="/pages/${next1}.html">Related: ${titleFromSlug(next1)}</a>
      <a href="/pages/${next2}.html">Related: ${titleFromSlug(next2)}</a>
    </div>
  `;
}

function renderPage(slug, idx) {
  const title = titleFromSlug(slug);
  const canonical = `${SITE_ROOT}/pages/${slug}.html`;
  const topic = title.toLowerCase();
  const content = paragraphBlock(topic);
  const faq = faqBlock();
  const links = linkBlock(slug, idx);
  const wordCount = content.split(/\s+/).length;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0f172a">
  <title>${title} - FinLogicHub5</title>
  <meta name="description" content="${title} page for market risk index, stock market risk, and market risk strategy. Learn how MRI supports risk control and disciplined allocation.">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title} - FinLogicHub5">
  <meta property="og:description" content="${title} for market risk index, stock market risk, and market risk strategy.">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} - FinLogicHub5">
  <meta name="twitter:description" content="${title} for market risk index, stock market risk, and market risk strategy.">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Noto+Sans+SC:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #0f172a; --text: #f8fafc; --text-dim: #94a3b8; --primary: #38bdf8; }
    body { margin: 0; padding: 24px; font-family: "Space Grotesk","Noto Sans SC",sans-serif; background: #0b1220; color: var(--text); }
    .wrap { max-width: 980px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(148,163,184,0.2); border-radius: 16px; padding: 24px; }
    h1 { margin: 0 0 8px 0; font-size: 30px; }
    h2 { margin: 18px 0 8px 0; font-size: 20px; color: #e2e8f0; }
    h3 { margin: 16px 0 6px 0; font-size: 16px; color: #c7d2fe; }
    p { margin: 0 0 12px 0; color: #dbeafe; line-height: 1.8; }
    .note { color: var(--text-dim); font-size: 12px; }
    .links { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; }
    .links a { color: var(--primary); text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${title}</h1>
    <p class="note">market risk index / stock market risk / market risk strategy</p>
    <h2>Market Risk Index Definition</h2>
    ${content}
    <h2>Use Cases for Market Risk Strategy</h2>
    ${paragraphBlock('market risk strategy')}
    <h2>Risk Control Methods</h2>
    ${paragraphBlock('risk control')}
    ${faq}
    ${links}
    <p class="note">Content length target: ${wordCount} words</p>
  </div>
</body>
</html>`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  SLUGS.forEach((slug, idx) => {
    const html = renderPage(slug, idx);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
  });
  console.log(`SEO pages generated: ${SLUGS.length}`);
}

main();
