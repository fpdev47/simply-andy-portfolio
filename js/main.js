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

  function applyFilter(filter) {
    document.querySelectorAll(".video-card").forEach((card) => {
      card.classList.toggle("is-hidden", filter !== "all" && card.dataset.cat !== filter);
    });
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
