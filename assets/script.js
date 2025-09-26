// Curtis's Cabinet of Curiosities
// - Dark/Light theme toggle
// - Render curiosities from assets/curiosities.json or window.CURIOSITIES

(function () {
  "use strict";

  const storageKey = "theme-preference";
  const root = document.documentElement;
  const toggleBtn = document.getElementById("themeToggle");
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");

  function getPreferredTheme() {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
  }

  function initTheme() {
    applyTheme(getPreferredTheme());
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem(storageKey, next);
      });
    }
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
      const domain = (typeof window.INSTANT_SITE_DOMAIN !== "undefined" ? String(window.INSTANT_SITE_DOMAIN) : "").trim().replace(/\/+$/, "");
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

    const p = document.createElement("p");
    p.className = "desc";
    if (desc) p.textContent = desc;

    // Meta: author and tags
    const meta = document.createElement("div");
    meta.className = "meta";

    if (author) {
      const by = document.createElement("span");
      by.className = "byline";
      by.textContent = `by ${author}`;
      meta.appendChild(by);
    }

    if (tags.length) {
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "tags";
      tags.forEach((t) => {
        const chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = t;
        tagsWrap.appendChild(chip);
      });
      meta.appendChild(tagsWrap);
    }

    const visit = document.createElement("a");
    visit.className = "visit";
    visit.href = url;
    visit.target = "_blank";
    visit.rel = "noopener noreferrer";
    visit.textContent = "Visit";

    content.appendChild(h3);
    if (desc) content.appendChild(p);
    if (author || tags.length) content.appendChild(meta);
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

  // Initialize
  initTheme();
  loadCuriosities().then(renderCuriosities);
})();