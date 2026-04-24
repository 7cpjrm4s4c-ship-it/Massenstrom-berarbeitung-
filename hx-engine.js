/* ═══════════════════════════════════════════════════════
   hx-engine.js  —  h,x-Diagramm nach Mollier
   Massenstromrechner PWA  |  Phase 4.0

   Behebt alle Syntaxfehler der Vorversion.
   Vollständige Neuimplementierung:
   · Magnus-Formel (Sättigungsdampfdruck)
   · Korrekte Achsen mit Zahlenwerten
   · HiDPI (devicePixelRatio)
   · φ-Kurven, Isotherme, Sättigungskurve
   · Taupunkt + Feuchtkugeltemperatur
   · Interaktiver Tooltip (Touch & Mouse)
   · Resize-Handler
═══════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────────────────────
   PHYSIK
─────────────────────────────────────── */
const P_ATM = 1013.25; // hPa

/** Sättigungsdampfdruck nach Magnus [hPa] */
function pws(T) {
  return 6.112 * Math.exp(17.62 * T / (243.12 + T));
}

/** Feuchtegehalt x [g/kg] aus T [°C] und φ [%] */
function calcX(T, phi) {
  if (isNaN(T) || isNaN(phi) || phi <= 0) return 0;
  const pw = (phi / 100) * pws(T);
  if (pw >= P_ATM) return 999;
  return +(1000 * 0.622 * pw / (P_ATM - pw)).toFixed(3);
}

/** Enthalpie h [kJ/kg] aus T [°C] und x [g/kg] */
function calcH(T, x) {
  return 1.006 * T + (x / 1000) * (2501 + 1.86 * T);
}

/** Relative Feuchte φ [%] aus T [°C] und x [g/kg] */
function calcPhi(T, x) {
  if (isNaN(T) || isNaN(x) || x < 0) return NaN;
  const xk = x / 1000;
  const pw = xk * P_ATM / (0.622 + xk);
  return 100 * pw / pws(T);
}

/** Taupunkt [°C] aus x [g/kg] */
function calcTdew(x) {
  if (isNaN(x) || x <= 0) return NaN;
  const xk = x / 1000;
  const pw = xk * P_ATM / (0.622 + xk);
  const logpw = Math.log(pw / 6.112);
  return +(243.12 * logpw / (17.62 - logpw)).toFixed(2);
}

/** Feuchtkugeltemperatur [°C] — Näherung nach Sprung */
function calcTwet(T, x) {
  if (isNaN(T) || isNaN(x)) return NaN;
  // Iteration: tw so dass x(tw,100) = x + (2501 + 1.86·tw - 4.186·tw)⁻¹ · (T - tw) · 1.005
  // Vereinfachte direkte Näherung für Wetbulb
  let tw = T - (T - calcTdew(x)) * 0.4;
  for (let i = 0; i < 40; i++) {
    const xSat = calcX(tw, 100);
    const twNew = T - (xSat - x) * (2501 + 1.86 * tw) / (1.006 + 1.805 * x / 1000);
    if (Math.abs(twNew - tw) < 0.001) { tw = twNew; break; }
    tw = twNew;
  }
  return +tw.toFixed(2);
}

/** Hilfsfunktion: String → float (DE-Format: Komma als Dezimaltrenner) */
function num(v) {
  if (v === null || v === undefined || String(v).trim() === '') return NaN;
  const n = parseFloat(
    String(v).replace(/[−–—]/g, '-').replace(',', '.').trim()
  );
  return isNaN(n) ? NaN : n;
}

