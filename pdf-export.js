/* ═══════════════════════════════════════════════════════
   pdf-export.js  —  Massenstromrechner PWA
   A4-PDF-Export via separatem Print-DOM + window.print()

   Unterstützte Tabs:
   · Heizung/Kälte  (Massenstrom, Leistung, Δt + Rohrempfehlung)
   · Lüftung        (Volumenstrom, Leistung, Δt)
   · Rohrdimensionierung
   · h,x-Diagramm   (Canvas-PNG + Zustandstabelle)
═══════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────────────────────
   MODAL — Projektdaten erfassen
─────────────────────────────────────── */
function openPdfSheet() {
  // Bestehenden Modal entfernen
  document.getElementById('pdf-modal')?.remove();

  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const modal = document.createElement('div');
  modal.id = 'pdf-modal';
  modal.innerHTML = `
    <div id="pdf-overlay" onclick="closePdfSheet()"></div>
    <div id="pdf-sheet">
      <div class="sh-handle"></div>
      <div class="sh-title">PDF exportieren</div>
      <div class="sh-sub">Projektdaten für die Dokumentation</div>
      <div class="sh-body" style="padding-top:12px">

        <div class="igrp">
          <div class="ilbl">Sachbearbeiter</div>
          <div class="iwrap">
            <input class="inp" id="pdf-sb" type="text" placeholder="Name"
              style="font-size:16px;padding:12px 14px"/>
          </div>
        </div>

        <div class="igrp">
          <div class="ilbl">Projekt</div>
          <div class="iwrap">
            <input class="inp" id="pdf-pj" type="text" placeholder="Projektbezeichnung"
              style="font-size:16px;padding:12px 14px"/>
          </div>
        </div>

        <div class="igrp" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div class="ilbl">Projektnummer</div>
            <div class="iwrap">
              <input class="inp" id="pdf-nr" type="text" placeholder="z.B. 2024-001"
                style="font-size:15px;padding:12px 14px"/>
            </div>
          </div>
          <div>
            <div class="ilbl">Datum</div>
            <div class="iwrap">
              <input class="inp" id="pdf-dt" type="text" value="${today}"
                style="font-size:15px;padding:12px 14px"/>
            </div>
          </div>
        </div>

        <button onclick="triggerPdfPrint()"
          style="width:100%;height:54px;border:none;border-radius:14px;
                 background:linear-gradient(135deg,#4fa8ff,#2e80d8);
                 color:#fff;font-size:16px;font-weight:700;cursor:pointer;
                 margin-top:8px;box-shadow:0 10px 30px rgba(79,168,255,.25)">
          Als PDF speichern
        </button>
        <button onclick="closePdfSheet()"
          style="width:100%;height:44px;border:none;border-radius:12px;
                 background:rgba(255,255,255,.07);color:rgba(255,255,255,.55);
                 font-size:14px;cursor:pointer;margin-top:8px">
          Abbrechen
        </button>
      </div>
    </div>
  `;

  // Inline-Styles für Modal (funktioniert ohne externe CSS-Abhängigkeit)
  const style = document.createElement('style');
  style.id = 'pdf-modal-style';
  style.textContent = `
    #pdf-overlay {
      position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:500;
      backdrop-filter:blur(6px);
    }
    #pdf-sheet {
      position:fixed;bottom:0;left:0;right:0;z-index:501;
      background:#111;
      border-radius:22px 22px 0 0;
      border-top:1px solid rgba(255,255,255,.12);
      padding:12px 20px calc(20px + env(safe-area-inset-bottom));
      max-width:540px;margin:0 auto;
      animation:slideUp .25s ease;
    }
    @keyframes slideUp {
      from{transform:translateY(100%);opacity:0}
      to  {transform:translateY(0);opacity:1}
    }
    .sh-handle{
      width:36px;height:4px;border-radius:2px;
      background:rgba(255,255,255,.22);margin:0 auto 14px;
    }
    .sh-title{font-size:17px;font-weight:700;margin-bottom:4px}
    .sh-sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:16px}
    .sh-body{}
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('pdf-sb')?.focus(), 100);
}

function closePdfSheet() {
  document.getElementById('pdf-modal')?.remove();
  document.getElementById('pdf-modal-style')?.remove();
}

/* ───────────────────────────────────────
   DRUCKAUSLÖSER
─────────────────────────────────────── */
function triggerPdfPrint() {
  const meta = {
    sb:   document.getElementById('pdf-sb')?.value.trim()  || '–',
    proj: document.getElementById('pdf-pj')?.value.trim()  || '–',
    nr:   document.getElementById('pdf-nr')?.value.trim()  || '–',
    date: document.getElementById('pdf-dt')?.value.trim()  || '–',
  };

  closePdfSheet();

  // Aktiven Tab ermitteln
  const activeTab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'flow';

  let html = '';
  if      (activeTab === 'flow') html = _buildFlowPage(meta);
  else if (activeTab === 'luft') html = _buildLuftPage(meta);
  else if (activeTab === 'pipe') html = _buildPipePage(meta);
  else if (activeTab === 'hx')   html = _buildHxPage(meta);
  else                           html = _buildFlowPage(meta);

  _openPrintWindow(html);
}

/* ───────────────────────────────────────
   PRINT-FENSTER ÖFFNEN
─────────────────────────────────────── */
function _openPrintWindow(bodyHtml) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Popup blockiert \u2014 bitte Popups f\u00fcr diese Seite erlauben.');
    return;
  }
  const closeBtn = `
    <div class="no-print" style="
      position:fixed;top:12px;right:14px;z-index:999;
      display:flex;gap:8px;align-items:center">
      <button onclick="window.print()" style="
        background:#1a3a5c;color:#fff;border:none;border-radius:8px;
        padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;
        font-family:Arial,sans-serif">
        &#128438; Drucken / Als PDF speichern
      </button>
      <button onclick="window.close()" style="
        background:#e0e6ef;color:#333;border:none;border-radius:8px;
        padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;
        font-family:Arial,sans-serif">
        &#10005; Schlie&szlig;en
      </button>
    </div>
    <div class="no-print" style="height:48px"></div>`;

  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"/>
<title>Massenstromrechner \u2014 Ausdruck</title>
<style>${_printCSS()}</style>
</head><body>${closeBtn}${bodyHtml}</body></html>`);
  win.document.close();
}

