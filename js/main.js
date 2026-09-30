(function () {
  const LANGS = ["en", "es"];
  // The inline <head> script resolves saved/browser language before first paint.
  const state = { lang: LANGS.includes(document.documentElement.lang) ? document.documentElement.lang : "en" };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const FLIP_MS = 420;
  let flipTimer = null;
  let flipFinalize = null;

  function shouldHide(card, filter) {
    return filter !== "all" && card.dataset.cat !== filter;
  }

  function applyFilter(filter) {
    const cards = Array.from(grid.querySelectorAll(".video-card"));
    if (flipFinalize) flipFinalize();

    if (reduceMotion) {
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
      card.style.transform = "scale(0.9)";
    });

    void grid.offsetWidth;

    const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
    moves.forEach((m) => {
      m.card.style.transition = "transform " + FLIP_MS + "ms " + ease;
      m.card.style.transform = "";
    });
    entering.forEach((card, i) => {
      card.style.transition = "opacity " + FLIP_MS + "ms ease " + i * 40 + "ms, transform " + FLIP_MS + "ms " + ease + " " + i * 40 + "ms";
      card.style.opacity = "";
      card.style.transform = "";
    });
    leaving.forEach((card) => {
      card.style.transition = "opacity 220ms ease, transform 220ms ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.94)";
    });

    flipFinalize = function () {
      clearTimeout(flipTimer);
      flipTimer = null;
      flipFinalize = null;
      cards.forEach((card) => {
        ["position", "left", "top", "width", "height", "opacity", "transform", "transition"].forEach((p) => (card.style[p] = ""));
        card.classList.toggle("is-hidden", shouldHide(card, filter));
      });
    };
    flipTimer = setTimeout(flipFinalize, FLIP_MS + 260);
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

  // Header: shadow once the page scrolls, tucks away while scrolling down and
  // comes back on any upward scroll.
  function initHeader() {
    const header = document.querySelector(".site-header");
    let lastY = window.scrollY;
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          header.classList.toggle("is-scrolled", y > 10);
          const hide = y > 400 && y > lastY + 4 && !nav.classList.contains("is-open");
          if (hide) header.classList.add("is-hidden");
          else if (y < lastY - 4 || y <= 400) header.classList.remove("is-hidden");
          lastY = y;
          ticking = false;
        });
      },
      { passive: true }
    );
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
    document.dispatchEvent(new CustomEvent("sa:lang", { detail: { lang } }));
  }

  function initLangToggle() {
    document.getElementById("lang-toggle").addEventListener("click", () => {
      applyLang(state.lang === "es" ? "en" : "es");
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------------
     Dot loader
     1. drop: the Cuero dot falls onto the center of the screen and bounces.
     2. write: "a n d y" rise in one by one while the whole mark slides from
        dot-centered to logo-centered; "UGC / CREATOR" follow.
     3. hold: until the page has loaded (min/max bounded).
     4. swell: the letters step back and the dot grows until it covers the screen.
     5. iris: a hole opens from the dot's center outward, revealing the page.
     "sa:reveal" fires at the start of the iris so the hero entrance plays in view.
     Returning visitors in the same tab (sessionStorage) skip straight to 4–5.
     ------------------------------------------------------------------------ */
  function initLoader() {
    const loader = document.getElementById("loader");
    const root = document.documentElement;
    let revealed = false;

    function reveal() {
      if (revealed) return;
      revealed = true;
      root.classList.remove("is-loading");
      document.dispatchEvent(new Event("sa:reveal"));
      try {
        sessionStorage.setItem("sa-seen", "1");
      } catch (e) {}
    }

    if (!loader) {
      reveal();
      return;
    }
    if (reduceMotion || typeof loader.animate !== "function") {
      loader.style.transition = "opacity .3s";
      setTimeout(() => {
        loader.style.opacity = "0";
        reveal();
      }, 250);
      setTimeout(() => loader.remove(), 600);
      return;
    }

    root.classList.add("is-loading");
    const quick = root.classList.contains("loader-quick");
    const svg = loader.querySelector(".loader-logo");
    const word = loader.querySelector(".loader-word");
    const letters = Array.from(loader.querySelectorAll(".loader-letter"));
    const tags = Array.from(loader.querySelectorAll(".loader-tag"));
    const dot = loader.querySelector(".loader-dot");
    const spring = "cubic-bezier(.34, 1.56, .64, 1)";
    const out = "cubic-bezier(.16, 1, .3, 1)";

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const pageLoaded = new Promise((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", r, { once: true });
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    let CENTER_SHIFT = "none";

    async function run() {
      await Promise.race([fontsReady, wait(900)]);
      // Shift that puts the dot on the svg's center: (128 - 177) viewBox units, in px.
      CENTER_SHIFT = "translateX(" + (-49 * svg.getBoundingClientRect().width) / 256 + "px)";

      if (quick) {
        letters.concat(tags).forEach((el) => (el.style.opacity = "1"));
        dot.style.opacity = "1";
        await Promise.race([pageLoaded, wait(1200)]);
        await wait(250);
      } else {
        const start = performance.now();
        svg.style.transform = CENTER_SHIFT;
        dot.style.opacity = "1";
        // 1. drop + bounce, squash on impact
        await dot.animate(
          [
            { transform: "translateY(-260px) scale(.7, 1.3)", offset: 0 },
            { transform: "translateY(0) scale(1.35, .7)", offset: 0.45 },
            { transform: "translateY(-40px) scale(.9, 1.1)", offset: 0.68 },
            { transform: "translateY(0) scale(1.15, .88)", offset: 0.86 },
            { transform: "translateY(0) scale(1)", offset: 1 }
          ],
          { duration: 820, easing: "cubic-bezier(.45, 0, .55, 1)" }
        ).finished;

        // 2. write the wordmark
        svg.animate([{ transform: CENTER_SHIFT }, { transform: "none" }], { duration: 900, easing: out, fill: "forwards" });
        letters.forEach((el, i) => {
          el.animate(
            [
              { opacity: 0, transform: "translateY(26px)" },
              { opacity: 1, transform: "none" }
            ],
            { duration: 520, delay: 120 + i * 90, easing: spring, fill: "forwards" }
          );
        });
        tags.forEach((el, i) => {
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 560 + i * 120, easing: "linear", fill: "forwards" });
        });
        await wait(980);

        // 3. hold for the page (at least ~1.9s total, at most ~4s)
        await Promise.race([Promise.all([pageLoaded, wait(Math.max(0, 1900 - (performance.now() - start)))]), wait(2200)]);
      }

      // 4. swell
      const r = dot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const far = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
      const scale = (far * 2) / r.width + 2;

      word.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
      await dot.animate([{ transform: "scale(1)" }, { transform: "scale(" + scale + ")" }], {
        duration: quick ? 520 : 680,
        easing: "cubic-bezier(.7, 0, .84, 0)",
        fill: "forwards"
      }).finished;

      // 5. iris out from the dot's center
      loader.classList.add("is-opening");
      reveal();
      const D = quick ? 620 : 820;
      const t0 = performance.now();
      const setHole = (px) => {
        const g = "radial-gradient(circle at " + cx + "px " + cy + "px, transparent " + px + "px, #000 " + (px + 1) + "px)";
        loader.style.webkitMaskImage = g;
        loader.style.maskImage = g;
      };
      await new Promise((done) => {
        // rAF pauses in background tabs; the timeout makes sure the page still opens.
        setTimeout(done, D + 400);
        (function frame(now) {
          const t = Math.min(1, (now - t0) / D);
          const e = 1 - Math.pow(1 - t, 3);
          setHole(e * (far + 4));
          if (t < 1) requestAnimationFrame(frame);
          else done();
        })(performance.now());
      });
      loader.remove();
      document.dispatchEvent(new Event("sa:loaded"));
    }

    run().catch(() => {
      reveal();
      loader.remove();
    });
  }

  // Contact modal: the "Let's work together" CTAs open a <dialog> offering a
  // call or an email. Their hrefs stay untouched as the no-JS fallback, and
  // Esc / backdrop-click / ✕ all close it.
  function initContactModal() {
    const modal = document.getElementById("contact-modal");
    if (!modal || typeof modal.showModal !== "function") return;
    document.querySelectorAll("[data-contact-modal]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        modal.showModal();
      });
    });
    document.getElementById("contact-modal-close").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.close();
    });
  }

  initFilters();
  initNav();
  initHeader();
  initLangToggle();
  applyLang(state.lang);
  initLoader();
  initContactModal();
})();
