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
     Dot loader (~2s first visit, ~0.8s on return)
     1. drop: the Cuero dot falls onto the center with gravity easing, squashes,
        rebounds once and settles.
     2. write: "a n d y" pop in while the mark slides from dot-centered to
        logo-centered; "UGC / CREATOR" follow.
     3. hold: only if the page still hasn't loaded (short cap).
     4. swell: the dot grows past the screen edges and turns Terracota, so it
        becomes the hero's background; the overlay then fades out.
     "sa:reveal" fires as the overlay fades so the hero and menu enter in view.
     Returning visitors in the same tab (sessionStorage) skip straight to 4.
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
    // Opened in a background tab: browsers pause animations there, so skip the
    // intro and show the page as it is when the visitor switches to it.
    if (document.hidden) {
      loader.remove();
      reveal();
      return;
    }
    if (reduceMotion || typeof loader.animate !== "function") {
      loader.style.transition = "opacity .3s";
      setTimeout(() => {
        loader.style.opacity = "0";
        reveal();
      }, 200);
      setTimeout(() => loader.remove(), 550);
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
    const gravity = "cubic-bezier(.55, 0, 1, .45)"; // accelerate into the ground
    const lift = "cubic-bezier(0, .55, .45, 1)"; // decelerate on the way up

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const pageLoaded = new Promise((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", r, { once: true });
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    async function run() {
      await Promise.race([fontsReady, wait(600)]);
      // Shift that puts the dot on the svg's center: (128 - 177) viewBox units, in px.
      const shift = "translateX(" + (-49 * svg.getBoundingClientRect().width) / 256 + "px)";

      if (quick) {
        letters.concat(tags).forEach((el) => (el.style.opacity = "1"));
        dot.style.opacity = "1";
        await Promise.race([pageLoaded, wait(500)]);
      } else {
        const start = performance.now();
        svg.style.transform = shift;
        dot.style.opacity = "1";
        // 1. drop: per-keyframe easing gives a real fall/rebound rhythm
        await dot.animate(
          [
            { transform: "translateY(-240px) scale(.85, 1.2)", easing: gravity },
            { transform: "translateY(0) scale(1.4, .65)", offset: 0.46, easing: lift },
            { transform: "translateY(-30px) scale(.94, 1.06)", offset: 0.7, easing: gravity },
            { transform: "translateY(0) scale(1.12, .9)", offset: 0.86, easing: "ease-out" },
            { transform: "none" }
          ],
          { duration: 620 }
        ).finished;

        // 2. write the wordmark
        svg.animate([{ transform: shift }, { transform: "none" }], { duration: 560, easing: out, fill: "forwards" });
        letters.forEach((el, i) => {
          el.animate(
            [
              { opacity: 0, transform: "translateY(22px) scale(.9)" },
              { opacity: 1, transform: "none" }
            ],
            { duration: 420, delay: 40 + i * 55, easing: spring, fill: "forwards" }
          );
        });
        tags.forEach((el, i) => {
          el.animate([{ opacity: 0, transform: "translateX(-6px)" }, { opacity: 1, transform: "none" }], {
            duration: 260,
            delay: 260 + i * 70,
            easing: out,
            fill: "forwards"
          });
        });
        await wait(600);

        // 3. hold only as long as needed (at least ~1.3s total, at most +700ms)
        await Promise.race([Promise.all([pageLoaded, wait(Math.max(0, 1300 - (performance.now() - start)))]), wait(700)]);
      }

      // 4. swell into the hero
      const r = dot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const far = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
      const scale = (far * 2) / r.width + 2;

      word.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 200, fill: "forwards" });
      await dot.animate(
        [
          { transform: "scale(1)", fill: "#864C24" },
          { transform: "scale(.82)", fill: "#864C24", offset: 0.18 },
          { transform: "scale(" + scale + ")", fill: "#8F3F23" }
        ],
        { duration: quick ? 420 : 520, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" }
      ).finished;

      reveal();
      await loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out", fill: "forwards" }).finished;
      loader.remove();
      document.dispatchEvent(new Event("sa:loaded"));
    }

    run().catch(() => {
      reveal();
      loader.remove();
    });
  }

  /* ------------------------------------------------------------------------
     Contact modal as a DM thread. The CTAs keep their hrefs as the no-JS
     fallback. On open, Andy's bubbles arrive one by one behind a typing
     indicator. The composer adds the visitor's bubble, Andy "answers", then
     the visitor's own mail app opens with their text as the body.
     ------------------------------------------------------------------------ */
  function initContactModal() {
    const modal = document.getElementById("contact-modal");
    if (!modal || typeof modal.showModal !== "function") return;
    const thread = document.getElementById("dm-thread");
    const typing = thread.querySelector(".dm-typing");
    const form = document.getElementById("dm-compose");
    const input = document.getElementById("dm-input");
    const items = Array.from(thread.querySelectorAll(".dm-msg, .dm-share"));
    let timers = [];

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const scrollDown = () => (thread.scrollTop = thread.scrollHeight);

    function arrive(el) {
      el.classList.remove("is-pending");
      el.classList.remove("is-arrived");
      void el.offsetWidth;
      el.classList.add("is-arrived");
      scrollDown();
    }

    function playThread() {
      timers.forEach(clearTimeout);
      timers = [];
      thread.querySelectorAll(".dm-user, .dm-reply").forEach((el) => el.remove());
      if (reduceMotion) {
        items.forEach((el) => el.classList.remove("is-pending"));
        return;
      }
      items.forEach((el) => el.classList.add("is-pending"));
      let t = 120;
      items.forEach((el, i) => {
        const isBubble = el.classList.contains("dm-msg");
        if (isBubble) {
          later(() => {
            typing.classList.add("is-on");
            thread.appendChild(typing);
            scrollDown();
          }, t);
          t += i === 0 ? 420 : 340;
        }
        later(() => {
          typing.classList.remove("is-on");
          typing.before(el);
          arrive(el);
        }, t);
        t += isBubble ? 140 : 180;
      });
    }

    document.querySelectorAll("[data-contact-modal]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        modal.showModal();
        playThread();
      });
    });
    document.getElementById("contact-modal-close").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.close();
    });
    modal.addEventListener("close", () => {
      timers.forEach(clearTimeout);
      typing.classList.remove("is-on");
      items.forEach((el) => el.classList.remove("is-pending"));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) {
        input.focus();
        return;
      }
      const mine = document.createElement("p");
      mine.className = "dm-msg dm-user";
      mine.textContent = text;
      typing.before(mine);
      arrive(mine);
      input.value = "";

      const href =
        "mailto:itssimplyandy1@gmail.com?subject=" +
        encodeURIComponent("Collab with Andy") +
        "&body=" +
        encodeURIComponent(text);
      const replyDelay = reduceMotion ? 0 : 700;
      if (!reduceMotion) {
        later(() => {
          typing.classList.add("is-on");
          thread.appendChild(typing);
          scrollDown();
        }, 250);
      }
      later(() => {
        typing.classList.remove("is-on");
        const reply = document.createElement("p");
        reply.className = "dm-msg dm-reply";
        reply.textContent = I18N[state.lang]["modal.reply"];
        typing.before(reply);
        arrive(reply);
      }, replyDelay);
      later(() => {
        window.location.href = href;
      }, replyDelay + 900);
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