/* ───────────────────────────────────────
   GEMEINSAMES CSS (Print + Preview)
─────────────────────────────────────── */
function _printCSS() {
  return `
*{box-sizing:border-box;margin:0;padding:0}
html,body{
  width:210mm;background:white;color:#000;
  font-family:Arial,Helvetica,sans-serif;font-size:9pt;
}
@page{
  size:A4 portrait;
  margin:12mm 14mm 12mm 14mm;
}
@media print{
  html,body{width:210mm}
  .no-print{display:none!important}
}

/* ── Header (kompakt) ── */
.ph{
  display:flex;justify-content:space-between;align-items:flex-end;
  border-bottom:2px solid #1a3a5c;padding-bottom:7px;margin-bottom:10px;
}
.ph-l h1{font-size:13pt;color:#1a3a5c;font-weight:700;letter-spacing:-.2px}
.ph-l p {font-size:7.5pt;color:#777;margin-top:1px}
.ph-r   {font-size:7.5pt;color:#555;text-align:right;line-height:1.6}
.ph-r strong{color:#1a3a5c;font-size:9pt}

/* ── Projektdaten (2-spaltig) ── */
.meta{
  display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;
  background:#f5f7fa;border:1px solid #e0e6ef;border-radius:6px;
  padding:8px 12px;margin-bottom:10px;font-size:8pt;
}
.meta-k{color:#888;font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:7pt}
.meta-v{font-weight:700;color:#1a2a3a;font-size:9pt;margin-top:1px}

/* ── Abschnitt-Titel ── */
.sec{
  font-size:7.5pt;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:#888;
  border-bottom:1px solid #e8edf2;padding-bottom:3px;margin:10px 0 6px;
}

/* ── Tabellen (kompakt) ── */
table{width:100%;border-collapse:collapse;font-size:8pt}
th{
  background:#1a3a5c;color:#fff;font-size:7pt;
  padding:4px 7px;text-align:left;font-weight:700;letter-spacing:.04em
}
td{padding:3px 7px;border-bottom:1px solid #edf0f4;vertical-align:top}
tr:last-child td{border-bottom:none}
tr:nth-child(even) td{background:#f9fafc}
.num{text-align:right;font-family:"Courier New",monospace;font-weight:700}
.badge{
  display:inline-block;font-size:6.5pt;font-weight:700;padding:1px 5px;
  border-radius:3px;vertical-align:middle;margin-left:4px;letter-spacing:.06em
}
.badge-h{background:#fff0e8;color:#c44a00;border:1px solid #f9c4a0}
.badge-k{background:#e5f8ff;color:#007099;border:1px solid #a0ddf5}
.badge-l{background:#f0eeff;color:#5b41cc;border:1px solid #c5b8f8}

/* ── Diagramm-Container ── */
.diag{
  width:100%;border:1px solid #dee4ef;border-radius:6px;
  overflow:hidden;margin:6px 0 10px;background:#f8f9fb;
}
.diag img{width:auto;max-width:100%;height:auto;max-height:148mm;display:block;margin:0 auto;object-fit:contain}

/* ── Ergebnis-Grid (Heizung/Kälte) ── */
.res-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.res-box{
  background:#f5f7fa;border:1px solid #e0e6ef;border-radius:6px;padding:8px 10px
}
.res-box.h{border-left:3px solid #e05a20}
.res-box.k{border-left:3px solid #0094b3}
.res-title{font-size:7pt;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#888;margin-bottom:5px}
.res-row{display:flex;justify-content:space-between;font-size:8pt;margin-bottom:2px}
.res-key{color:#555}
.res-val{font-family:"Courier New",monospace;font-weight:700;color:#1a2a3a}

/* ── Formel ── */
.fml{
  text-align:center;font-family:"Courier New",monospace;font-size:7.5pt;
  color:#888;margin:6px 0;letter-spacing:.02em
}
`;
}

