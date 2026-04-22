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
    /*
    T = Temperatur in °C
    phi = relative Feuchte in %
    Rückgabe:
    x = Feuchtegehalt in g/kg
    */

    if (
        T === undefined ||
        phi === undefined ||
        isNaN(T) ||
        isNaN(phi)
    ) {
        return 0;
    }

    // Sättigungsdampfdruck (Magnus Formel)
    const pws =
        6.112 * Math.exp(
            (17.62 * T) / (243.12 + T)
        );

    // Partialdruck Wasserdampf
    const pw = (phi / 100) * pws;

    // Luftdruck Standard
    const p = 1013.25;

    // Feuchtegehalt kg/kg
    const x =
        0.622 * pw / (p - pw);

    // → g/kg
    return +(x * 1000).toFixed(2);
}

// ===== SET STATE =====
function setHxState() {
  console.log("BUTTON CLICK WORKS");
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

    drawHxChart(state);
}

// ===== EVENT BINDING =====
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("hx-set");

  if (!btn) {
    console.warn("hx-set button not found");
    return;
  }

  btn.addEventListener("click", setHxState);

  drawHxChart(null);
});

function drawHxChart(state) {
    const canvas = document.getElementById("hxCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width;
    canvas.height = height;

    drawBackground(ctx, width, height);
    drawGrid(ctx, width, height);
    drawSaturationCurve(ctx, width, height);
    drawHumidityCurves(ctx, width, height);
    drawAxes(ctx, width, height);

    if (state) {
        drawStatePoint(ctx, width, height, state);
    }
}

function drawBackground(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#050814";
    ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, width, height) {
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawSaturationCurve(ctx, width, height) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(120,160,255,0.9)";
    ctx.lineWidth = 2.5;

    let first = true;

    for (let T = -10; T <= 50; T += 1) {
        const xSat = calcHumidityRatio(T, 100);
        const hSat = calcEnthalpy(T, xSat);

        const px = (xSat / 30) * width;
        const py = height - (hSat / 70) * height;

        if (first) {
            ctx.moveTo(px, py);
            first = false;
        } else {
            ctx.lineTo(px, py);
        }
    }

    ctx.stroke();
}

function drawHumidityCurves(ctx, width, height) {
    const humidityLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90];

    humidityLevels.forEach(phi => {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;

        let first = true;

        for (let T = -10; T <= 50; T += 1) {
            const x = calcHumidityRatio(T, phi);
            const h = calcEnthalpy(T, x);

            const px = (x / 30) * width;
            const py = height - (h / 70) * height;

            if (first) {
                ctx.moveTo(px, py);
                first = false;
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.stroke();
    });
}

function drawAxes(ctx, width, height) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px sans-serif";

    ctx.fillText("x [g/kg]", width - 70, height - 10);
    ctx.fillText("h [kJ/kg]", 10, 20);
}

function drawStatePoint(ctx, width, height, state) {
    if (!state || state.x === undefined) return;

    const x = state.x;
    const h = calcEnthalpy(state.T, state.x);

    const px = (x / 30) * width;
    const py = height - (h / 70) * height;

    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);

    ctx.fillStyle = "#6d63ff";
    ctx.shadowColor = "#6d63ff";
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px sans-serif";

    ctx.fillText(`x=${x} g/kg`, px + 12, py - 10);
    ctx.fillText(`h=${h.toFixed(1)} kJ/kg`, px + 12, py + 10);
}

function drawTemperatureLines(ctx, width, height) {
    const temperatures = [-20, -10, 0, 10, 20, 30, 40, 50];

    temperatures.forEach(T => {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1;

        let first = true;

        // von sehr trockener Luft bis zur Sättigung
        for (let phi = 5; phi <= 100; phi += 2) {
            const x = calcHumidityRatio(T, phi);
            const h = calcEnthalpy(T, x);

            // Sicherheitsprüfung gegen ungültige Werte
            if (isNaN(x) || isNaN(h)) continue;

            const px = (x / 30) * width;
            const py = height - (h / 70) * height;

            if (first) {
                ctx.moveTo(px, py);
                first = false;
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.stroke();

// Temperatur-Label sichtbar im Diagramm platzieren
const xLabel = calcHumidityRatio(T, 60);
const hLabel = calcEnthalpy(T, xLabel);

if (!isNaN(xLabel) && !isNaN(hLabel)) {
    const pxLabel = (xLabel / 30) * width;
    const pyLabel = height - (hLabel / 70) * height;

    if (pxLabel > 20 && pxLabel < width - 40 &&
        pyLabel > 20 && pyLabel < height - 20) {

        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "12px sans-serif";

        ctx.fillText(
            `${T}°C`,
            pxLabel + 8,
            pyLabel - 8
        );
    }

