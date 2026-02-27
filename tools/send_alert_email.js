const fs = require('fs');
const path = require('path');

const ALERTS_TODAY_PATH = path.resolve(__dirname, '..', 'public', 'api', 'alerts-today', 'index.json');
const DAILY_PATH = path.resolve(__dirname, '..', 'public', 'data', 'daily.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function buildSubject(date, alerts) {
  if (alerts.some(a => a.type === 'regime_change')) {
    return `[FinLogicHub5] Risk Regime Changed — ${date}`;
  }
  if (alerts.some(a => a.type === 'threshold_high')) {
    return `[FinLogicHub5] High Market Risk Alert — ${date}`;
  }
  if (alerts.some(a => a.type === 'threshold_low')) {
    return `[FinLogicHub5] Low Market Risk Alert — ${date}`;
  }
  return `[FinLogicHub5] Market Risk Alert — ${date}`;
}

function buildBody(date, alerts, daily) {
  const risk = daily?.riskIndex || daily?.marketRisk || {};
  const level = (risk.level || 'neutral').toUpperCase();
  const allocation = risk.equityRange || '--';
  const reason = alerts.map(a => {
    if (a.type === 'regime_change') return `Regime change: ${a.from} → ${a.to}`;
    if (a.type === 'threshold_high') return `High risk threshold exceeded (${a.score})`;
    if (a.type === 'threshold_low') return `Low risk threshold breached (${a.score})`;
    return a.type;
  }).join('; ');
  return [
    `Date: ${date}`,
    `Risk Level: ${level}`,
    `Trigger: ${reason}`,
    `Suggested Allocation: ${allocation}`,
    '',
    `Daily page: https://finlogichub5.com/daily/${date}`,
    `Alerts history: https://finlogichub5.com/alerts/`,
    '',
    'Disclaimer: For risk awareness only. Not investment advice.'
  ].join('\n');
}

async function sendResend(subject, body) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM;
  const to = process.env.ALERT_EMAIL_TO;
  if (!apiKey || !from || !to) {
    throw new Error('RESEND_API_KEY/ALERT_EMAIL_FROM/ALERT_EMAIL_TO required');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: body
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
}

async function sendButtondown(subject, body) {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) throw new Error('BUTTONDOWN_API_KEY required');
  const res = await fetch('https://api.buttondown.email/v1/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ subject, body })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buttondown error: ${res.status} ${text}`);
  }
}

async function main() {
  if (!fs.existsSync(ALERTS_TODAY_PATH)) {
    console.log('alerts-today not found, exiting.');
    return;
  }
  const alertsToday = readJson(ALERTS_TODAY_PATH);
  if (!alertsToday.hasAlerts) {
    console.log('No alerts today.');
    return;
  }
  const daily = fs.existsSync(DAILY_PATH) ? readJson(DAILY_PATH) : null;
  const subject = buildSubject(alertsToday.date, alertsToday.alerts || []);
  const body = buildBody(alertsToday.date, alertsToday.alerts || [], daily);

  const provider = (process.env.ALERT_EMAIL_PROVIDER || 'resend').toLowerCase();
  if (provider === 'buttondown') {
    await sendButtondown(subject, body);
  } else {
    await sendResend(subject, body);
  }
  console.log(`Alert email sent via ${provider}.`);
}

main().catch((err) => {
  console.error('send_alert_email failed:', err.message);
  process.exitCode = 1;
});
