/* ═══════════════════════════════════════════════════════
   wrg-mischluft.js  —  Massenstromrechner PWA
   Wärmerückgewinnung (WRG) & Luftmischung
   Plattenwärmetauscher: nur sensible Wärme (x = const pro Strom)
═══════════════════════════════════════════════════════ */
'use strict';

/* ─── PHYSIK (standalone) ─── */
const _P = 1013.25;
const _pws = T => 6.112 * Math.exp(17.62 * T / (243.12 + T));
const _x   = (T, phi) => {
  if (isNaN(T) || isNaN(phi) || phi <= 0) return 0;
  const pw = phi / 100 * _pws(T);
  return pw >= _P ? 999 : +(1000 * 0.622 * pw / (_P - pw)).toFixed(3);
};
const _h   = (T, x) => +(1.006 * T + x / 1000 * (2501 + 1.86 * T)).toFixed(2);
const _phi = (T, x) => {
  if (isNaN(T) || isNaN(x) || x < 0) return NaN;
  const pw = x / 1000 * _P / (0.622 + x / 1000);
  return +(100 * pw / _pws(T)).toFixed(1);
};
const _rho = T => +(353.05 / (T + 273.15)).toFixed(4);
const _n   = v => isNaN(v) || v === null || String(v).trim() === '' ? NaN
             : parseFloat(String(v).replace(',', '.').trim());
const _fmt = (v, d) => isNaN(v) || v == null ? '\u2013' : (+v).toFixed(d);
const _$   = id => document.getElementById(id);

/* ─── ZUSTANDSBOX HTML ─── */
function _stateBox(title, s, color, sub) {
  return `
  <div style="background:var(--glass-mid);border:1px solid var(--gb-soft);
              border-radius:var(--r-m);padding:12px">
    <div style="font-family:var(--f);font-size:10px;font-weight:700;
                letter-spacing:.13em;text-transform:uppercase;
                color:${color};margin-bottom:8px">${title}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--f)">T [°C]</div>
        <div style="font-family:var(--fm);font-size:16px;font-weight:700;color:var(--t1)">${_fmt(s.T,1)}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--f)">φ [%]</div>
        <div style="font-family:var(--fm);font-size:16px;font-weight:700;color:var(--t1)">${_fmt(s.phi,1)}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--f)">x [g/kg]</div>
        <div style="font-family:var(--fm);font-size:14px;font-weight:700;color:var(--blue)">${_fmt(s.x,2)}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--f)">h [kJ/kg]</div>
        <div style="font-family:var(--fm);font-size:14px;font-weight:700;color:var(--blue)">${_fmt(s.h,1)}</div>
      </div>
    </div>
    ${sub ? `<div style="font-size:10px;color:var(--t3);margin-top:7px;font-family:var(--f)">${sub}</div>` : ''}
  </div>`;
}

/* ══════════════════════════════════════════════════════
   WRG — WÄRMERÜCKGEWINNUNG (Plattenwärmetauscher)
   Physik: η_t = (T_ZL − T_AU) / (T_AB − T_AU)
   T_ZL  = T_AU + η · (T_AB − T_AU)
   T_FL  = T_AB − η · (T_AB − T_AU)   [bei gleichen Massenströmen]
   x_ZL  = x_AU, x_FL = x_AB          [sensibler Tauscher]
══════════════════════════════════════════════════════ */
function calcWRG() {
  const T_ab  = _n(_$('wrg-ab-t')?.value);
  const ph_ab = _n(_$('wrg-ab-phi')?.value);
  const T_au  = _n(_$('wrg-au-t')?.value);
  const ph_au = _n(_$('wrg-au-phi')?.value);
  const eta   = _n(_$('wrg-eta')?.value) / 100;

  const el = _$('wrg-result');
  if (!el) return;

  if ([T_ab, ph_ab, T_au, ph_au, eta].some(isNaN)) {
    el.innerHTML = '<p style="color:var(--t3);font-size:12px;text-align:center;padding:12px">Alle Felder ausfüllen →</p>';
    return;
  }
  if (eta < 0 || eta > 1) {
    el.innerHTML = '<p style="color:rgba(255,100,80,.9);font-size:12px;text-align:center;padding:12px">⚠ Wirkungsgrad: 0–100 %</p>';
    return;
  }

  // Quellzustände
  const x_ab = _x(T_ab, ph_ab);
  const h_ab = _h(T_ab, x_ab);
  const x_au = _x(T_au, ph_au);
  const h_au = _h(T_au, x_au);

  // Ergebnisse
  const T_zl  = +(T_au + eta * (T_ab - T_au)).toFixed(1);
  const x_zl  = x_au;
  const T_fl  = +(T_ab - eta * (T_ab - T_au)).toFixed(1);
  const x_fl  = x_ab;

  const s_ab = { T: T_ab, phi: ph_ab, x: x_ab, h: h_ab };
  const s_au = { T: T_au, phi: ph_au, x: x_au, h: h_au };
  const s_zl = { T: T_zl, phi: _phi(T_zl, x_zl), x: x_zl, h: _h(T_zl, x_zl) };
  const s_fl = { T: T_fl, phi: _phi(T_fl, x_fl), x: x_fl, h: _h(T_fl, x_fl) };

  const dQ_zl = +(s_zl.h - s_au.h).toFixed(1);
  const dT_zl = +(T_zl - T_au).toFixed(1);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-s);margin-bottom:var(--gap-s)">
      ${_stateBox('LS3 — Zuluft', s_zl, 'var(--heat-t)', 'Außenluft vorgewärmt')}
      ${_stateBox('LS4 — Fortluft', s_fl, 'var(--cold-t)', 'Abluft abgekühlt')}
    </div>
    <div style="background:var(--blue-t);border:1px solid var(--blue-b);border-radius:var(--r-m);padding:10px 12px">
      <div style="font-family:var(--f);font-size:11px;font-weight:700;color:var(--blue);margin-bottom:4px">Bilanz WRG</div>
      <div style="font-family:var(--fm);font-size:12px;color:var(--t2);line-height:1.7">
        η<sub>t</sub> = ${_fmt(eta*100,0)} %
        &emsp;ΔT<sub>ZL</sub> = +${_fmt(dT_zl,1)} K
        &emsp;Δh<sub>ZL</sub> = +${_fmt(dQ_zl,1)} kJ/kg
      </div>
      <div style="font-size:10px;color:var(--t3);margin-top:4px;font-family:var(--f)">
        Plattenwärmetauscher (sensibel) · kein Feuchtigkeitstransfer
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════
   MISCHLUFT — Massengewichtete Luftmischung
   x_M = (ṁ₁·x₁ + ṁ₂·x₂) / ṁ_M
   h_M = (ṁ₁·h₁ + ṁ₂·h₂) / ṁ_M
   T_M aus h_M, x_M: h = 1.006·T + x/1000·(2501+1.86·T)
