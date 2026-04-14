(function () {
  var PER_PAGE = 9;

  function getLoadedDataset(dataKey) {
    if (dataKey && window[dataKey]) {
      var source = window.ALL_SOURCES
        ? window.ALL_SOURCES.find(function (s) { return s.dataKey === dataKey; })
        : null;
      return {
        sourceKey: dataKey,
        label: source ? source.label : dataKey,
        raw: window[dataKey]
      };
    }

    var sources = [
      { key: "DONS_DB_DATA", label: "Dons" },
      { key: "BOTTES_DB_DATA", label: "Bottes" },
      { key: "SPELLS_DB_DATA", label: "Spells" },
      { key: "SPECIES_DB_DATA", label: "Species" }
    ];

    for (var i = 0; i < sources.length; i += 1) {
      if (window[sources[i].key]) {
        return {
          sourceKey: sources[i].key,
          label: sources[i].label,
          raw: window[sources[i].key]
        };
      }
    }
    return null;
  }

  function toArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.entries)) return raw.entries;

    if (typeof raw === "object") {
      return Object.entries(raw)
        .filter(function (entry) { return !/^meta|_/.test(entry[0]); })
        .map(function (entry) {
          var key = entry[0];
          var value = entry[1];
          if (value && typeof value === "object" && !Array.isArray(value)) {
            return Object.assign({ __key: key }, value);
          }
          return { __key: key, value: value };
        });
    }

    return [];
  }

  function splitLines(text) {
    return String(text)
      .split(/\n|[•·▪◦]/g)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function textParts(value) {
    if (value == null) return [];

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return splitLines(value);
    }

    if (Array.isArray(value)) {
      return value.flatMap(textParts);
    }

    if (typeof value === "object") {
      var preferred = [
        "text", "description", "desc", "summary", "effect", "effects",
        "traits", "trait", "entries", "details", "content", "feature",
        "features", "benefit", "benefits", "rule", "rules", "value", "notes"
      ];

      var parts = [];
      preferred.forEach(function (key) {
        if (key in value) parts = parts.concat(textParts(value[key]));
      });

      if (parts.length) return parts;

      return Object.entries(value)
        .filter(function (entry) {
          return !/^(id|slug|key|name|name_fr|title|title_fr|kind|type|category|first_feature|second_feature)$/i.test(entry[0]);
        })
        .flatMap(function (entry) { return textParts(entry[1]); });
    }

    return [];
  }

  function uniq(lines) {
    var seen = new Set();
    return lines.filter(function (line) {
      var normalized = line.replace(/\s+/g, " ").trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  function collectMeta(item) {
    var entries = [
      ["Type", item.type || item.kind || item.category],
      ["École", item.school],
      ["Niveau", item.level],
      ["Taille", item.size],
      ["Vitesse", item.speed],
      ["Portée", item.range],
      ["Durée", item.duration],
      ["Incantation", item.casting_time],
      ["Prérequis", item.prerequisite],
      ["Rareté", item.rarity],
      ["Source", item.source]
    ];

    return entries
      .filter(function (entry) {
        return entry[1] !== undefined && entry[1] !== null && entry[1] !== "";
      })
      .map(function (entry) {
        return entry[0] + " : " + entry[1];
      })
      .slice(0, 4);
  }

  function collectTraits(item) {
    var candidates = [];

    if (item.first_feature || item.second_feature) {
      if (item.first_feature) {
        candidates.push({
          title: "",
          text: item.first_feature
        });
      }

      if (item.second_feature) {
        candidates.push({
          title: "",
          text: item.second_feature
        });
      }

      return candidates
        .map(function (trait) {
          return {
            title: String(trait.title || "").trim(),
            text: String(trait.text || "").replace(/\s+/g, " ").trim()
          };
        })
        .filter(function (trait) { return trait.title || trait.text; })
        .slice(0, 6);
    }

    if (Array.isArray(item.traits)) {
      item.traits.forEach(function (trait) {
        if (typeof trait === "string") {
          candidates.push({ title: "", text: trait });
        } else if (trait && typeof trait === "object") {
          candidates.push({
            title: trait.name || trait.title || "",
            text: textParts(trait).join(" ")
          });
        }
      });
    }

    if (Array.isArray(item.entries)) {
      item.entries.forEach(function (entry) {
        if (typeof entry === "string") {
          candidates.push({ title: "", text: entry });
        } else if (entry && typeof entry === "object") {
          candidates.push({
            title: entry.name || entry.title || "",
            text: textParts(entry).join(" ")
          });
        }
      });
    }

    if (!candidates.length && item.description) {
      splitLines(item.description).slice(0, 6).forEach(function (line) {
        candidates.push({ title: "", text: line });
      });
    }

    if (!candidates.length) {
      uniq(textParts(item)).slice(0, 7).forEach(function (line) {
        candidates.push({ title: "", text: line });
      });
    }

    return candidates
      .map(function (trait) {
        return {
          title: String(trait.title || "").trim(),
          text: String(trait.text || "").replace(/\s+/g, " ").trim()
        };
      })
      .filter(function (trait) { return trait.title || trait.text; })
      .slice(0, 6);
  }

  function normalizeItem(item) {
    return {
      name:
        item.name_fr ||
        item.name ||
        item.title_fr ||
        item.title ||
        item.label ||
        item.__key ||
        "Sans nom",
      meta: collectMeta(item),
      traits: collectTraits(item),
      raw: item
    };
  }

  function create(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function splitParagraphs(text, maxSegments) {
    var cleaned = String(text || "").trim();
    if (!cleaned) return [];

    var parts = cleaned
      .split(/(?<=[.!?;:])\s+|\s+-\s+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);

    return parts.slice(0, maxSegments || 3);
  }

  function renderTrait(trait) {
    var row = create("section", "card-trait");

    if (trait.title) {
      row.appendChild(create("strong", "", trait.title));
    }

    var chunks = splitParagraphs(trait.text, 3);

    if (!chunks.length) {
      row.appendChild(create("span", "", "—"));
      return row;
    }

    row.appendChild(create("span", "", chunks[0]));

    for (var i = 1; i < chunks.length; i += 1) {
      row.appendChild(create("p", "", chunks[i]));
    }

    return row;
  }

  function renderCard(item, index, total, label) {
    var card = create("article", "generated-card");

    var head = create("div", "card-head");
    head.appendChild(create("div", "card-title-band", item.name));
    card.appendChild(head);

    if (item.meta.length) {
      var meta = create("div", "card-meta");
      item.meta.forEach(function (line) {
        meta.appendChild(create("span", "", line));
      });
      card.appendChild(meta);
    }

    var traits = create("div", "card-traits");

    if (item.traits.length) {
      item.traits.slice(0, 5).forEach(function (trait) {
        traits.appendChild(renderTrait(trait));
      });
    } else {
      var empty = create("section", "card-trait");
      empty.appendChild(create("span", "", "Aucun contenu"));
      traits.appendChild(empty);
    }

    card.appendChild(traits);

    var footer = create("div", "card-footer");
    footer.appendChild(create("span", "card-source-label", label || "Source"));
    footer.appendChild(create("span", "card-index", String(index + 1) + " / " + String(total)));
    card.appendChild(footer);

    return card;
  }

  function clearExtraPages() {
    var host = document.getElementById("cards-pages-host");
    if (!host) return;

    var pages = host.querySelectorAll(".cards-page");
    pages.forEach(function (page, idx) {
      if (idx > 0) page.remove();
    });
  }

  function buildPage(pageIndex) {
    if (pageIndex === 0) {
      return document.querySelector(".cards-page");
    }

    var tpl = document.getElementById("cards-page-template");
    var host = document.getElementById("cards-pages-host");
    var node = tpl.content.firstElementChild.cloneNode(true);
    var label = node.querySelector(".page-label");

    if (label) {
      label.textContent = "Cartes · page " + String(pageIndex + 1);
    }

    host.appendChild(node);
    return node;
  }

  function renderCards(dataKey) {
    clearExtraPages();

    var status = document.getElementById("cards-status");
    var dataset = getLoadedDataset(dataKey);
    var firstGrid = document.querySelector(".cards-grid-page");

    if (!firstGrid) return;

    if (!dataset) {
      firstGrid.innerHTML = '<div class="cards-empty">Aucune donnée chargée.</div>';
      if (status) status.textContent = "";
      return;
    }

    var items = toArray(dataset.raw).map(normalizeItem);

    if (!items.length) {
      firstGrid.innerHTML = '<div class="cards-empty">Source chargée mais vide.</div>';
      if (status) status.textContent = dataset.label + " · 0 carte";
      return;
    }

    var pageCount = Math.ceil(items.length / PER_PAGE);

    for (var pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      var page = buildPage(pageIndex);
      var grid = page.querySelector(".cards-grid-page") || page.querySelector(".cards-grid");
      var localStatus = page.querySelector(".page-status");

      if (grid) grid.innerHTML = "";

      var slice = items.slice(pageIndex * PER_PAGE, (pageIndex + 1) * PER_PAGE);

      slice.forEach(function (item, localIndex) {
        grid.appendChild(
          renderCard(item, pageIndex * PER_PAGE + localIndex, items.length, dataset.label)
        );
      });

      var pageText =
        dataset.label +
        " · " +
        items.length +
        " carte" +
        (items.length > 1 ? "s" : "") +
        " · page " +
        String(pageIndex + 1) +
        "/" +
        String(pageCount);

      if (pageIndex === 0 && status) status.textContent = pageText;
      if (localStatus) localStatus.textContent = pageText;
    }
  }

  function loadAndRenderFromSelect(rawValue) {
    var normalized = String(rawValue || "").trim();

    if (!normalized) {
      renderCards();
      return;
    }

    var entry = window.ALL_SOURCES
      ? window.ALL_SOURCES.find(function (s) {
          return s.key === normalized || s.value === normalized || s.dataKey === normalized;
        })
      : null;

    var sourceValue = entry ? (entry.key || entry.value || normalized) : normalized;
    var dataKey = entry ? entry.dataKey : null;

    if (typeof window.loadSource === "function") {
      window.loadSource(sourceValue);

      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (getLoadedDataset(dataKey) || tries > 30) {
          clearInterval(timer);
          renderCards(dataKey);
        }
      }, 120);
    } else {
      renderCards(dataKey);
    }
  }

  function bindToolbar() {
    var toggleColor = document.getElementById("toggle-color");
    var toggleCuts = document.getElementById("toggle-cutmarks");
    var toggleCompact = document.getElementById("toggle-compact");
    var resetBtn = document.getElementById("reset-view");
    var select = document.getElementById("source-select");

    if (toggleColor) {
      toggleColor.addEventListener("change", function () {
        document.body.classList.toggle("theme-color", !!toggleColor.checked);
      });
    }

    if (toggleCuts) {
      toggleCuts.addEventListener("change", function () {
        document.body.classList.toggle("hide-cuts", !toggleCuts.checked);
      });
    }

    if (toggleCompact) {
      toggleCompact.addEventListener("change", function () {
        document.body.classList.toggle("compact-cards", !!toggleCompact.checked);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        document.body.classList.add("theme-color");
        document.body.classList.remove("hide-cuts", "compact-cards");

        if (toggleColor) toggleColor.checked = true;
        if (toggleCuts) toggleCuts.checked = true;
        if (toggleCompact) toggleCompact.checked = false;
      });
    }

    if (select) {
      select.addEventListener("change", function () {
        loadAndRenderFromSelect(this.value);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindToolbar();
    renderCards();
  });

  window.renderCards = renderCards;
})();