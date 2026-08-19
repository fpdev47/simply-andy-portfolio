(function () {
  if (typeof anime === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var animate = anime.animate;
  var stagger = anime.stagger;
  if (typeof animate !== "function") return;

  function withMotionClass(list, fn) {
    list.forEach(function (el) { el.classList.add("motion-target"); });
    fn(function () {
      list.forEach(function (el) { el.classList.remove("motion-target"); });
    });
  }

  function reveal(targets, opts) {
    var nodeList = typeof targets === "string" ? document.querySelectorAll(targets) : targets;
    var list = Array.prototype.slice.call(nodeList && nodeList.length !== undefined ? nodeList : [nodeList]);
    if (!list.length) return;
    withMotionClass(list, function (done) {
      animate(list, Object.assign({
        opacity: [0, 1],
        y: [18, 0],
        duration: 550,
        ease: "out(3)",
        delay: stagger(70),
        onComplete: done
      }, opts));
    });
  }

  function onFirstIntersect(container, run) {
    if (!container || !("IntersectionObserver" in window)) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          run();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    io.observe(container);
  }

  function init() {
    // Focal moment: the hero entrance, the one sequence that earns authorship.
    var heroCopyItems = document.querySelectorAll(".hero-copy > *");
    if (heroCopyItems.length) {
      reveal(heroCopyItems, { duration: 700, ease: "out(4)", delay: stagger(90) });
    }
    var portrait = document.querySelector(".hero-portrait");
    var dots = document.querySelectorAll(".hero-portrait .dot");
    if (portrait) {
      // Keeps .motion-target for good: the portrait transitions into a permanent ambient float.
      portrait.classList.add("motion-target");
      animate(portrait, {
        opacity: [0, 1],
        y: [22, 0],
        scale: [0.97, 1],
        duration: 750,
        delay: 200,
        ease: "out(4)",
        onComplete: function () {
          animate(portrait, { y: [0, -8], duration: 3200, ease: "inOutSine", alternate: true, loop: true });
        }
      });
    }

    // Ambient float: slow, small, desynced loops on the decorative dots.
    var DOT_FLOATS = [
      { y: -10, x: 4, duration: 2600, delay: 0 },
      { y: -14, x: -6, duration: 3400, delay: 400 },
      { y: -8, x: 5, duration: 2900, delay: 900 },
      { y: -12, x: -4, duration: 3800, delay: 200 }
    ];
    dots.forEach(function (dot, i) {
      var cfg = DOT_FLOATS[i % DOT_FLOATS.length];
      dot.classList.add("motion-target");
      animate(dot, {
        y: cfg.y,
        x: cfg.x,
        duration: cfg.duration,
        delay: cfg.delay,
        ease: "inOutSine",
        alternate: true,
        loop: true
      });
    });

    // Mouse parallax on the hero. Writes the individual `translate` property so it
    // composes with the anime-driven `transform` instead of fighting it.
    (function initParallax() {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      if (!("translate" in document.documentElement.style)) return;
      var hero = document.querySelector(".hero");
      if (!hero || !portrait) return;

      var DOT_DEPTHS = [14, 10, 18, 12];
      var layers = [{ el: portrait, depth: 6 }];
      dots.forEach(function (dot, i) {
        layers.push({ el: dot, depth: DOT_DEPTHS[i % DOT_DEPTHS.length] });
      });

      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      function tick() {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        layers.forEach(function (l) {
          l.el.style.translate = (cx * l.depth).toFixed(2) + "px " + (cy * l.depth).toFixed(2) + "px";
        });
        raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tick) : null;
      }
      function schedule() { if (raf === null) raf = requestAnimationFrame(tick); }

      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        schedule();
      });
      hero.addEventListener("mouseleave", function () {
        tx = 0;
        ty = 0;
        schedule();
      });
    })();

    // Supporting states: quiet, single-material scroll reveals (same fade+rise idea).
    document.querySelectorAll(".section-title").forEach(function (el) {
      onFirstIntersect(el, function () { reveal(el, { duration: 500 }); });
    });

    var pillarList = document.querySelector(".pillar-list");
    if (pillarList) {
      onFirstIntersect(pillarList, function () {
        reveal(pillarList.querySelectorAll(".pillar-row"), { delay: stagger(80) });
      });
    }

    var reelsGrid = document.getElementById("portfolio-grid");
    if (reelsGrid) {
      onFirstIntersect(reelsGrid, function () {
        reveal(reelsGrid.querySelectorAll(".video-card"), { delay: stagger(45), y: [14, 0] });
      });
    }

    var numbersInner = document.querySelector(".numbers-inner");
    if (numbersInner) {
      onFirstIntersect(numbersInner, function () {
        reveal(numbersInner.querySelectorAll(".numbers-note, .text-link"), { delay: stagger(90) });
      });
    }

    var brandsRow = document.querySelector(".brands-row");
    if (brandsRow) {
      onFirstIntersect(brandsRow, function () {
        reveal(brandsRow.querySelectorAll(".brand-slot"), { delay: stagger(60) });
      });
    }

    document.querySelectorAll(".method-card").forEach(function (el) {
      onFirstIntersect(el, function () { reveal(el, { duration: 500 }); });
    });

    // Process stepper (design 3a): auto-advances with a linear "fill" during each
    // step's dwell, brief reset pass at the end of the cycle, hover pauses, click jumps.
    var stepper = document.getElementById("process-stepper");
    if (stepper) {
      var steps = Array.prototype.slice.call(stepper.querySelectorAll(".step"));
      var DWELL = 2600;
      var RESET = 420;
      var active = -1;
      var paused = false;
      var stepTimer = null;

      stepper.style.setProperty("--stepper-dwell", DWELL + "ms");

      var render = function () {
        steps.forEach(function (li, i) {
          li.classList.toggle("is-done", active > -1 && i < active);
          li.classList.toggle("is-active", i === active);
        });
      };
      var tick = function (delay) {
        stepTimer = setTimeout(function () {
          if (!paused) {
            active = active >= steps.length - 1 ? -1 : active + 1;
            render();
          }
          tick(!paused && active === -1 ? RESET : DWELL);
        }, delay);
      };
      var startCycle = function () {
        if (stepTimer !== null) return;
        stepper.classList.add("is-animated");
        active = 0;
        render();
        tick(DWELL);
      };
      var stopCycle = function () {
        if (stepTimer === null) return;
        clearTimeout(stepTimer);
        stepTimer = null;
        stepper.classList.remove("is-animated");
        active = -1;
        render();
      };

      stepper.addEventListener("mouseenter", function () { paused = true; });
      stepper.addEventListener("mouseleave", function () { paused = false; });
      steps.forEach(function (li, i) {
        li.addEventListener("click", function () {
          active = i;
          render();
        });
      });

      if ("IntersectionObserver" in window) {
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