/* ───────────────────────────────────────
   HEADER HTML (wiederverwendbar)
─────────────────────────────────────── */
function _header(meta, subtitle) {
  const today = meta.date;
  return `
  <div class="ph">
    <div class="ph-l">
      <h1>ṁ Massenstromrechner</h1>
      <p>${subtitle}</p>
    </div>
    <div class="ph-r">
      <strong>${meta.nr}</strong><br>
      ${today}
    </div>
  </div>
  <div class="meta">
    <div><div class="meta-k">Sachbearbeiter</div><div class="meta-v">${meta.sb}</div></div>
    <div><div class="meta-k">Datum</div><div class="meta-v">${meta.date}</div></div>
    <div><div class="meta-k">Projekt</div><div class="meta-v">${meta.proj}</div></div>
    <div><div class="meta-k">Projektnummer</div><div class="meta-v">${meta.nr}</div></div>
  </div>`;
}

/* ───────────────────────────────────────
   TAB: HEIZUNG / KÄLTE
─────────────────────────────────────── */
function _buildFlowPage(meta) {
  // Daten aus DOM lesen
  const medium   = document.getElementById('medium');
  const medText  = medium?.options[medium.selectedIndex]?.text || 'Wasser';
  const cpVal    = document.getElementById('cp-val')?.textContent  || '–';
  const rhoVal   = document.getElementById('rho-val')?.textContent || '–';
  const frost    = document.getElementById('frost-chip')?.style.display !== 'none'
                   ? document.getElementById('frost-val')?.textContent || '' : '';

  // Heizung-Eingaben
  const hMode  = document.querySelector('.mbtn.active[data-p="h"]')?.dataset?.v || 'ms';
  const hQ     = document.getElementById('h-q')?.value     || '–';
  const hQUnit = document.getElementById('h-q-unit')?.textContent || 'W';
  const hMs    = document.getElementById('h-ms-in')?.value || '–';
  const hDt    = document.getElementById('h-dt')?.value    || '–';

  // Kälte-Eingaben
  const kMode  = document.querySelector('.mbtn.active[data-p="k"]')?.dataset?.v || 'ms';
  const kQ     = document.getElementById('k-q')?.value     || '–';
  const kQUnit = document.getElementById('k-q-unit')?.textContent || 'W';
  const kMs    = document.getElementById('k-ms-in')?.value || '–';
  const kDt    = document.getElementById('k-dt')?.value    || '–';

  // Ergebnis-Werte
  const hV1 = _txt('h-out-v1'); const hU1 = _txt('h-out-u1');
  const hV2 = _txt('h-out-v2'); const hU2 = _txt('h-out-u2');
  const kV1 = _txt('k-out-v1'); const kU1 = _txt('k-out-u1');
  const kV2 = _txt('k-out-v2'); const kU2 = _txt('k-out-u2');

  const modeLabel = { ms:'Massenstrom berechnen', q:'Leistung berechnen', dt:'ΔT berechnen' };

  return `
  ${_header(meta, 'Heizung · Kälte — Massenstromberechnung')}

  <div class="sec">Wärmeträger</div>
  <table>
    <tr><th>Medium</th><th>c&#7453; [kJ/(kg·K)]</th><th>ρ [kg/m³]</th><th>Frostschutz</th></tr>
    <tr>
      <td>${medText}</td>
      <td class="num">${cpVal}</td>
      <td class="num">${rhoVal}</td>
      <td>${frost || '–'}</td>
    </tr>
  </table>

  <div class="sec">Eingaben</div>
  <table>
    <thead><tr><th>Größe</th><th>Heizung</th><th>Kälte</th></tr></thead>
    <tbody>
      <tr><td>Modus</td>
        <td>${modeLabel[hMode] || hMode}</td>
        <td>${modeLabel[kMode] || kMode}</td></tr>
      <tr><td>Leistung Q</td>
        <td class="num">${hMode !== 'ms' ? _fmt(hQ) + ' ' + hQUnit : '–'}</td>
        <td class="num">${kMode !== 'ms' ? _fmt(kQ) + ' ' + kQUnit : '–'}</td></tr>
      <tr><td>Massenstrom ṁ</td>
        <td class="num">${hMode !== 'q'  ? _fmt(hMs) + ' kg/h' : '–'}</td>
        <td class="num">${kMode !== 'q'  ? _fmt(kMs) + ' kg/h' : '–'}</td></tr>
      <tr><td>Temperaturdifferenz ΔT</td>
        <td class="num">${hMode !== 'dt' ? _fmt(hDt) + ' K' : '–'}</td>
        <td class="num">${kMode !== 'dt' ? _fmt(kDt) + ' K' : '–'}</td></tr>
    </tbody>
  </table>

  <div class="sec">Ergebnisse</div>
  <div class="res-grid">
    <div class="res-box h">
      <div class="res-title">&#9632; Heizung</div>
      <div class="res-row"><span class="res-key">${hU1}</span><span class="res-val">${hV1} ${hU1}</span></div>
      <div class="res-row"><span class="res-key">${hU2}</span><span class="res-val">${hV2} ${hU2}</span></div>
    </div>
    <div class="res-box k">
      <div class="res-title">&#9632; Kälte</div>
      <div class="res-row"><span class="res-key">${kU1}</span><span class="res-val">${kV1} ${kU1}</span></div>
      <div class="res-row"><span class="res-key">${kU2}</span><span class="res-val">${kV2} ${kU2}</span></div>
    </div>
  </div>

  <div class="fml">
    ṁ = Q / (c&#7453; × ΔT) &nbsp;·&nbsp; Q = ṁ × c&#7453; × ΔT &nbsp;·&nbsp; ΔT = Q / (ṁ × c&#7453;)
  </div>

  ${_pipeSection()}
  `;
}

