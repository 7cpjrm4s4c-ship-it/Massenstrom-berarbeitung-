// hx-diagram.js
// Rebuilt h,x diagram core (stable canvas sizing + h-based projection)

(function () {
  const canvas = document.getElementById("hxCanvas");
  if (!canvas) {
    console.warn("hxCanvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  const margin = { top: 24, right: 24, bottom: 32, left: 40 };

  let CW = 0;
  let CH = 0;

  const RANGE = {
    xMin: 0,
    xMax: 20,
    hMin: -10,
    hMax: 120
  };

  function hAir(t, x) {
    // simplified moist air enthalpy approximation
    return 1.006 * t + (x / 1000) * (2501 + 1.86 * t);
  }

  function innerW() {
    return CW - margin.left - margin.right;
  }

  function innerH() {
    return CH - margin.top - margin.bottom;
  }

  function toCvs(x, t) {
    const h = hAir(t, x);

    const px =
      margin.left +
      ((x - RANGE.xMin) / (RANGE.xMax - RANGE.xMin)) * innerW();

    const pyBase =
      margin.top +
      innerH() -
      ((h - RANGE.hMin) / (RANGE.hMax - RANGE.hMin)) * innerH();

    // diagonal skew for Mollier feeling
    const skew =
      ((x - RANGE.xMin) / (RANGE.xMax - RANGE.xMin)) * innerH() * 0.18;

    return [px, pyBase - skew];
  }

  function drawAxes() {
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, CH - margin.bottom);
    ctx.lineTo(CW - margin.right, CH - margin.bottom);
    ctx.stroke();
  }

  function drawDemoProcess() {
    const p1 = toCvs(1.4, -10);
    const p2 = toCvs(1.4, 21);
    const p3 = toCvs(8.3, 22);

    ctx.lineWidth = 2;

    ctx.strokeStyle = "#ff7a3d";
    ctx.beginPath();
    ctx.moveTo(...p1);
    ctx.lineTo(...p2);
    ctx.stroke();

    ctx.strokeStyle = "#a78bfa";
    ctx.beginPath();
    ctx.moveTo(...p2);
    ctx.lineTo(...p3);
    ctx.stroke();
  }

  function redraw() {
    ctx.clearRect(0, 0, CW, CH);
    drawAxes();
    drawDemoProcess();
  }

  function resize() {
    const wrap = canvas.parentElement;
    if (!wrap) return;

    const width = Math.max(320, Math.floor(wrap.clientWidth || 320));
    const height = Math.round(width * 0.78);

    CW = width;
    CH = height;

    wrap.style.height = height + "px";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    redraw();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => {
    setTimeout(resize, 180);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(resize);
  });
})();