/* ───────────────────────────────────────
   DIAGRAMM-KONFIGURATION
─────────────────────────────────────── */
const CFG = {
  xMin: 0, xMax: 30,    // g/kg
  hMin: -15, hMax: 100, // kJ/kg
  tMin: -20, tMax: 55,  // °C (Isotherme)
  pad: { top: 24, right: 20, bottom: 46, left: 54 },
  phis:   [10, 20, 30, 40, 50, 60, 70, 80, 90],
  isoT:   [-10, 0, 10, 20, 30, 40, 50],
  xTicks: [0, 5, 10, 15, 20, 25, 30],
  hTicks: [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
};

/* ───────────────────────────────────────
   KOORDINATEN-TRANSFORMATION
─────────────────────────────────────── */
function toCanvas(x, h, W, H) {
  const { pad: p, xMin, xMax, hMin, hMax } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;
  return {
    px: p.left + (x - xMin) / (xMax - xMin) * cw,
    py: p.top  + ch - (h - hMin) / (hMax - hMin) * ch,
  };
}

function fromCanvas(px, py, W, H) {
  const { pad: p, xMin, xMax, hMin, hMax } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;
  return {
    x: (px - p.left) / cw * (xMax - xMin) + xMin,
    h: hMax - (py - p.top) / ch * (hMax - hMin),
  };
}

/* ───────────────────────────────────────
   GLOBALER ZUSTAND
─────────────────────────────────────── */
let _state = null;  // aktuell gesetzter Luftzustand

/* ───────────────────────────────────────
   HAUPT-ZEICHENFUNKTION
─────────────────────────────────────── */
function drawHxChart(state) {
  const canvas = document.getElementById('hxCanvas');
  if (!canvas) return;

  // HiDPI-Setup
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = Math.round(rect.width)  || 360;
  const H = Math.round(rect.height) || 480;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  /* Hintergrund */
  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, W, H);

  _drawGrid(ctx, W, H);
  _drawPhiCurves(ctx, W, H);
  _drawSaturation(ctx, W, H);
  _drawIsotherms(ctx, W, H);
  _drawAxes(ctx, W, H);
  if (state) _drawStatePoint(ctx, W, H, state);
}

/* ───────────────────────────────────────
   RASTER
─────────────────────────────────────── */
function _drawGrid(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth   = 0.5;

  CFG.xTicks.forEach(x => {
    const { px, py: pyTop }    = toCanvas(x, CFG.hMax, W, H);
    const {          py: pyBot } = toCanvas(x, CFG.hMin, W, H);
    ctx.beginPath(); ctx.moveTo(px, pyTop); ctx.lineTo(px, pyBot); ctx.stroke();
  });
  CFG.hTicks.forEach(h => {
    const { px: pxL, py }  = toCanvas(CFG.xMin, h, W, H);
    const { px: pxR }      = toCanvas(CFG.xMax, h, W, H);
    ctx.beginPath(); ctx.moveTo(pxL, py); ctx.lineTo(pxR, py); ctx.stroke();
  });
  ctx.restore();
}

