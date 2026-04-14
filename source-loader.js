window.ALL_SOURCES = [
  { key: "sample",        label: "Sample character", file: "sample-data.js",    path: "data/characters/", type: "character" },
  { key: "mage",        label: "Mage", file: "wizard.js",    path: "data/characters/", type: "character" },
  { key: "clerc",        label: "Clerc", file: "cleric.js",    path: "data/characters/", type: "character" },
  { key: "roublard",        label: "Roublard", file: "rogue.js",    path: "data/characters/", type: "character" },
  { key: "guerrier",        label: "Guerrier", file: "fighter.js",    path: "data/characters/", type: "character" },
  { key: "rôdeur",        label: "Rôdeur", file: "ranger.js",    path: "data/characters/", type: "character" },
  { key: "barbare",        label: "Barbare", file: "barbarian.js",    path: "data/characters/", type: "character" },
  { key: "barde",        label: "Barde", file: "bard.js",    path: "data/characters/", type: "character" },
  { key: "dons",          label: "Dons",             file: "dons.js",           path: "data/glossaries/", type: "cards", dataKey: "DONS_DB_DATA" },
  { key: "bottes",        label: "Bottes",           file: "bottes d_armes.js", path: "data/glossaries/", type: "cards", dataKey: "BOTTES_DB_DATA" },
  { key: "spells",        label: "Spells",           file: "spells.js",         path: "data/glossaries/", type: "cards", dataKey: "SPELLS_DB_DATA" },
  { key: "species",  label: "Species",          file: "species.js",   path: "data/glossaries/", type: "cards", dataKey: "SPECIES_DB_DATA" }
];

function initSourceSelector() {
  const select = document.getElementById("source-select");
  if (!select) return;

  select.innerHTML = "";

  window.ALL_SOURCES.forEach(src => {
    const opt = document.createElement("option");
    opt.value = src.key;
    opt.textContent = src.label || src.key;
    select.appendChild(opt);
  });

  select.addEventListener("change", (e) => {
    loadSource(e.target.value);
  });
}

function loadSource(key) {
  const entry = window.ALL_SOURCES.find(s => s.key === key);
  if (!entry) return;

  const existing = document.querySelector(`script[data-source-key="${entry.key}"]`);
  if (existing) {
    if (entry.type === "cards" && window.renderCards) window.renderCards(entry.dataKey);
    if (entry.type === "character" && window.renderAll) window.renderAll();
    return;
  }

  const script = document.createElement("script");
  script.src = entry.path + encodeURIComponent(entry.file);
  script.dataset.sourceKey = entry.key;

  script.onload = () => {
    if (entry.type === "cards" && window.renderCards) {
      window.renderCards(entry.dataKey);
    }

    if (entry.type === "character" && window.renderAll) {
      window.renderAll();
    }
  };

  document.body.appendChild(script);
}