// pdf-export.js
// Clean A4 export (dedicated export node)

(function () {
  const exportBtn = document.getElementById("pdfExportBtn");
  if (!exportBtn) {
    console.warn("pdfExportBtn not found");
    return;
  }

  async function exportPDF() {
    if (!window.jspdf || !window.html2canvas) {
      alert("PDF libraries fehlen");
      return;
    }

    const { jsPDF } = window.jspdf;

    const source = document.getElementById("pdfExportRoot") || document.body;

    const clone = source.cloneNode(true);
    clone.style.width = "794px"; // A4 portrait reference
    clone.style.background = "#111";
    clone.style.padding = "24px";

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-99999px";
    wrapper.style.top = "0";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#111",
      useCORS: true
    });

    document.body.removeChild(wrapper);

    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;
    const pageHeight = 297;

    pdf.addImage(img, "PNG", 0, 0, pageWidth, pageHeight);
    pdf.save("massenstrom-a4.pdf");
  }

  exportBtn.addEventListener("click", exportPDF);
})();
