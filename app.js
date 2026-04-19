// app.js
// Central bootstrap + stable initialization

(function () {
  function safeInit() {
    document.documentElement.classList.add("app-ready");

    const tabs = document.querySelectorAll("[data-tab-target]");
    const panels = document.querySelectorAll("[data-tab-panel]");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tabTarget;

        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.hidden = true);

        tab.classList.add("active");

        const panel = document.querySelector(`[data-tab-panel="${target}"]`);
        if (panel) {
          panel.hidden = false;

          if (target === "hx") {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.dispatchEvent(new Event("resize"));
              });
            });
          }
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }
})();
