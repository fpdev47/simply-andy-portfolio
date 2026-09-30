/* Motion layer. Everything here is progressive enhancement on top of a fully
   readable static page; no animation library, just CSS transitions, WAAPI and
   IntersectionObserver. Reduced motion gets the final states directly. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;
  var canAnimate = typeof document.body.animate === "function";

  var PALETTE = ["#8F3F23", "#51091B", "#1F2C44", "#864C24", "#61603A"];

  function lang() {
    return document.documentElement.lang === "es" ? "es" : "en";
  }
  function t(key) {
    return (I18N[lang()] || {})[key] || "";
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

  /* ---------------- Particle burst ----------------
     A handful of dots fly out from (x, y) in viewport coordinates and fade.
     Used by the menu entrance, likes and double-taps. */
  function burst(x, y, opts) {
    if (reduce || !canAnimate) return;
    opts = opts || {};
    var count = opts.count || 8;
    var colors = opts.colors || PALETTE;
    var dist = opts.dist || 22;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      var size = (opts.size || 5) * (0.7 + Math.random() * 0.6);
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      var d = dist * (0.7 + Math.random() * 0.6);
      p.className = "burst-p";
      p.style.width = p.style.height = size + "px";
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      var x0 = x - size / 2;
      var y0 = y - size / 2;
      p.animate(
        [
          { transform: "translate(" + x0 + "px," + y0 + "px) scale(.4)", opacity: 1 },
          { transform: "translate(" + (x0 + Math.cos(angle) * d) + "px," + (y0 + Math.sin(angle) * d) + "px) scale(1)", opacity: 1, offset: 0.6 },
          { transform: "translate(" + (x0 + Math.cos(angle) * d * 1.25) + "px," + (y0 + Math.sin(angle) * d * 1.25 + 4) + "px) scale(0)", opacity: 0 }
        ],
        { duration: 520 + Math.random() * 180, easing: "cubic-bezier(.2, .7, .3, 1)" }
      ).onfinish = (function (el) { return function () { el.remove(); }; })(p);
    }
  }
  function burstAt(el, opts) {
    var r = el.getBoundingClientRect();
    // Full-width items (mobile menu): burst from the label, not the box center.
    if (opts && opts.onText) {
      var range = document.createRange();
      range.selectNodeContents(el);
      var tr = range.getBoundingClientRect();
      if (tr.width) r = tr;
    }
    burst(r.left + r.width / 2, r.top + r.height / 2, opts);
  }

  /* ---------------- Menu entrance ----------------
     Header pill drops in, then each item pops into place with a mini burst. */
  var header = document.querySelector(".site-header");
  var navEl = document.getElementById("main-nav");
  var burger = document.getElementById("nav-burger");

  function menuItems() {
    var mobile = burger && getComputedStyle(burger).display !== "none";
    var links = Array.prototype.slice.call(navEl.querySelectorAll("a"));
    var actions = Array.prototype.slice.call(document.querySelectorAll(".header-actions > *")).filter(function (el) {
      return getComputedStyle(el).display !== "none";
    });
    return mobile ? actions : links.concat(actions);
  }

  function popIn(items, step, withBurst) {
    items.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add("is-in");
        if (withBurst) {
          setTimeout(function () {
            burstAt(el, { count: el.classList.contains("nav-cta") ? 10 : 7, dist: el.classList.contains("nav-cta") ? 30 : 20, size: 4.5, onText: true });
          }, 90);
        }
      }, i * step);
    });
  }

  function enterMenu() {
    header.classList.add("is-in");
    var all = Array.prototype.slice.call(navEl.querySelectorAll("a")).concat(Array.prototype.slice.call(document.querySelectorAll(".header-actions > *")));
    if (reduce) {
      all.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var visible = menuItems();
    // Items that aren't on screen (collapsed mobile menu) are simply marked ready.
    all.forEach(function (el) { if (visible.indexOf(el) === -1) el.classList.add("is-in"); });
    setTimeout(function () { popIn(visible, 75, true); }, 280);
  }

  function initMenuReplay() {
    if (!burger) return;
    burger.addEventListener("click", function () {
      if (!navEl.classList.contains("is-open")) return;
      var links = Array.prototype.slice.call(navEl.querySelectorAll("a"));
      if (reduce) return;
      links.forEach(function (a) { a.classList.remove("is-in"); });
      setTimeout(function () { popIn(links, 55, true); }, 60);
    });
    navEl.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a) burst(e.clientX || 0, e.clientY || 0, { count: 8, dist: 18, size: 4 });
    });
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
    var tr = title.getBoundingClientRect();
    var r = ch.getBoundingClientRect();
    var size = caret.offsetWidth;
    var baseline = r.top + r.height * 0.78;
    title.style.setProperty("--cx", r.right - tr.left + size * 0.35 + "px");
    title.style.setProperty("--cy", baseline - tr.top - size + "px");
  }

  function typeTitle(done) {
    var chars = splitTitle();
    title.classList.remove("is-done");
    title.classList.add("is-typing");
    var i = 0;
    if (chars[0]) placeCaret(chars[0]);
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
      var c = ch.textContent;
      var delay = /[,!¡.]/.test(c) ? 200 : 30 + Math.random() * 26;
      typing = setTimeout(step, delay);
    }
    typing = setTimeout(step, 200);
  }

  function finishTitle() {
    if (typing) clearTimeout(typing);
    typing = null;
    title.classList.remove("is-typing");
    title.classList.add("is-done");
  }

  /* ---------------- Reels (hero IG frame + About TikTok frame) ----------------
     Each figure.reel gets: caption lines from i18n that pop word by word, a 15s
     progress loop, a slow push-in on the media (CSS), hearts that float up from
     the like button, an auto-like every few seconds, and a double-tap heart
     (also on real double-tap / double-click). Everything pauses off screen. */
  var REEL_SECONDS = 15;
  var reels = [];

  function createReel(fig) {
    var phone = fig.querySelector(".phone");
    var capEl = fig.querySelector(".reel-caption");
    var prog = fig.querySelector(".reel-progress span");
    var like = fig.querySelector(".rail-like");
    var fx = fig.querySelector(".reel-fx");
    var big = fig.querySelector(".big-heart");
    var key = fig.getAttribute("data-captions");
    var heartEvery = parseInt(fig.getAttribute("data-hearts"), 10) || 1400;
    var R = { fig: fig, running: false, visible: false, armed: false, idx: 0, timers: [], raf: null, t0: 0, elapsed: 0 };

    function lines() { return t(key).split("|"); }

    function renderCaption(line, instant) {
      capEl.classList.remove("is-leaving");
      capEl.textContent = "";
      line.split(" ").forEach(function (w, i, arr) {
        var span = document.createElement("span");
        var isKey = /^\*.*\*[,.]?$/.test(w);
        span.className = "cap-word" + (isKey ? " is-key" : "");
        span.textContent = isKey ? w.replace(/\*/g, "") : w;
        capEl.appendChild(span);
        if (i < arr.length - 1) capEl.appendChild(document.createTextNode(" "));
      });
      var words = capEl.querySelectorAll(".cap-word");
      Array.prototype.forEach.call(words, function (w, i) {
        if (instant) w.classList.add("is-on");
        else R.timers.push(setTimeout(function () { w.classList.add("is-on"); }, 130 * i));
      });
      return words.length;
    }

    function nextCaption() {
      var ls = lines();
      var n = renderCaption(ls[R.idx % ls.length]);
      R.idx++;
      R.timers.push(setTimeout(function () {
        capEl.classList.add("is-leaving");
        R.timers.push(setTimeout(nextCaption, 300));
      }, 130 * n + 1800));
    }

    function floatHeart() {
      if (!like) return;
      var pr = phone.getBoundingClientRect();
      var lr = like.getBoundingClientRect();
      var h = document.createElement("span");
      h.className = "float-heart";
      h.innerHTML = '<svg viewBox="0 0 24 24"><use href="#icon-heart"/></svg>';
      var colors = ["#FFFFFF", "#E9E2D0", "#8F3F23", "#FFFFFF", "#864C24"];
      h.style.color = colors[Math.floor(Math.random() * colors.length)];
      fx.appendChild(h);
      var x = lr.left - pr.left + lr.width / 2 - 12;
      var y = lr.top - pr.top;
      var drift = (Math.random() - 0.5) * 60;
      var rise = 170 + Math.random() * 110;
      var s = 0.6 + Math.random() * 0.6;
      h.animate(
        [
          { transform: "translate(" + x + "px," + y + "px) scale(.2)", opacity: 0 },
          { transform: "translate(" + (x + drift * 0.3) + "px," + (y - rise * 0.25) + "px) scale(" + s + ")", opacity: 1, offset: 0.2 },
          { transform: "translate(" + (x - drift * 0.4) + "px," + (y - rise * 0.6) + "px) scale(" + s + ") rotate(" + drift * 0.2 + "deg)", opacity: 0.9, offset: 0.6 },
          { transform: "translate(" + (x + drift) + "px," + (y - rise) + "px) scale(" + s * 0.9 + ")", opacity: 0 }
        ],
        { duration: 2200 + Math.random() * 900, easing: "cubic-bezier(.3, .6, .4, 1)" }
      ).onfinish = function () { h.remove(); };
    }

    function doLike(withBurst) {
      if (!like) return;
      like.classList.add("is-liked");
      like.classList.remove("is-pop");
      void like.offsetWidth;
      like.classList.add("is-pop");
      if (withBurst) burstAt(like, { count: 9, dist: 26, size: 5, colors: ["#8F3F23", "#E9E2D0", "#51091B"] });
    }

    function bigHeart(px, py) {
      if (!big) return;
      big.style.setProperty("--hx", px != null ? px + "px" : "50%");
      big.style.setProperty("--hy", py != null ? py + "px" : "45%");
      big.classList.remove("is-pop");
      void big.offsetWidth;
      big.classList.add("is-pop");
      doLike(true);
    }

    function tick(now) {
      R.elapsed += now - R.t0;
      R.t0 = now;
      var s = (R.elapsed / 1000) % REEL_SECONDS;
      prog.style.setProperty("--p", (s / REEL_SECONDS).toFixed(4));
      R.raf = requestAnimationFrame(tick);
    }

    function start() {
      if (R.running || !R.armed || !R.visible || document.hidden) return;
      R.running = true;
      fig.classList.add("is-playing");
      if (reduce) return;
      if (!capEl.childNodes.length || R.idx === 0) nextCaption();
      else R.timers.push(setTimeout(nextCaption, 200));
      R.t0 = performance.now();
      R.raf = requestAnimationFrame(tick);
      var beat = 0;
      R.heartTimer = setInterval(function () {
        floatHeart();
        if (Math.random() > 0.55) setTimeout(floatHeart, 220);
        beat++;
        if (beat % 5 === 2) doLike(true);
        if (beat % 9 === 4) bigHeart();
      }, heartEvery);
    }

    function stop() {
      if (!R.running) return;
      R.running = false;
      fig.classList.remove("is-playing");
      R.timers.forEach(clearTimeout);
      R.timers = [];
      clearInterval(R.heartTimer);
      cancelAnimationFrame(R.raf);
    }

    R.arm = function () {
      R.armed = true;
      if (reduce) {
        renderCaption(lines()[0], true);
        return;
      }
      start();
    };
    R.restartCaptions = function () {
      R.timers.forEach(clearTimeout);
      R.timers = [];
      R.idx = 0;
      if (reduce || !R.running) renderCaption(lines()[0], true);
      else nextCaption();
    };

    // Double-tap / double-click to like, like the real apps.
    var lastTap = 0;
    phone.addEventListener("pointerup", function (e) {
      var now = Date.now();
      if (now - lastTap < 320) {
        var r = phone.getBoundingClientRect();
        bigHeart(e.clientX - r.left, e.clientY - r.top);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    });

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        R.visible = entries[0].isIntersecting;
        if (R.visible) start();
        else stop();
      }, { threshold: 0.2 }).observe(fig);
    } else {
      R.visible = true;
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    // Caption text is rendered from i18n even before the reel plays.
    renderCaption(lines()[0], true);
    reels.push(R);
    return R;
  }

  function initTilt() {
    if (!finePointer || reduce) return;
    document.querySelectorAll(".reel").forEach(function (fig) {
      var phone = fig.querySelector(".phone");
      var zone = fig.closest("section") || fig;
      zone.addEventListener("pointermove", function (e) {
        var r = phone.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        phone.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
        phone.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
      });
      zone.addEventListener("pointerleave", function () {
        phone.style.setProperty("--ry", "0deg");
        phone.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* ---------------- Hero orchestration ---------------- */

  var heroReel = null;

  function prepareHero() {
    if (reduce) return;
    document.querySelectorAll(".hero-hello, .hero-lede, .hero-cta, .hero-reel").forEach(function (el) {
      el.classList.add("hero-rise");
    });
  }

  function playHero() {
    enterMenu();
    if (reduce) {
      drawMark(document.querySelector(".hero-lede .hl"));
      if (heroReel) heroReel.arm();
      return;
    }
    var reelEl = document.querySelector(".hero-reel");
    var hello = document.querySelector(".hero-hello");
    if (reelEl) setTimeout(function () { reelEl.classList.add("is-in"); }, 60);
    if (hello) hello.classList.add("is-in");
    typeTitle(function () {
      setTimeout(function () { drawMark(document.querySelector(".hero-lede .hl")); }, 300);
    });
    setTimeout(function () { document.querySelector(".hero-lede").classList.add("is-in"); }, 550);
    setTimeout(function () { document.querySelector(".hero-cta").classList.add("is-in"); }, 700);
    setTimeout(function () { if (heroReel) heroReel.arm(); }, 450);
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

  /* ---------------- Odometer counts ---------------- */

  function fmt(n) {
    return n.toLocaleString(lang() === "es" ? "es-AR" : "en-US");
  }

  // Builds rolling digit strips for a number. Each digit spins through one full
  // extra turn (0-9 then 0-target) so small numbers still feel like they count.
  function renderOdo(el, animate) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    var text = fmt(target);
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var strips = [];
    // Each window is as wide as its own final digit, so proportional figures
    // keep their natural spacing; once done the plain text replaces the strips.
    var probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
    el.appendChild(probe);
    var widths = {};
    "0123456789".split("").forEach(function (d) { probe.textContent = d; widths[d] = probe.getBoundingClientRect().width; });
    probe.remove();
    Array.prototype.forEach.call(text, function (c) {
      if (!/\d/.test(c)) {
        var sep = document.createElement("span");
        sep.className = "odo-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = c;
        el.appendChild(sep);
        return;
      }
      var box = document.createElement("span");
      box.className = "odo-digit";
      box.setAttribute("aria-hidden", "true");
      var strip = document.createElement("span");
      strip.className = "odo-strip";
      var html = "";
      for (var i = 0; i < 20; i++) html += "<span>" + (i % 10) + "</span>";
      strip.innerHTML = html;
      box.style.width = widths[c] + "px";
      box.appendChild(strip);
      el.appendChild(box);
      strips.push({ strip: strip, stop: 10 + parseInt(c, 10) });
    });
    function settle() { el.textContent = text; }
    if (!animate || reduce) {
      if (reduce || el.hasAttribute("data-played")) { settle(); return; }
    }
    strips.forEach(function (s, i) {
      var to = "translateY(-" + s.stop + "em)";
      if (!animate) {
        s.strip.style.transform = to;
        return;
      }
      s.strip.style.transform = "translateY(0)";
      s.strip.animate([{ transform: "translateY(0)" }, { transform: to }], {
        duration: 1300 + i * 170,
        delay: 80 * i,
        easing: "cubic-bezier(.12, .8, .2, 1)",
        fill: "forwards"
      }).onfinish = function () {
        s.strip.style.transform = to;
        if (i === strips.length - 1) settle();
      };
    });
  }

  function initStats() {
    var card = document.getElementById("stat-card");
    if (!card) return;
    var nums = Array.prototype.slice.call(card.querySelectorAll(".stat-num"));
    var played = false;
    nums.forEach(function (el) { renderOdo(el, false); });
    if (!reduce) {
      // Park every strip at 0 until the stats come into view.
      nums.forEach(function (el) {
        el.querySelectorAll(".odo-strip").forEach(function (s) { s.style.transform = "translateY(0)"; });
      });
    }
    onFirstIntersect(card, function () {
      played = true;
      nums.forEach(function (el, i) {
        setTimeout(function () {
          el.setAttribute("data-played", "");
          renderOdo(el, true);
          burstAt(el.closest(".stat"), { count: 6, dist: 34, size: 5, colors: ["#E9E2D0"] });
        }, i * 140);
      });
    });
    document.addEventListener("sa:lang", function () {
      nums.forEach(function (el) { renderOdo(el, false); });
      if (!played && !reduce) {
        nums.forEach(function (el) {
          el.querySelectorAll(".odo-strip").forEach(function (s) { s.style.transform = "translateY(0)"; });
        });
      }
    });
  }

  /* ---------------- Section moments ---------------- */

  function initSections() {
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

    var contactMark = document.querySelector(".contact-title .hl");
    var contactDot = document.querySelector(".contact-dot");
    onFirstIntersect(contactMark, function () {
      drawMark(contactMark);
      if (contactDot && !reduce) setTimeout(function () { contactDot.classList.add("is-in"); }, 700);
    });
  }

  /* ---------------- How I work: editor timeline ----------------
     A playhead scrubs across five clips (1.4s each). The clip under it lifts
     and its waveform plays; the monitor shows that step. Hover pauses, click
     or Enter on a clip jumps the playhead there. */
  function initEditor() {
    var editor = document.getElementById("process-editor");
    if (!editor) return;
    var clips = Array.prototype.slice.call(editor.querySelectorAll(".clip"));
    var list = editor.querySelector(".clips");
    var head = document.getElementById("playhead");
    var timeline = editor.querySelector(".editor-timeline");
    var monitor = editor.querySelector(".editor-monitor");
    var mNum = monitor.querySelector(".editor-num");
    var mTitle = monitor.querySelector(".editor-title");
    var mDesc = monitor.querySelector(".editor-desc");
    var tc = monitor.querySelector(".editor-tc");
    var STEP = 1400;
    var TOTAL = STEP * clips.length;
    var pos = 0;
    var active = -1;
    var paused = false;
    var visible = false;
    var raf = null;
    var last = 0;

    function show(i) {
      if (i === active) return;
      active = i;
      clips.forEach(function (c, k) {
        c.classList.toggle("is-active", k === i);
        c.classList.toggle("is-done", k < i);
      });
      var c = clips[i];
      mNum.textContent = c.querySelector(".clip-num").textContent;
      mTitle.textContent = c.querySelector(".clip-title").textContent;
      mDesc.textContent = c.querySelector(".clip-desc").textContent;
      monitor.classList.remove("is-swap");
      void monitor.offsetWidth;
      monitor.classList.add("is-swap");
    }

    function place() {
      var i = Math.min(clips.length - 1, Math.floor(pos / STEP));
      var f = (pos - i * STEP) / STEP;
      var tl = timeline.getBoundingClientRect();
      var cr = clips[i].getBoundingClientRect();
      var x = cr.left - tl.left + cr.width * f;
      head.style.transform = "translateX(" + x.toFixed(1) + "px)";
      var secs = (pos / TOTAL) * 15;
      tc.textContent = "00:" + (secs < 10 ? "0" : "") + secs.toFixed(0);
      show(i);
    }

    function frame(now) {
      if (!paused) pos = (pos + (now - last)) % TOTAL;
      last = now;
      place();
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : null;
    }
    function run() {
      if (raf !== null || reduce) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function jump(i) {
      pos = i * STEP + 1;
      active = -1;
      place();
    }

    clips.forEach(function (c, i) {
      c.addEventListener("click", function () {
        jump(i);
        if (!reduce) burstAt(c.querySelector(".clip-num"), { count: 7, dist: 18, size: 4, colors: ["#E9E2D0", "#8F3F23"] });
      });
      c.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jump(i);
        }
      });
      c.addEventListener("focus", function () { paused = true; jump(i); });
      c.addEventListener("blur", function () { paused = false; });
    });
    list.addEventListener("pointerenter", function () { paused = finePointer; });
    list.addEventListener("pointerleave", function () { paused = false; });

    show(0);
    place();
    window.addEventListener("resize", place);
    document.addEventListener("sa:lang", function () {
      var i = active;
      active = -1;
      show(i < 0 ? 0 : i);
    });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) run();
      }, { threshold: 0.25 }).observe(editor);
    } else {
      visible = true;
      run();
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden && visible) run(); });
  }

  /* ---------------- Language switches ---------------- */

  document.addEventListener("sa:lang", function () {
    // i18n just replaced the headline's text node; re-split without animating.
    if (title && titleText && !titleText.querySelector(".ch")) {
      splitTitle().forEach(function (c) { c.classList.add("is-on"); });
      finishTitle();
    }
    reels.forEach(function (R) { R.restartCaptions(); });
  });

  /* ---------------- Boot ---------------- */

  function boot() {
    prepareHero();
    document.querySelectorAll(".reel").forEach(function (fig) {
      var R = createReel(fig);
      if (fig.id === "hero-reel") heroReel = R;
      else R.arm();
    });
    initTilt();
    initSpotlight();
    initNavDot();
    initMenuReplay();
    initStats();
    initSections();
    initEditor();

    var started = false;
    function start() {
      if (started) return;
      started = true;
      playHero();
    }
    if (document.getElementById("loader")) {
      document.addEventListener("sa:reveal", start, { once: true });
      setTimeout(start, 5000);
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
