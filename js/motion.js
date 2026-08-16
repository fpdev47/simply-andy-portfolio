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
    if (portrait) {
      withMotionClass([portrait], function (done) {
        animate(portrait, {
          opacity: [0, 1],
          y: [22, 0],
          scale: [0.97, 1],
          duration: 750,
          delay: 200,
          ease: "out(4)",
          onComplete: done
        });
      });
    }

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

    document.querySelectorAll(".process-card, .check-list").forEach(function (el) {
      onFirstIntersect(el, function () { reveal(el, { duration: 500 }); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
