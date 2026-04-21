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

// ===== GLOBAL STATE =====
let currentState = null;

// ===== SET STATE =====
function setHxState() {
  const tInput = document.getElementById("hx-temp");
  const rhInput = document.getElementById("hx-rh");
  const xInput = document.getElementById("hx-x");

  const T = num(tInput?.value);
  const phi = num(rhInput?.value);
  const x = num(xInput?.value);

  // MODE: T + φ oder T + x
  let state = {};

  if (!isNaN(T) && !isNaN(phi)) {
    state = { T, phi, mode: "T_phi" };
  } else if (!isNaN(T) && !isNaN(x)) {
    state = { T, x, mode: "T_x" };
  } else {
    console.warn("Ungültiger Zustand");
    return;
  }

  currentState = state;

  console.log("STATE SET:", state);

  renderHxState(state);
}

// ===== BASIC RENDER =====
function renderHxState(state) {
  const out = document.getElementById("hx-debug");

  if (!out) return;

  out.innerText = `
T: ${state.T ?? "-"}
φ: ${state.phi ?? "-"}
x: ${state.x ?? "-"}
Mode: ${state.mode}
  `;
}

const btnX = document.getElementById("mode-x");
const btnRH = document.getElementById("mode-rh");
const wrapX = document.getElementById("wrap-x");
const wrapRH = document.getElementById("wrap-rh");

function setMode(mode) {
  if (mode === "x") {
    btnX.classList.add("active");
    btnRH.classList.remove("active");
    wrapX.style.display = "block";
    wrapRH.style.display = "none";
  } else {
    btnRH.classList.add("active");
    btnX.classList.remove("active");
    wrapRH.style.display = "block";
    wrapX.style.display = "none";
  }
}

btnX.onclick = () => setMode("x");
btnRH.onclick = () => setMode("rh");

/* Startmodus */
setMode("x");

// ===== EVENT BINDING =====
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("hx-set");

  if (!btn) {
    console.warn("hx-set button not found");
    return;
  }

  btn.addEventListener("click", setHxState);
});
