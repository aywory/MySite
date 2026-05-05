(() => {
  const titleElement = document.getElementById("hero-title");
  if (!titleElement) {
    return;
  }

  const sourceText = (titleElement.dataset.heroText || titleElement.textContent || "").trim();
  titleElement.textContent = "";
  titleElement.setAttribute("aria-label", sourceText);

  const letters = Array.from(sourceText);
  letters.forEach((symbol, index) => {
    const symbolNode = document.createElement("span");

    if (symbol === " ") {
      symbolNode.className = "hero-char hero-space";
      symbolNode.textContent = "\u00A0";
      symbolNode.dataset.char = "\u00A0";
    } else {
      symbolNode.className = "hero-char";
      symbolNode.textContent = symbol;
      symbolNode.dataset.char = symbol;
    }

    symbolNode.style.setProperty("--hero-char-index", String(index));
    titleElement.appendChild(symbolNode);
  });
})();
