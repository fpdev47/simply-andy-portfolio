(function () {
  const LANGS = ["en", "es"];
  // The inline <head> script resolves saved/browser language before first paint.
  const state = { lang: LANGS.includes(document.documentElement.lang) ? document.documentElement.lang : "en" };

  const nav = document.getElementById("main-nav");
  const burger = document.getElementById("nav-burger");

  function saveLang(lang) {
    try {
      localStorage.setItem("sa-lang", lang);
    } catch (e) {
      /* storage unavailable (private mode / blocked cookies) — language just won't persist */
    }
  }

  // Filter with a FLIP reorder animation: staying cards glide to their new grid
  // position, entering cards fade/scale in, leaving cards fade out in place.
  const grid = document.getElementById("portfolio-grid");
  const FLIP_MS = 380;
  let flipTimer = null;
  let flipFinalize = null;

  function shouldHide(card, filter) {
    return filter !== "all" && card.dataset.cat !== filter;
  }

  function applyFilter(filter) {
    const cards = Array.from(grid.querySelectorAll(".video-card"));
    if (flipFinalize) flipFinalize();

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      cards.forEach((card) => card.classList.toggle("is-hidden", shouldHide(card, filter)));
      return;
    }

    const firstRects = new Map();
    cards.forEach((card) => {
      if (!card.classList.contains("is-hidden")) firstRects.set(card, card.getBoundingClientRect());
    });
    const gridRect = grid.getBoundingClientRect();

    const staying = [];
    const entering = [];
    const leaving = [];
    cards.forEach((card) => {
      const wasVisible = firstRects.has(card);
      const hide = shouldHide(card, filter);
      if (wasVisible && !hide) staying.push(card);
      else if (!wasVisible && !hide) entering.push(card);
      else if (wasVisible && hide) leaving.push(card);
    });

    // Take leaving cards out of the flow at their current spot so the rest reflows.
    leaving.forEach((card) => {
      const r = firstRects.get(card);
      card.style.position = "absolute";
      card.style.left = r.left - gridRect.left + "px";
      card.style.top = r.top - gridRect.top + "px";
      card.style.width = r.width + "px";
      card.style.height = r.height + "px";
      card.style.transition = "none";
    });
    entering.forEach((card) => card.classList.remove("is-hidden"));

    // Invert: freeze staying cards at their old position, entering cards at their start state.
    const moves = staying
      .map((card) => {
        const f = firstRects.get(card);
        const l = card.getBoundingClientRect();
        return { card, dx: f.left - l.left, dy: f.top - l.top };
      })
      .filter((m) => m.dx || m.dy);
    moves.forEach((m) => {
      m.card.style.transition = "none";
      m.card.style.transform = "translate(" + m.dx + "px, " + m.dy + "px)";
    });
    entering.forEach((card) => {
      card.style.transition = "none";
      card.style.opacity = "0";
      card.style.transform = "scale(0.92)";
    });

    void grid.offsetWidth;

    // Play.
    const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
    moves.forEach((m) => {
      m.card.style.transition = "transform " + FLIP_MS + "ms " + ease;
      m.card.style.transform = "";
    });
    entering.forEach((card) => {
      card.style.transition = "opacity " + FLIP_MS + "ms ease, transform " + FLIP_MS + "ms " + ease;
      card.style.opacity = "";
      card.style.transform = "";
    });
    leaving.forEach((card) => {
      card.style.transition = "opacity 230ms ease, transform 230ms ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";
    });

    flipFinalize = function () {
      clearTimeout(flipTimer);
      flipTimer = null;
      flipFinalize = null;
      cards.forEach((card) => {
        card.style.position = "";
        card.style.left = "";
        card.style.top = "";
        card.style.width = "";
        card.style.height = "";
        card.style.opacity = "";
        card.style.transform = "";
        card.style.transition = "";
        card.classList.toggle("is-hidden", shouldHide(card, filter));
      });
    };
    flipTimer = setTimeout(flipFinalize, FLIP_MS + 60);
  }

  function initFilters() {
    const bar = document.getElementById("filter-bar");
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      applyFilter(btn.dataset.filter);
    });
  }

  function syncBurger() {
    const open = nav.classList.contains("is-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", I18N[state.lang][open ? "a11y.closeMenu" : "a11y.openMenu"]);
  }

  function closeNav() {
    nav.classList.remove("is-open");
    syncBurger();
  }

  function initNav() {
    burger.addEventListener("click", () => {
      nav.classList.toggle("is-open");
      syncBurger();
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        burger.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !e.target.closest(".site-header")) closeNav();
    });
  }

  function applyLang(lang) {
    state.lang = lang;
    saveLang(lang);
    document.documentElement.lang = lang;

    document.title = I18N[lang]["meta.title"];
    document.querySelector('meta[name="description"]').setAttribute("content", I18N[lang]["meta.description"]);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = I18N[lang][el.getAttribute("data-i18n")];
      if (value) el.textContent = value;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const [attr, key] = el.getAttribute("data-i18n-attr").split(":");
      const value = I18N[lang][key];
      if (value) el.setAttribute(attr, value);
    });

    document.querySelectorAll(".lang-opt").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.lang === lang);
    });
    document.getElementById("lang-toggle").classList.toggle("is-es", lang === "es");

    syncBurger();
  }

  function initLangToggle() {
    document.getElementById("lang-toggle").addEventListener("click", () => {
      applyLang(state.lang === "es" ? "en" : "es");
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  initFilters();
  initNav();
  initLangToggle();
  applyLang(state.lang);
})();
