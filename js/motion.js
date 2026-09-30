/* Motion layer. Everything here is progressive enhancement on top of a fully
   readable static page; no animation library, just CSS transitions, WAAPI and
   IntersectionObserver. Reduced motion gets the final states directly. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;

  function lang() {
    return document.documentElement.lang === "es" ? "es" : "en";
  }

  function onFirstIntersect(el, run, opts) {
    if (!el) return;
    if (!hasIO) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          run();
        }
      });
    }, opts || { threshold: 0.3, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
  }

  /* ---------------- Hero: typed headline with the dot as caret ---------------- */

  var title = document.getElementById("hero-title");
  var titleText = title && title.querySelector(".hero-title-text");
  var caret = title && title.querySelector(".type-caret");
  var typing = null;

  // Wrap each character in a span so the final layout exists from the start and
  // typing is only an opacity change. Words stay in nowrap groups so a line
  // never breaks mid-word.
  function splitTitle() {
    var text = titleText.textContent;
    titleText.textContent = "";
    text.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        titleText.appendChild(document.createTextNode(part));
        return;
      }
      var word = document.createElement("span");
      word.style.whiteSpace = "nowrap";
      Array.prototype.forEach.call(part, function (c) {
        var ch = document.createElement("span");
        ch.className = "ch";
        ch.textContent = c;
        word.appendChild(ch);
      });
      titleText.appendChild(word);
    });
    return Array.prototype.slice.call(titleText.querySelectorAll(".ch"));
  }

  function placeCaret(ch) {
    var t = title.getBoundingClientRect();
    var r = ch.getBoundingClientRect();
    var size = caret.offsetWidth;
    // Sit on the glyph baseline, just after the character, like a full stop.
    var baseline = r.top + r.height * 0.78;
    title.style.setProperty("--cx", r.right - t.left + size * 0.35 + "px");
    title.style.setProperty("--cy", baseline - t.top - size + "px");
  }

  function typeTitle(done) {
    var chars = splitTitle();
    title.classList.remove("is-done");
    title.classList.add("is-typing");
    var i = 0;
    var first = chars[0];
    if (first) placeCaret(first);
    function step() {
      if (i >= chars.length) {
        title.classList.remove("is-typing");
        title.classList.add("is-done");
        typing = null;
        if (done) done();
        return;
      }
      var ch = chars[i++];
      ch.classList.add("is-on");
      placeCaret(ch);
      // A little human rhythm: pause after punctuation, faster inside words.
      var c = ch.textContent;
      var delay = /[,!¡.]/.test(c) ? 220 : 34 + Math.random() * 30;
      typing = setTimeout(step, delay);
    }
    typing = setTimeout(step, 260);
  }

  function finishTitle() {
    if (typing) clearTimeout(typing);
    typing = null;
    title.classList.remove("is-typing");
    title.classList.add("is-done");
  }

  /* ---------------- Hero: reel captions, timer, tilt ---------------- */

  var reel = document.getElementById("hero-reel");
  var capEl = document.getElementById("reel-caption");
  var timeEl = document.getElementById("reel-time");
  var progEl = document.getElementById("reel-progress");
  var capIndex = 0;
  var capTimer = null;
  var clockRaf = null;
  var reelVisible = true;
  var REEL_SECONDS = 15;

  function captionLines() {
    return (I18N[lang()]["hero.captions"] || "").split("|");
  }

  function renderCaption(line, instant) {
    capEl.classList.remove("is-leaving");
    capEl.textContent = "";
    line.split(" ").forEach(function (w, i, arr) {
      var span = document.createElement("span");
      var key = /^\*.*\*$/.test(w);
      span.className = "cap-word" + (key ? " is-key" : "");
      span.textContent = key ? w.slice(1, -1) : w;
      capEl.appendChild(span);
      if (i < arr.length - 1) capEl.appendChild(document.createTextNode(" "));
    });
    var words = capEl.querySelectorAll(".cap-word");
    Array.prototype.forEach.call(words, function (w, i) {
      if (instant) w.classList.add("is-on");
      else setTimeout(function () { w.classList.add("is-on"); }, 140 * i);
    });
    return words.length;
  }

  function nextCaption() {
    var lines = captionLines();
    var n = renderCaption(lines[capIndex % lines.length]);
    capIndex++;
    capTimer = setTimeout(function () {
      capEl.classList.add("is-leaving");
      capTimer = setTimeout(nextCaption, 320);
    }, 140 * n + 1900);
  }

  function startClock() {
    var t0 = performance.now();
    function frame(now) {
      var s = ((now - t0) / 1000) % REEL_SECONDS;
      timeEl.textContent = "0:" + (s < 10 ? "0" : "") + Math.floor(s);
      progEl.style.setProperty("--p", (s / REEL_SECONDS).toFixed(4));
      clockRaf = reelVisible && !document.hidden ? requestAnimationFrame(frame) : null;
    }
    clockRaf = requestAnimationFrame(frame);
  }

  function startReel() {
    if (!capEl) return;
    if (reduce) {
      renderCaption(captionLines()[0], true);
      return;
    }
    nextCaption();
    startClock();
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        reelVisible = entries[0].isIntersecting;
        if (reelVisible && clockRaf === null) startClock();
      }).observe(reel);
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && clockRaf === null && reelVisible) startClock();
    });
  }

  function initTilt() {
    if (!finePointer || reduce || !reel) return;
    var frame = reel.querySelector(".reel-frame");
    var hero = document.querySelector(".hero");
    hero.addEventListener("pointermove", function (e) {
      var r = frame.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      var y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      frame.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
      frame.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", function () {
      frame.style.setProperty("--ry", "0deg");
      frame.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------------- Hero orchestration ---------------- */

  var heroRise = [];
  function prepareHero() {
    if (reduce) return;
    heroRise = Array.prototype.slice.call(document.querySelectorAll(".hero-hello, .hero-lede, .hero-cta, .hero-reel"));
    heroRise.forEach(function (el) { el.classList.add("hero-rise"); });
  }

  function playHero() {
    if (reduce) {
      drawMark(document.querySelector(".hero-lede .hl"));
      startReel();
      return;
    }
    // Reel and hello chip first, the headline types, then lede + CTAs follow the caret.
    var reelEl = document.querySelector(".hero-reel");
    var hello = document.querySelector(".hero-hello");
    if (reelEl) setTimeout(function () { reelEl.classList.add("is-in"); }, 80);
    if (hello) hello.classList.add("is-in");
    typeTitle(function () {
      setTimeout(function () { drawMark(document.querySelector(".hero-lede .hl")); }, 450);
    });
    setTimeout(function () { document.querySelector(".hero-lede").classList.add("is-in"); }, 700);
    setTimeout(function () { document.querySelector(".hero-cta").classList.add("is-in"); }, 860);
    setTimeout(startReel, 500);
  }

  /* ---------------- Marker highlight ---------------- */

  function drawMark(el) {
    if (el) el.classList.add("is-drawn");
  }

  /* ---------------- Cursor spotlight on cards ---------------- */

  function initSpotlight() {
    if (!finePointer) return;
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".spot");
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }

  /* ---------------- Nav: the dot follows the section in view ---------------- */

  function initNavDot() {
    var dot = document.getElementById("nav-dot");
    var navEl = document.getElementById("main-nav");
    if (!dot || !hasIO) return;
    var links = Array.prototype.slice.call(navEl.querySelectorAll("a:not(.nav-cta)"));
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var current = null;
    function moveTo(a) {
      current = a;
      if (!a) { dot.style.opacity = "0"; return; }
      var n = navEl.getBoundingClientRect();
      var r = a.getBoundingClientRect();
      dot.style.opacity = "1";
      dot.style.transform = "translateX(" + (r.left - n.left + r.width / 2 - 3) + "px)";
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) moveTo(map[entry.target.id]);
        else if (current === map[entry.target.id]) moveTo(null);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
    window.addEventListener("resize", function () { if (current) moveTo(current); });
    document.addEventListener("sa:lang", function () { if (current) moveTo(current); });
  }

  /* ---------------- Section moments ---------------- */

  function initSections() {
    // Reels grid: one staggered entrance the first time it comes into view.
    var grid = document.getElementById("portfolio-grid");
    if (grid && !reduce) {
      var cards = Array.prototype.slice.call(grid.querySelectorAll(".video-card"));
      cards.forEach(function (c) { c.classList.add("is-pre"); });
      onFirstIntersect(grid, function () {
        cards.forEach(function (c, i) {
          c.style.transition = "opacity .6s ease " + i * 55 + "ms, transform .7s cubic-bezier(.16,1,.3,1) " + i * 55 + "ms";
          c.classList.remove("is-pre");
          setTimeout(function () { c.style.transition = ""; }, 800 + i * 55);
        });
      }, { threshold: 0.15 });
    }

    // Profile counts tick up once.
    var card = document.getElementById("stat-card");
    if (card) {
      onFirstIntersect(card, function () {
        card.querySelectorAll(".stat-num").forEach(function (el) {
          var target = parseInt(el.getAttribute("data-count"), 10);
          if (isNaN(target)) return;
          var fmt = function (v) { return Math.floor(v).toLocaleString(lang() === "es" ? "es-AR" : "en-US"); };
          if (reduce) { el.textContent = fmt(target); return; }
          var t0 = performance.now();
          var D = 1400;
          (function frame(now) {
            var t = Math.min(1, (now - t0) / D);
            el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
            if (t < 1) requestAnimationFrame(frame);
          })(t0);
        });
      });
      document.addEventListener("sa:lang", function () {
        card.querySelectorAll(".stat-num").forEach(function (el) {
          el.textContent = parseInt(el.getAttribute("data-count"), 10).toLocaleString(lang() === "es" ? "es-AR" : "en-US");
        });
      });
    }

    // Contact: highlight draws, then the full stop drops in.
    var contactMark = document.querySelector(".contact-title .hl");
    var contactDot = document.querySelector(".contact-dot");
    onFirstIntersect(contactMark, function () {
      drawMark(contactMark);
      if (contactDot && !reduce) setTimeout(function () { contactDot.classList.add("is-in"); }, 700);
    });
  }

  /* ---------------- Process stepper ---------------- */

  function initStepper() {
    var stepper = document.getElementById("process-stepper");
    if (!stepper) return;
    var steps = Array.prototype.slice.call(stepper.querySelectorAll(".step"));
    var DWELL = 2600;
    var RESET = 420;
    var active = -1;
    var paused = false;
    var stepTimer = null;
    stepper.style.setProperty("--dwell", DWELL + "ms");

    function render() {
      steps.forEach(function (li, i) {
        li.classList.toggle("is-done", active > -1 && i < active);
        li.classList.toggle("is-active", i === active);
      });
    }
    function tick(delay) {
      stepTimer = setTimeout(function () {
        if (!paused) {
          active = active >= steps.length - 1 ? -1 : active + 1;
          render();
        }
        tick(!paused && active === -1 ? RESET : DWELL);
      }, delay);
    }
    function startCycle() {
      if (stepTimer !== null) return;
      stepper.classList.add("is-animated");
      active = 0;
      render();
      tick(DWELL);
    }
    function stopCycle() {
      if (stepTimer === null) return;
      clearTimeout(stepTimer);
      stepTimer = null;
      stepper.classList.remove("is-animated");
      active = -1;
      render();
    }

    steps.forEach(function (li, i) {
      li.addEventListener("click", function () {
        active = i;
        render();
      });
    });

    if (reduce) {
      // Static: every step reads as done, no cycling.
      active = steps.length;
      render();
      return;
    }
    stepper.addEventListener("mouseenter", function () { paused = true; });
    stepper.addEventListener("mouseleave", function () { paused = false; });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) startCycle();
          else stopCycle();
        });
      }, { threshold: 0.35 }).observe(stepper);
    } else {
      startCycle();
    }
  }

  /* ---------------- Language switches ---------------- */

  document.addEventListener("sa:lang", function () {
    // i18n just replaced the headline's text node; re-split without animating.
    if (title && titleText && !titleText.querySelector(".ch")) {
      splitTitle().forEach(function (c) { c.classList.add("is-on"); });
      finishTitle();
    }
    // Restart the caption loop so the reel switches language right away.
    if (capEl && capTimer !== null) {
      clearTimeout(capTimer);
      capIndex = 0;
      nextCaption();
    }
    if (capEl && reduce) renderCaption(captionLines()[0], true);
  });

  /* ---------------- Boot ---------------- */

  function boot() {
    prepareHero();
    initTilt();
    initSpotlight();
    initNavDot();
    initSections();
    initStepper();

    var started = false;
    function start() {
      if (started) return;
      started = true;
      playHero();
    }
    if (document.getElementById("loader")) {
      document.addEventListener("sa:reveal", start, { once: true });
      setTimeout(start, 6000);
    } else {
      start();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
