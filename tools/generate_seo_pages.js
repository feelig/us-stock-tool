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
  const recentPath = path.join(DAILY_DIR, 'recent30.json');
  try {
    if (fs.existsSync(recentPath)) {
      const data = JSON.parse(fs.readFileSync(recentPath, 'utf-8'));
      if (data && data[0] && data[0].date) return `/daily/${data[0].date}`;
    }
  } catch (e) {}
  return '/archive/';
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

const UNIQUE_SECTIONS = {
  'what-is-market-risk-index': {
    example: 'Example: A 60/40 portfolio sees MRI rise above 70 while volatility spikes. The risk signal suggests reducing equity risk rather than adding exposure.',
    mistakes: 'Mistake: Treating MRI as a price forecast instead of a risk thermometer.',
    checklist: ['Check MRI trend vs last week', 'Compare risk level to allocation range', 'Document decision before acting']
  },
  'stock-market-risk-level-explained': {
    example: 'Example: MRI 25 (low) aligns with higher equity allocation and slower rebalancing.',
    mistakes: 'Mistake: Assuming “low risk” means “no drawdowns.”',
    checklist: ['Confirm level definition', 'Align allocation bands', 'Review drawdown limits']
  },
  'how-to-use-market-risk-index': {
    example: 'Example: Use MRI as a weekly trigger for rebalancing frequency.',
    mistakes: 'Mistake: Changing allocation daily based on small MRI moves.',
    checklist: ['Set review cadence', 'Define response thresholds', 'Track outcomes']
  },
  'market-risk-index-strategy': {
    example: 'Example: MRI strategy uses 3 bands: low/medium/high with preset exposure ranges.',
    mistakes: 'Mistake: Mixing MRI rules with discretionary impulses.',
    checklist: ['Define bands', 'Set guardrails', 'Backtest behavior']
  },
  'stock-market-risk-indicator': {
    example: 'Example: Combine MRI with earnings season to adjust exposure conservatively.',
    mistakes: 'Mistake: Relying on a single indicator only.',
    checklist: ['Confirm indicator inputs', 'Validate with history', 'Avoid overfitting']
  },
  'market-volatility-vs-risk': {
    example: 'Example: Volatility rises but trend stays strong—MRI may remain medium.',
    mistakes: 'Mistake: Equating volatility spikes with guaranteed losses.',
    checklist: ['Separate volatility from risk', 'Check trend component', 'Review regime signals']
  },
  'market-risk-trading-strategy': {
    example: 'Example: Reduce position size when MRI crosses into high risk.',
    mistakes: 'Mistake: Treating MRI as an entry signal for trades.',
    checklist: ['Define sizing rules', 'Use risk stops', 'Review trade outcomes']
  },
  'stock-market-risk-guide': {
    example: 'Example: A guide maps MRI to monthly allocation ranges.',
    mistakes: 'Mistake: Ignoring risk when returns are strong.',
    checklist: ['Set risk budget', 'Monitor MRI history', 'Rebalance systematically']
  },
  'market-risk-score-explained': {
    example: 'Example: Score 80 means risk signals are elevated across components.',
    mistakes: 'Mistake: Comparing MRI scores across different methods.',
    checklist: ['Confirm methodology', 'Track score changes', 'Use bands not absolutes']
  },
  'market-risk-forecast': {
    example: 'Example: MRI does not forecast returns; it reflects current risk conditions.',
    mistakes: 'Mistake: Using MRI as a prediction engine.',
    checklist: ['Use for risk, not returns', 'Document assumptions', 'Avoid timing bias']
  },
  'risk-level-investment-strategy': {
    example: 'Example: Medium risk keeps core holdings but reduces tactical risk.',
    mistakes: 'Mistake: Overreacting to a single risk level change.',
    checklist: ['Set allocation bands', 'Define rebalancing rules', 'Track discipline']
  },
  'low-market-risk-strategy': {
    example: 'Example: Low risk supports gradual accumulation within defined bands.',
    mistakes: 'Mistake: Overleveraging because risk is low.',
    checklist: ['Keep diversification', 'Avoid leverage spikes', 'Review risk weekly']
  },
  'high-market-risk-strategy': {
    example: 'Example: High risk shifts focus to capital preservation and liquidity.',
    mistakes: 'Mistake: Trying to catch falling risk without confirmation.',
    checklist: ['Reduce exposure', 'Set drawdown caps', 'Wait for stabilization']
  },
  'market-risk-vs-volatility': {
    example: 'Example: Risk can remain high even after volatility normalizes.',
    mistakes: 'Mistake: Using VIX alone as a risk proxy.',
    checklist: ['Check regime signals', 'Confirm trend health', 'Review MRI history']
  },
  'stock-risk-management-guide': {
    example: 'Example: Use MRI to set risk budgets per position.',
    mistakes: 'Mistake: Ignoring correlation during high risk regimes.',
    checklist: ['Limit concentration', 'Monitor correlations', 'Set risk caps']
  },
  'bear-market-risk-analysis': {
    example: 'Example: MRI stays elevated across prolonged drawdowns.',
    mistakes: 'Mistake: Assuming bear risk resolves quickly.',
    checklist: ['Increase liquidity', 'Reduce beta', 'Track risk compression']
  },
  'bull-market-risk-analysis': {
    example: 'Example: MRI may remain medium while returns are strong.',
    mistakes: 'Mistake: Confusing momentum with low risk.',
    checklist: ['Keep guardrails', 'Avoid overexposure', 'Monitor regime']
  },
  'portfolio-risk-allocation-guide': {
    example: 'Example: Adjust equity range based on MRI bands.',
    mistakes: 'Mistake: Changing allocation without a policy.',
    checklist: ['Define policy ranges', 'Use MRI bands', 'Audit quarterly']
  },
  'market-risk-metrics-explained': {
    example: 'Example: MRI integrates trend, stress, and regime into one metric.',
    mistakes: 'Mistake: Mixing metrics without normalization.',
    checklist: ['Standardize inputs', 'Track trend', 'Watch stress indicators']
  },
  'daily-market-risk-analysis': {
    example: 'Example: Daily MRI snapshot provides a reference for decisions.',
    mistakes: 'Mistake: Using daily data as intraday signals.',
    checklist: ['Review daily at fixed time', 'Log decisions', 'Compare to history']
  }
};

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
      <a href="/archive/">Risk Archive</a>
      <a href="${latestDaily}">Latest Daily</a>
      <a href="/pages/${next1}.html">Related: ${titleFromSlug(next1)}</a>
      <a href="/pages/${next2}.html">Related: ${titleFromSlug(next2)}</a>
    </div>
  `;
}

function renderPage(slug, idx) {
  const topicTitle = titleFromSlug(slug);
  const title = `Market Risk Index Strategy — ${topicTitle} | FinLogicHub5`;
  const canonical = `${SITE_ROOT}/pages/${slug}.html`;
  const topic = title.toLowerCase();
  const content = paragraphBlock(topic);
  const faq = faqBlock();
  const links = linkBlock(slug, idx);
  const wordCount = content.split(/\s+/).length;
  const unique = UNIQUE_SECTIONS[slug] || {
    example: 'Example: Use MRI to align risk exposure with regime shifts.',
    mistakes: 'Mistake: Treating risk signals as price forecasts.',
    checklist: ['Review MRI weekly', 'Define exposure bands', 'Document decisions']
  };
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_ROOT}/` },
      { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${SITE_ROOT}/pages/guides.html` },
      { "@type": "ListItem", "position": 3, "name": topicTitle, "item": canonical }
    ]
  };
  const articleJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "datePublished": new Date().toISOString().slice(0, 10),
    "dateModified": new Date().toISOString().slice(0, 10),
    "mainEntityOfPage": canonical,
    "description": `${topicTitle} guide for market risk index, stock market risk, and market risk strategy.`,
    "author": { "@type": "Organization", "name": "FinLogicHub5" }
  };
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is the market risk index?", "acceptedAnswer": { "@type": "Answer", "text": "A structured score that summarizes stock market risk using trend, stress, and regime signals." } },
      { "@type": "Question", "name": "How should I use a market risk strategy?", "acceptedAnswer": { "@type": "Answer", "text": "Use MRI as a risk lens for position sizing and drawdown control, not as a buy or sell signal." } },
      { "@type": "Question", "name": "Does MRI predict returns?", "acceptedAnswer": { "@type": "Answer", "text": "No. It measures risk conditions and supports disciplined allocation decisions." } }
    ]
  };
  const metaDescBase = `${topicTitle} guide for market risk index, stock market risk, and market risk strategy. Learn MRI use cases, risk control, and allocation discipline.`;
  const metaDesc = metaDescBase.length >= 150 && metaDescBase.length <= 160
    ? metaDescBase
    : (metaDescBase + ' Updated daily for market risk index insights.').slice(0, 160);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0f172a">
  <title>${title}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${metaDesc}">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <script type="application/ld+json">${JSON.stringify(articleJson)}</script>
  <script type="application/ld+json">${JSON.stringify(faqJson)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>
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
    <div class="nav">
      <a href="/">Daily Risk</a>
      <a href="/weekly/">Weekly Strategy</a>
      <a href="/archive/">Risk Archive</a>
      <a href="/methodology/">Methodology</a>
      <a href="/lab/">Lab</a>
    </div>
    <div class="note">Home &gt; Guides &gt; ${topicTitle}</div>
    <h1>${topicTitle}</h1>
    <p class="note">market risk index / stock market risk / market risk strategy</p>
    <div class="links">
      <a href="#definition">Definition</a>
      <a href="#use-cases">Use Cases</a>
      <a href="#strategy">Strategy</a>
      <a href="#risk-control">Risk Control</a>
      <a href="#example">Example</a>
      <a href="#mistakes">Mistakes</a>
      <a href="#checklist">Checklist</a>
      <a href="#faq">FAQ</a>
    </div>
    <h2 id="definition">Market Risk Index Definition</h2>
    ${content}
    <h2 id="use-cases">Use Cases for Market Risk Strategy</h2>
    ${paragraphBlock('market risk strategy')}
    <h2 id="risk-control">Risk Control Methods</h2>
    ${paragraphBlock('risk control')}
    <h2 id="example">Example</h2>
    <p>${unique.example}</p>
    <h2 id="mistakes">Common Mistakes</h2>
    <p>${unique.mistakes}</p>
    <h2 id="checklist">Practical Checklist</h2>
    <ul>
      ${unique.checklist.map(item => `<li>${item}</li>`).join('')}
    </ul>
    <div id="faq">${faq}</div>
    ${links}
    <p class="note">Content length target: ${wordCount} words</p>
  </div>
</body>
</html>`;
}