/* Rohrtabelle aus dem DOM der Heizung/Kälte-Seite */
function _pipeSection() {
  const piH = document.getElementById('pi-h');
  const piK = document.getElementById('pi-k');
  const hasH = piH && piH.style.display !== 'none';
  const hasK = piK && piK.style.display !== 'none';
  if (!hasH && !hasK) return '';

  let rows = '';
  if (hasH) {
    const vol = document.getElementById('pi-h-vol')?.textContent || '';
    rows += `<tr><td colspan="5" style="background:#fff0e8;font-weight:700;font-size:7.5pt;color:#c44000">
      ▲ Heizung ${vol}</td></tr>`;
    rows += _pipeRows('pi-h-pair', 'h');
  }
  if (hasK) {
    const vol = document.getElementById('pi-k-vol')?.textContent || '';
    rows += `<tr><td colspan="5" style="background:#e5f8ff;font-weight:700;font-size:7.5pt;color:#006a88">
      ▼ Kälte ${vol}</td></tr>`;
    rows += _pipeRows('pi-k-pair', 'k');
  }

  return `
  <div class="sec">Rohrdimensionierungsempfehlung (max. 100 Pa/m)</div>
  <table>
    <thead><tr>
      <th>Norm</th><th>DN</th><th>d&#7522; [mm]</th>
      <th>Δp/m [Pa/m]</th><th>v [m/s]</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:7pt;color:#aaa;margin-top:4px">
    Darcy-Weisbach · Colebrook-White · Wasser 60 °C · ε Stahl 0,046 mm · ε Mapress 0,015 mm
  </p>`;
}

