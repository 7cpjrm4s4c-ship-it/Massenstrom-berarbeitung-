// ===== SAFE NUMBER PARSER =====
function num(v) {
  if (v === null || v === undefined) return NaN;

  const n = parseFloat(
    String(v)
      .replace(/−|–|--/g, "-")
      .replace(",", ".")
      .trim()
  );

  return isNaN(n) ? NaN : n;
}

function calcEnthalpy(T, x) {
    /*
    T = Temperatur in °C
    x = Feuchtegehalt in g/kg
    Rückgabe:
    h = Enthalpie in kJ/kg
    */

    if (
        T === undefined ||
        x === undefined ||
        isNaN(T) ||
        isNaN(x)
    ) {
        return 0;
    }

    // x von g/kg → kg/kg
    const xkg = x / 1000;

    // Standard-Näherung nach Mollier
    return 1.006 * T + xkg * (2501 + 1.86 * T);
}

// ===== GLOBAL STATE =====
let currentState = null;

function calcHumidityRatio(T, phi) {
    // Sättigungsdampfdruck nach Magnus-Formel
    const pws = 610.94 * Math.exp((17.625 * T) / (T + 243.04));

    // relativer Dampfdruck
    const pw = (phi / 100) * pws;

    // Standard-Luftdruck [Pa]
    const p = 101325;

    // Feuchtegehalt x [kg/kg]
    const x = 0.622 * pw / (p - pw);

    // Rückgabe in g/kg
    return +(x * 1000).toFixed(2);
}

// ===== SET STATE =====
function setHxState() {
  const tInput = document.getElementById("hx-temp");
  const rhInput = document.getElementById("hx-rh");
  const xInput = document.getElementById("hx-x");

const T = tInput?.value.trim() === ""
    ? NaN
    : Number(tInput.value);

const phi = rhInput?.value.trim() === ""
    ? NaN
    : Number(rhInput.value);

const x = xInput?.value.trim() === ""
    ? NaN
    : Number(xInput.value);

console.log("tInput:", tInput);
console.log("rhInput:", rhInput);
console.log("xInput:", xInput);

console.log("t raw:", tInput?.value);
console.log("phi raw:", rhInput?.value);
console.log("x raw:", xInput?.value);

console.log("T parsed:", T);
console.log("phi parsed:", phi);
console.log("x parsed:", x);

  // MODE: T + φ oder T + x
  let state = {};

  if (!isNaN(T) && !isNaN(phi)) {

   const xCalc = calcHumidityRatio(T, phi);

   state = {
      T,
      phi,
      x: xCalc,
      mode: "T_phi"
   };

} else if (!isNaN(T) && !isNaN(x)) {

   state = {
      T,
      x,
      mode: "T_x"
   };

} else {
   console.warn("Ungültiger Zustand");
   return;
}

  currentState = state;

  console.log("STATE SET:", state);

  renderHxState(state);
}

function renderHxState(state) {
    if (!state) return;

    document.getElementById("state-temp").textContent =
        `${state.T ?? "--"} °C`;

    document.getElementById("state-rh").textContent =
        `${state.phi ?? "--"} %`;

    document.getElementById("state-x").textContent =
        `${state.x ?? "--"} g/kg`;

    let h = "--";

    if (
        state.T !== undefined &&
        state.x !== undefined &&
        !isNaN(state.T) &&
        !isNaN(state.x)
    ) {
        h = calcEnthalpy(state.T, state.x).toFixed(1);
    }

    document.getElementById("state-h").textContent =
        `${h} kJ/kg`;
  
drawHxPoint(state);
}

// ===== EVENT BINDING =====
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("hx-set");

  if (!btn) {
    console.warn("hx-set button not found");
    return;
  }

  btn.addEventListener("click", setHxState);
});

function drawHxPoint(state) {
    const canvas = document.getElementById("hxCanvas");
    if (!canvas || !state) return;

    const ctx = canvas.getContext("2d");

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width;
    canvas.height = height;

    // Reset
    ctx.clearRect(0, 0, width, height);

    // Hintergrund
    ctx.fillStyle = "#050814";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }

    for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    // Wertebereich grob:
    // x: 0–30 g/kg
    // h: 0–100 kJ/kg

    const x = state.x || 0;
    const h = calcEnthalpy(state.T, state.x);

    const px = (x / 30) * width;
    const py = height - (h / 100) * height;

    // Punkt zeichnen
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#6d63ff";
    ctx.shadowColor = "#6d63ff";
    ctx.shadowBlur = 20;
    ctx.fill();

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px sans-serif";
    ctx.fillText(`x=${x} g/kg`, px + 12, py - 10);
    ctx.fillText(`h=${h.toFixed(1)} kJ/kg`, px + 12, py + 10);
}