const GROWTH_PAGES = [
  { slug: 'risk-levels', title: 'Risk Levels Explained', summary: 'Risk-on, neutral, and risk-off levels with allocation guidance.', theme: 'risk levels' },
  { slug: 'risk-regime', title: 'Risk Regime Guide', summary: 'What a risk regime is, how it shifts, and how to use it.', theme: 'risk regime' },
  { slug: 'risk-history', title: 'Risk History Overview', summary: 'Historical risk trends, regime duration, and cycle context.', theme: 'risk history' },
  { slug: 'market-risk-explained', title: 'Market Risk Explained', summary: 'How the Market Risk Index (MRI) model works.', theme: 'market risk index' },
  { slug: 'asset-allocation-guide', title: 'Asset Allocation Guide', summary: 'How to adjust allocation based on market risk.', theme: 'asset allocation' }
];

function wordCount(html) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function buildLongContent(topic) {
  const paragraphs = [
    `The market risk index is built to translate complex market signals into a single risk level. A ${topic} framework helps investors read the environment without chasing noise. This page explains how to interpret the signal, when to adjust exposure, and why risk discipline matters.`,
    `Risk-on periods typically reflect stable trend conditions and lower volatility. Neutral periods often appear when trend is mixed or stress is rising but not extreme. Risk-off conditions often coincide with elevated volatility, defensive asset strength, and weaker breadth.`,
    `A clear ${topic} plan focuses on allocation ranges rather than precise price forecasts. By aligning exposure with a risk level, investors can reduce behavioral errors and avoid overreacting to single-day headlines.`,
    `The MRI uses trend, stress, and regime as primary components. Trend reflects price stability relative to long-term averages. Stress captures volatility and drawdown pressure. Regime captures risk-on vs risk-off appetite.`,
    `When the risk score rises, the goal is not to predict a crash but to reduce fragility. Lowering equity exposure, raising cash, or diversifying into defensive assets are common responses.`,
    `Risk history matters. A single day reading is less informative than a multi-week trend. A sustained risk-on regime suggests stability, while an extended risk-off regime often signals caution.`,
    `An effective ${topic} approach includes a written playbook. Define actions at low, neutral, and high risk levels. Define rebalancing cadence and drawdown tolerance.`,
    `Investors often confuse risk and volatility. Volatility measures dispersion of returns, while risk is the probability of adverse outcomes. The MRI incorporates both trend stability and stress to provide a broader view of market risk.`,
    `Market risk signals are best used alongside personal risk capacity. A conservative investor may reduce exposure earlier, while an aggressive investor may tolerate higher drawdowns.`,
    `The ${topic} lens also improves communication. Teams can reference a common risk level when discussing allocation. This reduces ambiguity and creates consistent reporting.`,
    `Even a disciplined system will experience false positives and false negatives. That is why the risk index emphasizes ranges rather than exact timing.`,
    `The Daily and Weekly pages provide real-time and periodic context. The Daily page highlights the current score and short-term change. The Weekly report summarizes regime dynamics and allocation posture.`,
    `In summary, ${topic} is about consistency. The MRI helps investors structure decisions based on measurable risk conditions rather than emotion.`
  ];
  let content = '';
  let idx = 0;
  while (wordCount(content) < 1600 && idx < 30) {
    content += `<p>${paragraphs[idx % paragraphs.length]}</p>\n`;
    idx += 1;
  }
  return content;
}