function _pipeRows(containerId, type) {
  const el = document.getElementById(containerId);
  if (!el) return '';
  const cards = el.querySelectorAll('.pm');
  let rows = '';
  cards.forEach(c => {
    if (c.classList.contains('na')) return;
    const norm = c.querySelector('.pm-std')?.textContent.replace('★', '').trim() || '–';
    const dn   = c.querySelector('.pm-dn')?.textContent.trim()  || '–';
    const dim  = c.querySelector('.pm-dim')?.textContent.replace(/\s+/g,' ').trim() || '–';
    const dpEl = c.querySelector('.pm-r .pm-v');
    const dp   = dpEl?.firstChild?.textContent.trim() || '–';
    const vEls = c.querySelectorAll('.pm-r');
    const v    = vEls[1]?.querySelector('.pm-v')?.textContent.trim() || '–';
    const best = c.classList.contains('best') || c.classList.contains('best-h') || c.classList.contains('best-k');
    const cls  = type === 'h' ? 'badge-h' : 'badge-k';
    rows += `<tr>
      <td>${norm}${best ? `<span class="badge ${cls}">★ empf.</span>` : ''}</td>
      <td class="num">${dn}</td>
      <td class="num">${dim}</td>
      <td class="num">${dp}</td>
      <td class="num">${v}</td>
    </tr>`;
  });
  return rows;
}

