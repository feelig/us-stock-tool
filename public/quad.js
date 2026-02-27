function $(id){ return document.getElementById(id); }
function safeText(id, v){ const el = $(id); if (el) el.textContent = v; }
function pct(n){ if (n===null||n===undefined||Number.isNaN(n)) return "--"; return `${(Number(n)*100).toFixed(2)}%`; }
function fmt(n){ if (n===null||n===undefined||Number.isNaN(n)) return "--"; return Number(n).toFixed(2); }

function riskMeta(level){
  const v = String(level||"").toLowerCase();
  if (v === "low") return { cls:"risk-low", label:"Low", meaning:"Risk supportive" };
  if (v === "high") return { cls:"risk-high", label:"High", meaning:"Defensive" };
  return { cls:"risk-neutral", label: v === "neutral" || v === "medium" ? "Neutral" : String(level||"Neutral"), meaning:"Balanced" };
}

function setRiskBadge(level){
  const badge = $("riskBadge");
  if (!badge) return;
  badge.classList.remove("risk-low","risk-neutral","risk-high");
  const r = riskMeta(level);
  badge.classList.add(r.cls);
  safeText("riskLevelText", r.label);
  safeText("riskMeaning", r.meaning);
}

async function fetchLatest(){
  try{
    const r = await fetch("/data/latest.json", { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}

function renderInputs(inputs){
  const tbody = $("inputsTbody");
  if (!tbody) return;
  if (!Array.isArray(inputs) || inputs.length === 0){
    tbody.innerHTML = `<tr><td colspan="5">inputsTable missing — backend not populated</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  for (const row of inputs.slice(0,4)){
    const sig = String(row.signal||"--").toLowerCase();
    let cls = "neutral";
    if (sig.includes("risk-on") || sig.includes("on")) cls = "on";
    if (sig.includes("risk-off") || sig.includes("stress") || sig.includes("off")) cls = "off";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${row.asset || "--"}</b></td>
      <td>${fmt(row.price)}</td>
      <td>${pct(row.change20d)}</td>
      <td>${row.ma100Pos || row.ma200Pos || "--"}</td>
      <td><span class="sig ${cls}"><span class="dot"></span>${row.signal || "--"}</span></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderComponents(c){
  const t = Number(c?.trend);
  const s = Number(c?.stress);
  const r = Number(c?.regime);
  const has = [t,s,r].some(x => Number.isFinite(x));
  if (!has){
    safeText("componentsMissing", "components missing — backend not populated");
    return;
  }
  const set = (id, val) => { const el = $(id); if (el) el.style.width = `${Math.max(0, Math.min(100, val))}%`; };
  safeText("trendVal", Number.isFinite(t)?String(t):"--");
  safeText("stressVal", Number.isFinite(s)?String(s):"--");
  safeText("regimeVal", Number.isFinite(r)?String(r):"--");
  set("trendBar", t);
  set("stressBar", s);
  set("regimeBar", r);
}

function renderDrivers(drivers){
  const ul = $("driversList");
  if (!ul) return;
  if (!Array.isArray(drivers) || drivers.length === 0){
    ul.innerHTML = `<li>drivers missing — backend not populated</li>`;
    return;
  }
  ul.innerHTML = "";
  drivers.slice(0,3).forEach(d => {
    const li = document.createElement("li");
    li.textContent = String(d);
    ul.appendChild(li);
  });
}

function renderOutlook(outlook){
  safeText("baseCase", outlook?.baseCase || "outlook.baseCase missing — backend not populated");
  safeText("upside", outlook?.upsideTrigger || "outlook.upsideTrigger missing — backend not populated");
  safeText("downside", outlook?.downsideTrigger || "outlook.downsideTrigger missing — backend not populated");
}

function renderResponse(plan){
  const ul = $("responseList");
  if (!ul) return;
  if (!Array.isArray(plan) || plan.length === 0){
    ul.innerHTML = `<li>responsePlan missing — backend not populated</li>`;
    return;
  }
  ul.innerHTML = "";
  plan.slice(0,3).forEach(p => {
    const li = document.createElement("li");
    li.textContent = String(p);
    ul.appendChild(li);
  });
}

(async function main(){
  const data = await fetchLatest();
  if (!data){
    safeText("mriValue", "--");
    safeText("updatedDate", "data missing — check /data/latest.json");
    return;
  }

  safeText("mriValue", Number.isFinite(Number(data.mri)) ? String(Math.round(Number(data.mri))) : "--");
  setRiskBadge(data.riskLevel);
  safeText("updatedDate", data.date || "--");
  safeText("equityRange", data.equityRange || "--");

  renderInputs(data.inputsTable);
  renderComponents(data.components || {});
  renderDrivers(data.drivers || []);
  renderOutlook(data.outlook || {});
  renderResponse(data.responsePlan || []);
})();
