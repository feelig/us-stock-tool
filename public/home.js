function $(id){ return document.getElementById(id); }
function fmt(n, d=2){
  if (n === null || n === undefined || Number.isNaN(n)) return "--";
  const x = Number(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: d });
}
function pct(n, d=2){
  if (n === null || n === undefined || Number.isNaN(n)) return "--";
  const x = Number(n);
  const s = (x*100).toFixed(d);
  return `${s}%`;
}
function safeText(id, v){
  const el = $(id);
  if (!el) return;
  el.textContent = v;
}

async function fetchFirstJson(urls){
  for (const u of urls){
    try{
      // cache bust to reduce edge staleness
      const url = u.includes("?") ? `${u}&ts=${Date.now()}` : `${u}?ts=${Date.now()}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      return await r.json();
    }catch(e){}
  }
  return null;
}

// Map a variety of historical keys to a unified shape
function normalizeLatest(raw){
  const out = {};
  out.date = raw.date ?? (raw.updatedAt ? String(raw.updatedAt).slice(0,10) : "");
  out.updatedAt = raw.updatedAt ?? "";
  out.mri = raw.mri ?? raw.score ?? raw.rawScore ?? null;
  out.riskLevel = raw.riskLevel ?? raw.level ?? "unknown";
  out.trend = raw.trend ?? "";
  out.regimeDurationDays = raw.regimeDurationDays ?? raw.durationDays ?? null;

  const alloc = raw.allocation ?? {};
  out.allocation = {
    equity: raw.equityRange ?? alloc.equity ?? raw.equity ?? "--",
    bonds: raw.bondsRange ?? alloc.bonds ?? raw.bonds ?? "--",
    cash: raw.cashRange ?? alloc.cash ?? raw.cash ?? "--",
  };

  out.drivers = Array.isArray(raw.drivers) ? raw.drivers : (Array.isArray(raw.componentNotes) ? raw.componentNotes : []);
  out.brief = raw.brief ?? raw.shareText ?? raw.summary ?? "";

  // Optional model breakdown
  const contrib = raw.componentContrib ?? raw.components ?? {};
  out.components = {
    trend: contrib.trend ?? null,
    stress: contrib.stress ?? null,
    regime: contrib.regime ?? null,
  };

  // Optional inputs table
  out.inputs = raw.inputsTable ?? raw.inputs ?? raw.marketInputs ?? null;

  return out;
}

function riskLabel(level){
  const v = String(level || "").toLowerCase();
  if (v === "low") return { cls:"low", text:"Low", hint:"Risk supportive" };
  if (v === "high") return { cls:"high", text:"High", hint:"Defensive" };
  if (v === "neutral" || v === "medium") return { cls:"neutral", text:"Neutral", hint:"Balanced" };
  return { cls:"neutral", text: String(level || "Neutral"), hint:"Balanced" };
}

function setBadge(level){
  const b = $("riskBadge");
  if (!b) return;
  const r = riskLabel(level);
  b.classList.remove("low","neutral","high");
  b.classList.add(r.cls);
  safeText("riskLevelText", `${r.text}`);
  safeText("riskHint", `${r.hint}`);
}

function renderDrivers(drivers){
  const ul = $("driversList");
  if (!ul) return;
  ul.innerHTML = "";
  const arr = Array.isArray(drivers) ? drivers.filter(Boolean).slice(0,3) : [];
  if (arr.length === 0){
    ul.innerHTML = "<li class='muted'>No major change drivers today.</li>";
    return;
  }
  for (const d of arr){
    const li = document.createElement("li");
    li.textContent = String(d);
    ul.appendChild(li);
  }
}

function renderComponents(c){
  const t = Number(c?.trend);
  const s = Number(c?.stress);
  const r = Number(c?.regime);

  // Hide if not available
  const has = [t,s,r].some(x => Number.isFinite(x));
  const wrap = $("breakdownWrap");
  if (!wrap) return;
  if (!has){
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";

  const sum = [t,s,r].filter(Number.isFinite).reduce((a,b)=>a+b,0) || 100;
  const toPct = (x)=> Number.isFinite(x) ? Math.max(0, Math.min(100, (x/sum)*100)) : 0;

  safeText("trendScore", Number.isFinite(t) ? String(t) : "--");
  safeText("stressScore", Number.isFinite(s) ? String(s) : "--");
  safeText("regimeScore", Number.isFinite(r) ? String(r) : "--");

  const setBar = (id, x)=>{ const el = $(id); if (el) el.style.width = `${toPct(x).toFixed(1)}%`; };
  setBar("trendBar", t);
  setBar("stressBar", s);
  setBar("regimeBar", r);
}

function renderInputsTable(inputs){
  const tbody = $("inputsTbody");
  const wrap = $("inputsWrap");
  if (!tbody || !wrap) return;

  // If not provided, keep module visible but show note (for SEO + trust, still ok)
  if (!inputs || !Array.isArray(inputs) || inputs.length === 0){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Inputs table will populate once daily input fields are enabled in latest.json.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  for (const row of inputs.slice(0,12)){
    const asset = row.asset ?? row.symbol ?? "--";
    const price = row.price ?? row.close ?? null;
    const chg20 = row.change20d ?? row.chg20d ?? row.change20 ?? null;
    const ma200pos = row.ma200Pos ?? row.ma200_position ?? row.trend200d ?? "--";
    const sig = String(row.signal ?? row.riskSignal ?? "--").toLowerCase();

    let sigCls = "neutral";
    let sigTxt = row.signal ?? row.riskSignal ?? "--";
    if (sig.includes("risk-on") || sig.includes("on")) sigCls = "on";
    if (sig.includes("stress") || sig.includes("off") || sig.includes("risk-off")) sigCls = "off";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${asset}</b></td>
      <td>${price === null ? "--" : fmt(price,2)}</td>
      <td>${chg20 === null ? "--" : pct(chg20,2)}</td>
      <td>${ma200pos}</td>
      <td><span class="sig ${sigCls}"><span class="dot"></span>${sigTxt}</span></td>
    `;
    tbody.appendChild(tr);
  }
}

(async function main(){
  // Fallback order as requested: latest.json -> /data/latest.json -> risk_index.json
  const raw = await fetchFirstJson(["/latest.json", "/data/latest.json", "/risk_index.json"]);
  if (!raw){
    safeText("mriValue", "--");
    safeText("updatedDate", "No data");
    return;
  }

  const data = normalizeLatest(raw);

  safeText("mriValue", data.mri === null ? "--" : String(Math.round(Number(data.mri))));
  setBadge(data.riskLevel);

  safeText("trendText", data.trend ? String(data.trend) : "—");
  safeText("durationText", data.regimeDurationDays === null ? "—" : `${data.regimeDurationDays} days`);
  safeText("updatedDate", data.date || "—");

  safeText("equityRange", String(data.allocation.equity || "--"));
  safeText("bondsRange", String(data.allocation.bonds || "--"));
  safeText("cashRange", String(data.allocation.cash || "--"));

  renderDrivers(data.drivers);
  renderComponents(data.components);
  renderInputsTable(data.inputs);

  // Brief
  const brief = $("briefText");
  if (brief){
    const txt = String(data.brief || "").trim();
    if (txt.length >= 40) brief.textContent = txt;
    else brief.textContent =
      `Today’s MRI indicates a ${riskLabel(data.riskLevel).text.toLowerCase()} risk environment. ` +
      `Use the suggested exposure ranges to maintain risk discipline, and monitor for regime changes. ` +
      `This is risk awareness only, not investment advice.`;
  }
})();