/* ───────────────────────────────────────
   TAB: LÜFTUNG
─────────────────────────────────────── */
function _buildLuftPage(meta) {
  const hk     = document.getElementById('luft-btn-h')?.classList.contains('on-h') ? 'h' : 'k';
  const hkLbl  = hk === 'h' ? 'Heizleistung' : 'Kühlleistung';
  const tzlH   = document.getElementById('luft-tzl-h')?.value || '–';
  const tzlK   = document.getElementById('luft-tzl-k')?.value || '–';
  const trH    = document.getElementById('luft-tr-h')?.value  || '20';
  const trK    = document.getElementById('luft-tr-k')?.value  || '26';
  const vOut   = _txt('luft-v-out');
  const dtOut  = _txt('luft-dt-out');
  const ms     = _txt('luft-ms');
  const kwOut  = _txt('luft-kw');
  const rho    = document.getElementById('luft-rho-display')?.textContent || '–';
  const fac    = document.getElementById('luft-factor-display')?.textContent || '–';
  const mainVal = document.getElementById('luft-main-val')?.textContent || '–';
  const mainLbl = document.getElementById('luft-main-lbl')?.textContent || '–';

  return `
  ${_header(meta, `Lüftung — ${hkLbl}`)}

  <div class="sec">Temperaturen</div>
  <table>
    <thead><tr><th></th><th>Zuluft t&#x2c6;&#x1d61;&#x1d38; [°C]</th><th>Raum t&#x1d63; [°C]</th><th>Δt [K]</th></tr></thead>
    <tbody>
      <tr>
        <td><span style="color:#c44000;font-weight:700">▲ Heizen</span></td>
        <td class="num">${_fmt(tzlH)}</td>
        <td class="num">${_fmt(trH)}</td>
        <td class="num">${_fmtDiff(tzlH, trH)}</td>
      </tr>
      <tr>
        <td><span style="color:#006a88;font-weight:700">▼ Kühlen</span></td>
        <td class="num">${_fmt(tzlK)}</td>
        <td class="num">${_fmt(trK)}</td>
        <td class="num">${_fmtDiff(trK, tzlK)}</td>
      </tr>
    </tbody>
  </table>

  <div class="sec">Luftkennwerte</div>
  <table>
    <tr><td>Luftdichte ρ&#x1d38; bei Zulufttemperatur</td><td class="num">${rho}</td></tr>
    <tr><td>c&#7453; · ρ / 3600</td><td class="num">${fac}</td></tr>
    <tr><td>c&#7453; Luft</td><td class="num">1,005 J/(kg·K)</td></tr>
  </table>

  <div class="sec">Ergebnis — ${hkLbl}</div>
  <div class="res-grid">
    <div class="res-box ${hk}">
      <div class="res-title">${mainLbl}</div>
      <div class="res-row"><span class="res-key">Wert</span>
        <span class="res-val">${mainVal}</span></div>
      <div class="res-row"><span class="res-key">kW</span>
        <span class="res-val">${kwOut} kW</span></div>
    </div>
    <div class="res-box ${hk}">
      <div class="res-title">Weitere Größen</div>
      <div class="res-row"><span class="res-key">V̇ [m³/h]</span>
        <span class="res-val">${vOut}</span></div>
      <div class="res-row"><span class="res-key">Δt [K]</span>
        <span class="res-val">${dtOut}</span></div>
      <div class="res-row"><span class="res-key">ṁ [kg/h]</span>
        <span class="res-val">${ms}</span></div>
    </div>
  </div>

  <div class="fml">
    Q = V̇ × ρ&#x1d38;(t&#x2c6;&#x1d61;&#x1d38;) × c&#7453; × Δt &nbsp;·&nbsp;
    ρ&#x1d38;(t) = 353,05 / (t + 273,15) kg/m³
  </div>`;
}

/* ───────────────────────────────────────
   TAB: ROHRDIMENSIONIERUNG
─────────────────────────────────────── */
function _buildPipePage(meta) {
  const vol  = document.getElementById('p-vol')?.value || '–';
  const dp   = document.getElementById('p-dp')?.value  || '100';
  const el   = document.getElementById('pipe-results');

  let rows = '';
  el?.querySelectorAll('.pipe-pair').forEach(pair => {
    const dn   = pair.previousElementSibling?.textContent.trim() || '';
    pair.querySelectorAll('.pm').forEach(c => {
      if (c.classList.contains('na')) return;
      const norm = c.querySelector('.pm-std')?.textContent.replace('★','').trim() || '–';
      const diDim = c.querySelector('.pm-dim')?.textContent.replace(/\s+/g,' ').trim() || '–';
      const dpEl  = c.querySelector('.pm-r .pm-v');
      const dpTxt = dpEl?.firstChild?.textContent.trim() || '–';
      const vTxt  = c.querySelectorAll('.pm-r')[1]?.querySelector('.pm-v')?.textContent.trim() || '–';
      const best  = c.classList.contains('best');
      rows += `<tr>
        <td>${dn}${best ? '<span class="badge" style="background:#e8f0fe;color:#1a3a8c;border:1px solid #aac0f5">★ empf.</span>' : ''}</td>
        <td>${norm}</td>
        <td class="num">${diDim}</td>
        <td class="num">${dpTxt}</td>
        <td class="num">${vTxt}</td>
      </tr>`;
    });
  });

  return `
  ${_header(meta, 'Rohrdimensionierung')}

  <div class="sec">Parameter</div>
  <table>
    <tr><td>Volumenstrom V̇</td><td class="num">${_fmt(vol)} m³/h</td></tr>
    <tr><td>Max. Druckverlust</td><td class="num">${_fmt(dp)} Pa/m</td></tr>
  </table>

  <div class="sec">Rohre — Stahl &amp; Mapress Edelstahl</div>
  <table>
    <thead><tr>
      <th>DN</th><th>Norm</th><th>Abmessung</th>
      <th>Δp/m [Pa/m]</th><th>v [m/s]</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#aaa">Keine Daten</td></tr>'}</tbody>
  </table>
  <p style="font-size:7pt;color:#aaa;margin-top:4px">
    Stahl ≤ DN50: DIN EN 10255 Reihe M · ≥ DN65: DIN EN 10220 ·
    Mapress Edelstahl 1.4401: DIN EN 10312 · max. DN 100 ·
    Darcy-Weisbach · Colebrook-White
  </p>`;
}