function buildFaqBlock() {
  const faqs = [
    ['What is the Market Risk Index?', 'The MRI is a structured score that summarizes market risk using trend, stress, and regime signals.'],
    ['Does MRI predict returns?', 'No. It measures risk conditions and supports allocation discipline rather than forecasting price direction.'],
    ['How should I use MRI?', 'Use it as a risk lens for position sizing, rebalancing, and drawdown control.']
  ];
  return `\n  <h2 id="faq">FAQ</h2>\n  ${faqs.map(f => `<h3>${f[0]}</h3><p>${f[1]}</p>`).join('')}\n`;
}

function renderGrowthPage(page) {
  const latestDaily = getLatestDailyPath();
  const canonical = `${SITE_ROOT}/${page.slug}/`;
  const content = buildLongContent(page.theme);
  const faqBlock = buildFaqBlock();
  const articleJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `${page.title} | FinLogicHub5`,
    "datePublished": new Date().toISOString().slice(0, 10),
    "dateModified": new Date().toISOString().slice(0, 10),
    "mainEntityOfPage": canonical,
    "description": page.summary,
    "author": { "@type": "Organization", "name": "FinLogicHub5" }
  };
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is the Market Risk Index?", "acceptedAnswer": { "@type": "Answer", "text": "A structured score that summarizes market risk using trend, stress, and regime signals." } },
      { "@type": "Question", "name": "Does MRI predict returns?", "acceptedAnswer": { "@type": "Answer", "text": "No. It measures risk conditions and supports allocation discipline." } },
      { "@type": "Question", "name": "How should I use MRI?", "acceptedAnswer": { "@type": "Answer", "text": "Use it as a risk lens for position sizing, rebalancing, and drawdown control." } }
    ]
  };
  const wordTarget = wordCount(content + faqBlock);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0B0F1A">
  <title>${page.title} | FinLogicHub5</title>
  <meta name="description" content="${page.summary}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${page.title} | FinLogicHub5">
  <meta property="og:description" content="${page.summary}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${page.title} | FinLogicHub5">
  <meta name="twitter:description" content="${page.summary}">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <script type="application/ld+json">${JSON.stringify(articleJson)}</script>
  <script type="application/ld+json">${JSON.stringify(faqJson)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --bg:#0B0F1A; --panel:rgba(12,19,32,0.7); --text:#E5EDFF; --muted:#8FA3C8; --cyan:#00E5FF; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Space Grotesk",sans-serif; background:#0B0F1A; color:var(--text); }
    .container { max-width: 980px; margin:0 auto; padding: 24px; }
    .nav { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted); }
    .nav a { padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.05); }
    h1 { margin:16px 0 8px 0; font-size: clamp(28px, 5vw, 48px); }
    h2 { margin-top: 20px; font-size: 20px; }
    h3 { margin-top: 16px; font-size: 16px; }
    p { color: var(--muted); line-height:1.8; }
    .panel { margin: 16px 0; padding: 16px; border-radius: 14px; background: var(--panel); border:1px solid rgba(255,255,255,0.08); }
    .chart { height: 160px; margin-top: 10px; }
    .links { margin-top: 14px; display:flex; gap:10px; flex-wrap:wrap; font-size:12px; }
    .links a { color: var(--cyan); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/">Daily Risk</a>
      <a href="/weekly/">Weekly Strategy</a>
      <a href="/archive/">Risk Archive</a>
      <a href="/methodology/">Methodology</a>
      <a href="/lab/">Lab</a>
    </div>
    <h1>${page.title}</h1>
    <div class="panel">
      <strong>Chart</strong>
      <div class="chart">
        <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
          <polyline fill="none" stroke="#00E5FF" stroke-width="2" points="0,130 120,90 240,100 360,60 480,80 600,40" />
        </svg>
      </div>
      <p>${page.summary}</p>
    </div>
    <div>${content}</div>
    ${faqBlock}
    <div class="links">
      <a href="/daily/">Daily</a>
      <a href="/weekly/">Weekly</a>
      <a href="/archive/">Archive</a>
      <a href="${latestDaily}">Latest Daily</a>
    </div>
    <p style="font-size:12px;color:#8FA3C8;">Word count: ${wordTarget}</p>
  </div>
</body>
</html>`;
}

function generateGrowthPages() {
  GROWTH_PAGES.forEach(page => {
    const dir = path.resolve(__dirname, '..', 'public', page.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderGrowthPage(page));
  });
}

function generateRiskRegimeHistory() {
  const dir = path.resolve(__dirname, '..', 'public', 'risk-regime-history');
  fs.mkdirSync(dir, { recursive: true });
  const html = renderGrowthPage({ slug: 'risk-regime-history', title: 'Risk Regime History', summary: 'Historical regime duration and risk transitions.', theme: 'risk regime history' });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function generateMarketRiskToday() {
  const dir = path.resolve(__dirname, '..', 'public', 'market-risk-today');
  fs.mkdirSync(dir, { recursive: true });
  const html = renderGrowthPage({ slug: 'market-risk-today', title: 'Market Risk Today', summary: 'Daily market risk snapshot with MRI context and allocation guidance.', theme: 'market risk today' });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function generateRiskMonthlyPages() {
  const monthlyPath = path.resolve(__dirname, '..', 'public', 'daily', 'monthly.json');
  let months = [];
  try {
    const raw = JSON.parse(fs.readFileSync(monthlyPath, 'utf-8'));
    months = Array.isArray(raw) ? raw : (raw.months || []);
  } catch (e) {}
  months.forEach(m => {
    const [y, mm] = m.month.split('-');
    const dir = path.resolve(__dirname, '..', 'public', 'risk', y, mm);
    fs.mkdirSync(dir, { recursive: true });
    const content = buildLongContent('monthly risk archive');
    const list = (m.dates || []).map(d => `<li><a href="/daily/${d}">${d}</a></li>`).join('');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0B0F1A">
  <title>Market Risk Archive — ${m.month} | FinLogicHub5</title>
  <meta name="description" content="Market risk archive for ${m.month}. Browse daily MRI reports and regime context.">
  <link rel="canonical" href="${SITE_ROOT}/risk/${y}/${mm}/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Market Risk Archive — ${m.month} | FinLogicHub5">
  <meta property="og:description" content="Market risk archive for ${m.month}. Browse daily MRI reports and regime context.">
  <meta property="og:url" content="${SITE_ROOT}/risk/${y}/${mm}/">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Market Risk Archive — ${m.month} | FinLogicHub5">
  <meta name="twitter:description" content="Market risk archive for ${m.month}. Browse daily MRI reports and regime context.">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `Market Risk Archive — ${m.month}`,
    "datePublished": m.month + "-01",
    "dateModified": m.month + "-01",
    "mainEntityOfPage": `${SITE_ROOT}/risk/${y}/${mm}/`,
    "description": `Market risk archive for ${m.month}.`
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is this page?", "acceptedAnswer": { "@type": "Answer", "text": "A monthly archive of daily Market Risk Index reports." } },
      { "@type": "Question", "name": "How should I use this archive?", "acceptedAnswer": { "@type": "Answer", "text": "Review daily risk regimes and track allocation discipline over time." } }
    ]
  })}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin:0; font-family:"Space Grotesk",sans-serif; background:#0B0F1A; color:#E5EDFF; }
    .container { max-width: 980px; margin:0 auto; padding: 24px; }
    .nav { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:#8FA3C8; }
    .nav a { padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.05); }
    h1 { margin:16px 0 8px 0; font-size: clamp(28px, 5vw, 48px); }
    ul { line-height:1.8; }
    p { color:#8FA3C8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/">Daily Risk</a>
      <a href="/weekly/">Weekly Strategy</a>
      <a href="/archive/">Risk Archive</a>
      <a href="/methodology/">Methodology</a>
      <a href="/lab/">Lab</a>
    </div>
    <h1>Market Risk Archive — ${m.month}</h1>
    <p>Daily MRI reports for ${m.month}.</p>
    <ul>${list}</ul>
    <div>${content}</div>
  </div>
</body>
</html>`;
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  });
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  SLUGS.forEach((slug, idx) => {
    const html = renderPage(slug, idx);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
  });
  generateGrowthPages();
  generateRiskRegimeHistory();
  generateMarketRiskToday();
  generateRiskMonthlyPages();
  const guidesBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_ROOT}/` },
      { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${SITE_ROOT}/pages/guides.html` }
    ]
  };
  const guidesArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Market Risk Guides",
    "datePublished": new Date().toISOString().slice(0, 10),
    "dateModified": new Date().toISOString().slice(0, 10),
    "mainEntityOfPage": `${SITE_ROOT}/pages/guides.html`,
    "description": "Guides hub for market risk index, stock market risk, and market risk strategy."
  };
  const guidesFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What are these market risk guides?", "acceptedAnswer": { "@type": "Answer", "text": "They explain MRI, stock market risk, and practical risk strategy usage." } },
      { "@type": "Question", "name": "How should I start?", "acceptedAnswer": { "@type": "Answer", "text": "Begin with the Market Risk Index page, then read the daily archive and guides." } },
      { "@type": "Question", "name": "Do these guides predict returns?", "acceptedAnswer": { "@type": "Answer", "text": "No. They focus on risk awareness and allocation discipline." } }
    ]
  };
  const guidesHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0f172a">
  <title>Market Risk Guides | FinLogicHub5</title>
  <meta name="description" content="Guides hub for market risk index, stock market risk, and market risk strategy. Access all FinLogicHub5 risk guides from one page.">
  <link rel="canonical" href="${SITE_ROOT}/pages/guides.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Market Risk Guides | FinLogicHub5">
  <meta property="og:description" content="Guides hub for market risk index, stock market risk, and market risk strategy.">
  <meta property="og:url" content="${SITE_ROOT}/pages/guides.html">
  <meta property="og:image" content="${SITE_ROOT}/og/mri-latest.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Market Risk Guides | FinLogicHub5">
  <meta name="twitter:description" content="Guides hub for market risk index, stock market risk, and market risk strategy.">
  <meta name="twitter:image" content="${SITE_ROOT}/og/mri-latest.png">
  <script type="application/ld+json">${JSON.stringify(guidesArticle)}</script>
  <script type="application/ld+json">${JSON.stringify(guidesFaq)}</script>
  <script type="application/ld+json">${JSON.stringify(guidesBreadcrumb)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Noto+Sans+SC:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 24px; font-family: "Space Grotesk","Noto Sans SC",sans-serif; background: #0b1220; color: #f8fafc; }
    .wrap { max-width: 980px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(148,163,184,0.2); border-radius: 16px; padding: 24px; }
    h1 { margin: 0 0 8px 0; font-size: 28px; }
    .links { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 10px; }
    .links a { color: #38bdf8; text-decoration: none; padding: 10px 12px; border: 1px solid rgba(148,163,184,0.2); border-radius: 10px; background: rgba(15,23,42,0.6); }
    .nav a { color: #38bdf8; text-decoration: none; margin-right: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="nav">
      <a href="/">Daily Risk</a>
      <a href="/weekly/">Weekly Strategy</a>
      <a href="/archive/">Risk Archive</a>
      <a href="/methodology/">Methodology</a>
      <a href="/lab/">Lab</a>
    </div>
    <h1>Market Risk Guides</h1>
    <p>All guides for market risk index, stock market risk, and market risk strategy.</p>
    <div class="links" style="margin:10px 0;">
      <a href="/market-risk-index.html">Market Risk Index</a>
      <a href="/archive/">Risk Archive</a>
    </div>
    <div class="links">
      ${SLUGS.map(s => `<a href="/pages/${s}.html">${titleFromSlug(s)}</a>`).join('')}
    </div>
  </div>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'guides.html'), guidesHtml);
  console.log(`SEO pages generated: ${SLUGS.length}`);
}

main();
