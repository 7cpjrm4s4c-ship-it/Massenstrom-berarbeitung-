// air-treatment.js
// Stable card selection without inline style mutations

(function () {
  const container = document.getElementById("airTreatmentList");
  if (!container) {
    console.warn("airTreatmentList not found");
    return;
  }

  function clearSelection() {
    container.querySelectorAll(".hx-option-card.selected").forEach(el => {
      el.classList.remove("selected");
    });
  }

  function selectCard(card) {
    clearSelection();
    card.classList.add("selected");

    const result = document.getElementById("processResult");
    if (result) {
      const title = card.dataset.title || card.querySelector("h3")?.textContent || "Auswahl";
      result.textContent = "Ermittelte Prozesskette: " + title;
    }
  }

  container.querySelectorAll(".hx-option-card").forEach(card => {
    card.addEventListener("click", () => selectCard(card));
  });
})();