/* ───────────────────────────────────────
   TAB: H,X-DIAGRAMM
─────────────────────────────────────── */
function _buildHxPage(meta) {
  const canvas = document.getElementById('hxCanvas');
  const imgSrc = canvas ? canvas.toDataURL('image/png') : null;

  // Werte aus neuem State-Layout lesen
  const T    = _txt('state-temp');
  const phi  = _txt('state-phi');
  const x    = _txt('state-x');
  const h    = _txt('state-h');
  const tdew = _txt('state-tdew');

  // Diagramm: volle Breite, Höhe dynamisch (max ~140mm für A4)
  const imgBlock = imgSrc
    ? `<div class="diag"><img src="${imgSrc}" alt="h,x-Diagramm nach Mollier"
         style="width:auto;max-width:100%;max-height:148mm;display:block;margin:0 auto"/></div>`
    : `<div class="diag" style="height:80mm;display:flex;align-items:center;
         justify-content:center;color:#bbb;font-size:9pt">
         Kein Diagramm verfügbar — Zustand setzen und erneut exportieren
       </div>`;

  return `
  ${_header(meta, 'h,x-Diagramm nach Mollier')}

  ${imgBlock}

  <div class="sec" style="margin-top:8px">Luftzustand</div>
  <table>
    <thead><tr><th>Größe</th><th>Symbol</th><th class="num">Wert</th></tr></thead>
    <tbody>
      <tr><td>Temperatur</td>        <td>T</td>  <td class="num">${T} °C</td></tr>
      <tr><td>Relative Feuchte</td>  <td>φ</td>  <td class="num">${phi} %</td></tr>
      <tr><td>Feuchtegehalt</td>     <td>x</td>  <td class="num">${x} g/kg</td></tr>
      <tr><td>Enthalpie</td>         <td>h</td>  <td class="num">${h} kJ/kg</td></tr>
      <tr><td>Taupunkttemperatur</td><td>Td</td> <td class="num">${tdew} °C</td></tr>
    </tbody>
  </table>
  <p style="font-size:7pt;color:#aaa;margin-top:4px">
    Luftdruck 1013,25 hPa · Magnus-Formel · h = 1,006·t + x·(2501 + 1,86·t) kJ/kg
  </p>`;
}

/* ───────────────────────────────────────
   HILFSFUNKTIONEN
─────────────────────────────────────── */
/** Text aus DOM-Element, ohne Kind-Spans */
function _txt(id) {
  const el = document.getElementById(id);
  if (!el) return '–';
  const node = el.firstChild;
  return (node?.nodeType === 3 ? node.textContent : el.textContent).trim() || '–';
}

/** Zahl formatieren oder '–' zurückgeben */
function _fmt(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? (v || '–') : v;
}

/** Temperaturdifferenz berechnen */
function _fmtDiff(a, b) {
  const na = parseFloat(String(a).replace(',', '.'));
  const nb = parseFloat(String(b).replace(',', '.'));
  if (isNaN(na) || isNaN(nb)) return '–';
  return (na - nb).toFixed(1) + ' K';
}