══════════════════════════════════════════════════════ */
function calcMix() {
  const T1   = _n(_$('mix-ls1-t')?.value);
  const ph1  = _n(_$('mix-ls1-phi')?.value);
  const vol1 = _n(_$('mix-ls1-vol')?.value);
  const T2   = _n(_$('mix-ls2-t')?.value);
  const ph2  = _n(_$('mix-ls2-phi')?.value);
  const vol2 = _n(_$('mix-ls2-vol')?.value);

  const el = _$('mix-result');
  if (!el) return;

  if ([T1, ph1, vol1, T2, ph2, vol2].some(isNaN)) {
    el.innerHTML = '<p style="color:var(--t3);font-size:12px;text-align:center;padding:12px">Alle Felder ausfüllen →</p>';
    return;
  }

  const x1 = _x(T1, ph1), h1 = _h(T1, x1);
  const x2 = _x(T2, ph2), h2 = _h(T2, x2);

  const rho1 = _rho(T1), rho2 = _rho(T2);
  const m1   = vol1 * rho1;      // kg/h
  const m2   = vol2 * rho2;      // kg/h
  const mM   = m1 + m2;

  const xM = (m1 * x1 + m2 * x2) / mM;
  const hM = (m1 * h1 + m2 * h2) / mM;
  const TM = (hM - xM / 1000 * 2501) / (1.006 + xM / 1000 * 1.86);
  const phM = _phi(TM, xM);
  const rhoM = _rho(TM);
  const volM = mM / rhoM;

  const s1 = { T: T1, phi: ph1, x: x1, h: h1 };
  const s2 = { T: T2, phi: ph2, x: x2, h: h2 };
  const sM = { T: +TM.toFixed(1), phi: phM, x: +xM.toFixed(2), h: +hM.toFixed(1) };

  // Anteile
  const a1 = (m1 / mM * 100).toFixed(0);
  const a2 = (m2 / mM * 100).toFixed(0);

  el.innerHTML = `
    <div style="margin-bottom:var(--gap-s)">
      ${_stateBox('LS3 — Mischluft', sM,
        'var(--grn)',
        `V̇ = ${_fmt(volM,0)} m³/h &nbsp;·&nbsp; ṁ = ${_fmt(mM,0)} kg/h &nbsp;·&nbsp; LS1: ${a1}% / LS2: ${a2}%`)}
    </div>
    <div style="background:var(--grn-t);border:1px solid var(--grn-b);border-radius:var(--r-m);padding:10px 12px">
      <div style="font-family:var(--f);font-size:11px;font-weight:700;color:var(--grn);margin-bottom:4px">Mischungsbilanz</div>
      <div style="font-family:var(--fm);font-size:12px;color:var(--t2);line-height:1.7">
        ṁ₁ = ${_fmt(m1,0)} kg/h &nbsp;+&nbsp; ṁ₂ = ${_fmt(m2,0)} kg/h = ${_fmt(mM,0)} kg/h
      </div>
      <div style="font-size:10px;color:var(--t3);margin-top:4px;font-family:var(--f)">
        Massengewichtete Mischung · V̇<sub>M</sub> ≈ ${_fmt(volM,0)} m³/h
      </div>
    </div>`;
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  ['wrg-ab-t','wrg-ab-phi','wrg-au-t','wrg-au-phi','wrg-eta']
    .forEach(id => _$(id)?.addEventListener('input', calcWRG));
  ['mix-ls1-t','mix-ls1-phi','mix-ls1-vol','mix-ls2-t','mix-ls2-phi','mix-ls2-vol']
    .forEach(id => _$(id)?.addEventListener('input', calcMix));
});