/* ───────────────────────────────────────
   φ-KURVEN
─────────────────────────────────────── */
function _drawPhiCurves(ctx, W, H) {
  CFG.phis.forEach(phi => {
    const accent = phi === 50;
    ctx.save();
    ctx.strokeStyle = accent
      ? 'rgba(100,180,255,0.32)'
      : 'rgba(90,140,255,0.14)';
    ctx.lineWidth = accent ? 1.5 : 0.8;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    let first = true;
    for (let T = CFG.tMin; T <= CFG.tMax; T += 0.5) {
      const x = calcX(T, phi);
      const h = calcH(T, x);
      if (x < CFG.xMin - 0.5 || x > CFG.xMax + 0.5) { first = true; continue; }
      if (h < CFG.hMin - 5   || h > CFG.hMax + 5)    { first = true; continue; }
      const { px, py } = toCanvas(x, h, W, H);
      first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Beschriftung bei T ≈ 35°C
    const xL = calcX(35, phi);
    const hL = calcH(35, xL);
    if (xL >= CFG.xMin && xL <= CFG.xMax && hL >= CFG.hMin && hL <= CFG.hMax) {
      const { px, py } = toCanvas(xL, hL, W, H);
      ctx.save();
      ctx.fillStyle = 'rgba(100,170,255,0.55)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(phi + ' %', px + 2, py - 3);
      ctx.restore();
    }
  });
}

/* ───────────────────────────────────────
   SÄTTIGUNGSKURVE (φ = 100 %)
─────────────────────────────────────── */
function _drawSaturation(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = '#5ab0ff';
  ctx.lineWidth   = 2.2;
  ctx.shadowColor = 'rgba(90,176,255,0.45)';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  let first = true;
  for (let T = CFG.tMin; T <= CFG.tMax; T += 0.25) {
    const x = calcX(T, 100);
    const h = calcH(T, x);
    const { px, py } = toCanvas(x, h, W, H);
    first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Label
  const xL = calcX(22, 100), hL = calcH(22, xL);
  const { px, py } = toCanvas(xL, hL, W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(90,176,255,0.85)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('φ = 100 %', px + 5, py - 5);
  ctx.restore();
}

/* ───────────────────────────────────────
   ISOTHERME
─────────────────────────────────────── */
function _drawIsotherms(ctx, W, H) {
  CFG.isoT.forEach(T => {
    const x0 = 0;
    const xS = calcX(T, 100);
    const h0 = calcH(T, x0);
    const hS = calcH(T, xS);

    // Clip zu sichtbarem Bereich
    const xEnd = Math.min(xS, CFG.xMax);
    const hEnd = calcH(T, xEnd);

    if (h0 > CFG.hMax + 5 || hEnd < CFG.hMin - 5) return;

    const p0 = toCanvas(x0,   h0,   W, H);
    const p1 = toCanvas(xEnd, hEnd, W, H);

    ctx.save();
    ctx.strokeStyle = T === 0
      ? 'rgba(255,255,255,0.38)'
      : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = T === 0 ? 1.5 : 0.9;
    ctx.beginPath();
    ctx.moveTo(p0.px, p0.py);
    ctx.lineTo(p1.px, p1.py);
    ctx.stroke();
    ctx.restore();

    // Beschriftung links
    const { pad: p } = CFG;
    ctx.save();
    ctx.fillStyle = T === 0
      ? 'rgba(255,255,255,0.75)'
      : 'rgba(255,255,255,0.42)';
    ctx.font = (T === 0 ? 'bold ' : '') + '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(T + ' °C', p0.px - 3, p0.py + 4);
    ctx.restore();
  });
}

/* ───────────────────────────────────────
   ACHSEN + BESCHRIFTUNGEN
─────────────────────────────────────── */
function _drawAxes(ctx, W, H) {
  const { pad: p } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;

  // Achsenlinien
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.left, p.top);
  ctx.lineTo(p.left, p.top + ch);
  ctx.lineTo(p.left + cw, p.top + ch);
  ctx.stroke();
  ctx.restore();

  // x-Achse Zahlenwerte
  ctx.save();
  ctx.fillStyle  = 'rgba(255,255,255,0.45)';
  ctx.font       = '11px system-ui, sans-serif';
  ctx.textAlign  = 'center';
  CFG.xTicks.forEach(x => {
    const { px } = toCanvas(x, CFG.hMin, W, H);
    ctx.fillText(x, px, p.top + ch + 14);
  });
  // x-Achse Titel
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font      = 'bold 11px system-ui, sans-serif';
  ctx.fillText('x  [g/kg]', p.left + cw / 2, p.top + ch + 30);
  ctx.restore();

  // h-Achse Zahlenwerte
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font      = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  CFG.hTicks.forEach(h => {
    const { py } = toCanvas(CFG.xMin, h, W, H);
    ctx.fillText(h, p.left - 6, py + 4);
  });
  // h-Achse Titel (rotiert)
  ctx.save();
  ctx.translate(13, p.top + ch / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font      = 'bold 11px system-ui, sans-serif';
  ctx.fillText('h  [kJ/kg]', 0, 0);
  ctx.restore();
  ctx.restore();
}

/* ───────────────────────────────────────
   ZUSTANDSPUNKT + FADENKREUZ
─────────────────────────────────────── */
function _drawStatePoint(ctx, W, H, state) {
  if (!state || isNaN(state.T) || isNaN(state.x)) return;
  const { pad: p } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;
  const h  = calcH(state.T, state.x);
  const { px, py } = toCanvas(state.x, h, W, H);

  // Fadenkreuz
  ctx.save();
  ctx.strokeStyle = 'rgba(109,99,255,0.35)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(p.left, py); ctx.lineTo(p.left + cw, py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, p.top);  ctx.lineTo(px, p.top + ch); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Punkt mit Glühen
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fillStyle   = '#6d63ff';
  ctx.shadowColor = '#6d63ff';
  ctx.shadowBlur  = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ring
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(109,99,255,0.50)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  // Tooltip-Box
  const lines = [
    'T   ' + state.T.toFixed(1)      + ' °C',
    'φ   ' + state.phi.toFixed(1)     + ' %',
    'x   ' + state.x.toFixed(2)      + ' g/kg',
    'h   ' + h.toFixed(1)            + ' kJ/kg',
    'Td  ' + (state.tdew != null ? state.tdew.toFixed(1) : '--') + ' °C',
  ];
  const bw = 130, bh = lines.length * 16 + 14;
  // Position: rechts oben vom Punkt, an Rand anpassen
  let bx = px + 14, by = py - bh - 8;
  if (bx + bw > W - p.right) bx = px - bw - 14;
  if (by < p.top)             by = py + 14;

  ctx.save();
  ctx.fillStyle   = 'rgba(10,12,26,0.88)';
  ctx.strokeStyle = 'rgba(109,99,255,0.55)';
  ctx.lineWidth   = 1;
  _roundRect(ctx, bx, by, bw, bh, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font      = '12px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 9, by + 18 + i * 16));
  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ───────────────────────────────────────
   INTERAKTIVER TOOLTIP (Hover/Touch)
─────────────────────────────────────── */
function _setupInteraction(canvas) {
  let _rafPending = false;

  function handlePointer(clientX, clientY) {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => {
      _rafPending = false;
      const rect = canvas.getBoundingClientRect();
      const px   = clientX - rect.left;
      const py   = clientY - rect.top;
      const W    = rect.width;
      const H    = rect.height;
      const { pad: p } = CFG;
      if (px < p.left || px > W - p.right || py < p.top || py > H - p.bottom) {
        drawHxChart(_state);
        return;
      }
      const { x, h } = fromCanvas(px, py, W, H);
      if (x < CFG.xMin || x > CFG.xMax || h < CFG.hMin || h > CFG.hMax) {
        drawHxChart(_state);
        return;
      }
      // Schätze T aus h,x: T = (h - x/1000·2501) / (1.006 + x/1000·1.86)
      const T   = (h - x / 1000 * 2501) / (1.006 + x / 1000 * 1.86);
      const phi = calcPhi(T, x);
      const hoverState = {
        T:    +T.toFixed(2),
        phi:  +phi.toFixed(1),
        x:    +x.toFixed(2),
        tdew: calcTdew(x),
        _hover: true,
      };
      drawHxChart(_state);
      _drawHoverPoint(canvas.getContext('2d'), W, H, hoverState);
    });
  }

  canvas.addEventListener('mousemove', e => handlePointer(e.clientX, e.clientY), { passive: true });
  canvas.addEventListener('mouseleave', () => drawHxChart(_state));
  canvas.addEventListener('touchmove',  e => {
    e.preventDefault();
    handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
}

function _drawHoverPoint(ctx, W, H, state) {
  if (!state) return;
  const x  = state.x;
  const h  = calcH(state.T, x);
  const { px, py } = toCanvas(x, h, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle   = 'rgba(255,220,90,0.75)';
  ctx.shadowColor = 'rgba(255,200,60,0.6)';
  ctx.shadowBlur  = 12;
  ctx.fill();
  ctx.restore();

  // Mini-Tooltip
  const lines = [
    'T ' + state.T.toFixed(1) + ' °C',
    'φ ' + (isNaN(state.phi) ? '--' : state.phi.toFixed(0)) + ' %',
    'x ' + state.x.toFixed(2) + ' g/kg',
  ];
  const bw = 108, bh = lines.length * 15 + 10;
  let bx = px + 10, by = py - bh - 6;
  if (bx + bw > W - CFG.pad.right) bx = px - bw - 10;
  if (by < CFG.pad.top)             by = py + 10;

  ctx.save();
  ctx.fillStyle   = 'rgba(20,20,40,0.85)';
  ctx.strokeStyle = 'rgba(255,200,60,0.4)';
  ctx.lineWidth   = 0.8;
  _roundRect(ctx, bx, by, bw, bh, 6);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font      = '11px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 15 + i * 15));
  ctx.restore();
}

/* ───────────────────────────────────────
   ZUSTAND SETZEN (Button-Handler)
─────────────────────────────────────── */
function setHxState() {
  const T   = num(document.getElementById('hx-temp')?.value);
  const phi = num(document.getElementById('hx-rh')?.value);
  const xIn = num(document.getElementById('hx-x')?.value);

  const modeRH = document.getElementById('mode-rh')?.classList.contains('active');

  if (isNaN(T)) {
    _showHxError('Bitte Temperatur eingeben.');
    return;
  }

  let state = null;

  if (modeRH) {
    if (isNaN(phi) || phi <= 0 || phi > 100) {
      _showHxError('Relative Feuchte φ: 1 – 100 %');
      return;
    }
    const x   = calcX(T, phi);
    const tdew = calcTdew(x);
    const twet = calcTwet(T, x);
    state = { T, phi, x, h: calcH(T, x), tdew, twet };
  } else {
    if (isNaN(xIn) || xIn < 0) {
      _showHxError('Feuchtegehalt x ≥ 0 g/kg');
      return;
    }
    const ph   = calcPhi(T, xIn);
    const tdew = calcTdew(xIn);
    const twet = calcTwet(T, xIn);
    state = { T, phi: ph, x: xIn, h: calcH(T, xIn), tdew, twet };
  }

  _state = state;
  _renderHxState(state);
}

function _renderHxState(state) {
  const fmt = (v, d) => (isNaN(v) || v == null) ? '--' : v.toFixed(d);
  document.getElementById('state-temp').textContent = fmt(state.T,    1) + ' °C';
  document.getElementById('state-rh').textContent   = fmt(state.phi,  1) + ' %';
  document.getElementById('state-x').textContent    = fmt(state.x,    2) + ' g/kg';
  document.getElementById('state-h').textContent    = fmt(state.h,    1) + ' kJ/kg';
  drawHxChart(state);
}

function _showHxError(msg) {
  const box = document.getElementById('hx-state');
  if (box) {
    box.innerHTML = `<span style="color:rgba(255,100,80,0.9);font-size:14px;">⚠ ${msg}</span>`;
    setTimeout(() => _renderHxState(_state || {}), 2000);
  }
}

/* ───────────────────────────────────────
   MODUS φ ↔ x UMSCHALTEN
─────────────────────────────────────── */
function _hxModeSwitch(mode) {
  const isRH = mode === 'rh';
  document.getElementById('mode-rh')?.classList.toggle('active',  isRH);
  document.getElementById('mode-x') ?.classList.toggle('active', !isRH);
  const wRH = document.getElementById('wrap-rh');
  const wX  = document.getElementById('wrap-x');
  if (wRH) wRH.style.display = isRH ? '' : 'none';
  if (wX)  wX.style.display  = isRH ? 'none' : '';
}

/* ───────────────────────────────────────
   INITIALISIERUNG
─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Mode-Buttons */
  document.getElementById('mode-rh')?.addEventListener('click', () => _hxModeSwitch('rh'));
  document.getElementById('mode-x') ?.addEventListener('click', () => _hxModeSwitch('x'));

  /* Set-Zustand-Button */
  document.getElementById('hx-set')?.addEventListener('click', setHxState);

  /* Enter-Taste in Eingabefeldern */
  ['hx-temp','hx-rh','hx-x'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') setHxState();
    });
  });

  /* Interaktiver Tooltip */
  const canvas = document.getElementById('hxCanvas');
  if (canvas) _setupInteraction(canvas);

  /* Initialer Leer-Draw */
  _hxModeSwitch('rh');
  drawHxChart(null);

  /* Resize */
  let _resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => drawHxChart(_state), 120);
  });

  /* Tab-Wechsel: Canvas neu zeichnen wenn h,x sichtbar wird */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'hx') {
        requestAnimationFrame(() => drawHxChart(_state));
      }
    });
  });
});
