// Curtis's Cabinet of Curiosities
// - Theme launchers and menus per theme
// - Render curiosities from assets/curiosities.json or window.CURIOSITIES
// - Tag filter chips

(function () {
  "use strict";

  const storageKey = "theme-preference";
  const root = document.documentElement;
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const filters = document.getElementById("filters");

  let ALL_ITEMS = [];
  const selectedTags = new Set();

  function getPreferredTheme() {
    const saved = localStorage.getItem(storageKey);
    if (saved === "win98" || saved === "geocities" || saved === "dark") return saved;
    return "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
  }

  function initTheme() {
    // Apply saved or default theme
    applyTheme(getPreferredTheme());
  }

  async function loadCuriosities() {
    try {
      const res = await fetch("assets/curiosities.json", { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {
      // ignore
    }
    return Array.isArray(window.CURIOSITIES) ? window.CURIOSITIES : [];
  }

  function normalizeTag(t) {
    return String(t || "").trim().toLowerCase();
  }

  function collectUniqueTags(items) {
    const map = new Map(); // key(lowercased) -> label(first seen)
    items.forEach((site) => {
      const tags = Array.isArray(site.tags) ? site.tags : [];
      tags.forEach((t) => {
        const label = String(t || "").trim();
        if (!label) return;
        const key = label.toLowerCase();
        if (!map.has(key)) map.set(key, label);
      });
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function createCard(site) {
    const url = String(site.url || "").trim();
    const title = String(site.title || url || "Untitled").trim() || "Untitled";
    const desc = String(site.description || "").trim();
    const author = String(site.author || "").trim();
    const tags = Array.isArray(site.tags) ? site.tags.filter(Boolean).map(String) : [];

    // Allow explicit screenshot override per item
    let imgSrc = null;
    const override = (site.screenshotUrl ? String(site.screenshotUrl).trim() : "");
    if (override) {
      imgSrc = override;
    } else {
      // Build screenshot URL from INSTANT_SITE_DOMAIN (e.g., "cosine" -> "screenshot.cosine.show")
      const domain = (typeof window.INSTANT_SITE_DOMAIN !== "undefined" ? String(window.INSTANT_SITE_DOMAIN) : "").trim().replace(/\/*$/, "");
      if (domain) {
        let host = `screenshot.${domain}`;
        if (!host.endsWith(".show")) host += ".show";
        imgSrc = `https://${host}/?url=${url}`;
      }
    }

    const card = document.createElement("article");
    card.className = "card";

    const imageLink = document.createElement("a");
    imageLink.className = "image";
    imageLink.href = url;
    imageLink.target = "_blank";
    imageLink.rel = "noopener noreferrer";

    if (imgSrc) {
      const img = new Image();
      img.src = imgSrc;
      img.alt = `Preview of ${title}`;
      img.loading = "lazy";
      img.decoding = "async";
      img.onerror = () => {
        // Replace img with a fallback if screenshot fails
        const fallback = document.createElement("div");
        fallback.className = "img-fallback";
        imageLink.replaceChildren(fallback);
      };
      imageLink.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "img-fallback";
      imageLink.appendChild(fallback);
    }

    const content = document.createElement("div");
    content.className = "content";

    const h3 = document.createElement("h3");
    h3.textContent = title;

    // Description: always include, height fixed to two lines via CSS
    const p = document.createElement("p");
    p.className = "desc";
    if (desc) p.textContent = desc;

    // Meta rows: author then tags
    const meta = document.createElement("div");
    meta.className = "meta";
    if (author) {
      const by = document.createElement("span");
      by.className = "byline";
      by.textContent = `by ${author}`;
      meta.appendChild(by);
    }

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tags";
    if (tags.length) {
      tags.forEach((t) => {
        const chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = t;
        tagsWrap.appendChild(chip);
      });
    }

    const visit = document.createElement("a");
    visit.className = "visit";
    visit.href = url;
    visit.target = "_blank";
    visit.rel = "noopener noreferrer";
    visit.textContent = "Visit Site";

    // Assemble in fixed row order
    content.appendChild(h3);
    content.appendChild(p);
    content.appendChild(meta);
    content.appendChild(tagsWrap);
    content.appendChild(visit);

    card.appendChild(imageLink);
    card.appendChild(content);
    return card;
  }

  function renderCuriosities(items) {
    grid.innerHTML = "";
    if (!items || items.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const fragment = document.createDocumentFragment();
    items.forEach((site) => fragment.appendChild(createCard(site)));
    grid.appendChild(fragment);
  }

  function renderFilters(tagsList) {
    if (!filters) return;
    filters.innerHTML = "";
    if (!tagsList || tagsList.length === 0) {
      filters.hidden = true;
      return;
    }
    filters.hidden = false;
    const wrap = document.createElement("div");
    wrap.className = "chips";
    wrap.setAttribute("role", "toolbar");
    wrap.setAttribute("aria-label", "Tag filters");

    // All chip
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "chip";
    allBtn.dataset.key = "all";
    allBtn.textContent = "All";
    allBtn.setAttribute("aria-pressed", "true");
    allBtn.classList.add("is-active");
    wrap.appendChild(allBtn);

    tagsList.forEach(({ key, label }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.key = key;
      btn.textContent = label;
      btn.setAttribute("aria-pressed", "false");
      wrap.appendChild(btn);
    });

    // Event delegation for clicks
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button.chip");
      if (!btn) return;
      const key = btn.dataset.key || "";
      if (key === "all") {
        selectedTags.clear();
      } else {
        const k = String(key);
        if (selectedTags.has(k)) selectedTags.delete(k);
        else selectedTags.add(k);
      }
      updateFilterUI();
      applyFilter();
    });

    filters.appendChild(wrap);
  }

  function updateFilterUI() {
    if (!filters) return;
    const wrap = filters.querySelector(".chips");
    if (!wrap) return;
    const chips = wrap.querySelectorAll("button.chip");
    const isAll = selectedTags.size === 0;
    chips.forEach((btn) => {
      const key = btn.dataset.key || "";
      const active = key === "all" ? isAll : selectedTags.has(key);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function applyFilter() {
    if (selectedTags.size === 0) {
      renderCuriosities(ALL_ITEMS);
      return;
    }
    const filtered = ALL_ITEMS.filter((site) => {
      const tags = Array.isArray(site.tags) ? site.tags : [];
      for (const t of tags) {
        if (selectedTags.has(normalizeTag(t))) return true;
      }
      return false;
    });
    renderCuriosities(filtered);
  }

  // Clicking tags inside cards sets the filter to that tag
  grid.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag");
    if (!chip) return;
    const label = String(chip.textContent || "").trim();
    if (!label) return;
    selectedTags.clear();
    selectedTags.add(normalizeTag(label));
    updateFilterUI();
    applyFilter();
    if (filters) {
      try { filters.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (_) {}
    }
  });

  // Theme launcher menus
  const themeMenuBtn = document.getElementById("themeMenuBtn");
  const themeMenu = document.getElementById("themeMenu");
  const winStartBtn = document.getElementById("winStartBtn");
  const winStartMenu = document.getElementById("winStartMenu");
  const geoThemeBtn = document.getElementById("geoThemeBtn");
  const geoThemeMenu = document.getElementById("geoThemeMenu");

  function hideAllMenus() {
    [themeMenu, winStartMenu, geoThemeMenu].forEach((m) => {
      if (m) m.hidden = true;
    });
  }

  function attachThemeClicks(menuEl) {
    if (!menuEl) return;
    menuEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-theme]");
      if (!btn) return;
      const t = btn.getAttribute("data-theme");
      if (!t) return;
      applyTheme(t);
      try { localStorage.setItem(storageKey, t); } catch (_) {}
      hideAllMenus();
    });
  }

  function bindMenu(toggleBtn, menuEl, position = "default") {
    if (!toggleBtn || !menuEl) return;
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasHidden = menuEl.hidden;
      hideAllMenus();
      if (wasHidden) {
        // Optionally position menu relative to button for some launchers
        if (position === "relative") {
          const rect = toggleBtn.getBoundingClientRect();
          menuEl.style.left = `${rect.left}px`;
          menuEl.style.top = `${rect.bottom + 6}px`;
        }
        menuEl.hidden = false;
      }
    });
  }

  // Global close handlers
  document.addEventListener("click", () => hideAllMenus());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideAllMenus();
  });

  // Wire menus
  attachThemeClicks(themeMenu);
  attachThemeClicks(winStartMenu);
  attachThemeClicks(geoThemeMenu);

  bindMenu(themeMenuBtn, themeMenu, "relative");
  bindMenu(winStartBtn, winStartMenu); // fixed CSS positions the menu above (upwards)
  bindMenu(geoThemeBtn, geoThemeMenu, "relative");

  // Initialize
  initTheme();
  loadCuriosities().then((items) => {
    ALL_ITEMS = Array.isArray(items) ? items : [];
    renderCuriosities(ALL_ITEMS);
    const tagsList = collectUniqueTags(ALL_ITEMS);
    renderFilters(tagsList);
    updateFilterUI();
  });
})();