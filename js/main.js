(function () {
  const PILLARS = ["lifestyle", "wellness", "beauty", "tech", "foodie"];
  const grid = document.getElementById("portfolio-grid");
  const state = { lang: localStorage.getItem("sa-lang") || "en" };

  const playIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

  function buildPortfolioCards() {
    grid.innerHTML = "";
    PILLARS.forEach((pillar) => {
      for (let i = 0; i < 2; i++) {
        const card = document.createElement("div");
        card.className = "video-card";
        card.dataset.cat = pillar;
        card.innerHTML = `
          <div class="video-card-fill">
            <span class="video-badge" data-pillar-label="${pillar}"></span>
            <span class="play-icon">${playIconSVG}</span>
            <span class="pending-badge" data-i18n="portfolio.soon"></span>
          </div>
          <span class="caption-bar"></span>`;
        grid.appendChild(card);
      }
    });
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
      bar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      applyFilter(btn.dataset.filter);
    });
  }

  function initNav() {
    const burger = document.getElementById("nav-burger");
    const nav = document.getElementById("main-nav");
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  function applyLang(lang) {
    state.lang = lang;
    localStorage.setItem("sa-lang", lang);
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = I18N[lang][key];
      if (value) el.textContent = value;
    });

    document.querySelectorAll("[data-pillar-label]").forEach((el) => {
      const pillar = el.getAttribute("data-pillar-label");
      el.textContent = PILLAR_LABELS[lang][pillar];
    });

    document.querySelectorAll(".lang-opt").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.lang === lang);
    });

    document.getElementById("lang-toggle").classList.toggle("is-es", lang === "es");
  }

  function initLangToggle() {
    document.getElementById("lang-toggle").addEventListener("click", () => {
      applyLang(state.lang === "es" ? "en" : "es");
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  buildPortfolioCards();
  initFilters();
  initNav();
  initLangToggle();
  applyLang(state.lang);
})();
