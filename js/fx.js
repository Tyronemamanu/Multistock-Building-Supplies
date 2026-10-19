/* ==========================================================================
   Multistock Building Resources — advanced layer
   Hero slideshow, product catalogue filter + search, card tilt, cursor
   spotlight and staged product reveals. Runs after site.js and
   never hides anything it cannot show again.
   Animation: Motion (motion.dev), vendored at js/motion.min.js
   ========================================================================== */
(function () {
  'use strict';

  var M = window.Motion || {};
  var animate = M.animate;
  var stagger = M.stagger;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasMotion = typeof animate === 'function' && !reduced;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EASE = [0.22, 1, 0.36, 1];

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Hero slideshow ----------------------------------------------------- */
  /* --- Hero video: loops for ever, pause button, progress line ----------- */
  function initHeroVideo() {
    var video = $('.hero-video');
    if (!video) return;
    var btn = $('.hero-pause'), bar = $('.hero-line') || btn;
    var userPaused = reduced;
    function start() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function sync() {
      if (!btn) return;
      btn.classList.toggle('is-paused', video.paused);
      btn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    }
    video.muted = true;
    if (reduced) video.pause(); else start();
    if (btn) btn.addEventListener('click', function () {
      userPaused = !video.paused;
      if (video.paused) start(); else video.pause();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('timeupdate', function () {
      if (bar && video.duration) bar.style.setProperty('--vp', (video.currentTime / video.duration).toFixed(3));
    });
    /* rest while the hero is off screen */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) video.pause();
          else if (!userPaused) start();
        });
      }).observe(video);
    }
    if (hasMotion) animate(video, { opacity: [0, 1] }, { duration: 1.4, ease: EASE });
    sync();
  }

  /* --- Motion: the hero video slowly zooms as the page scrolls ----------- */
  function initHeroZoom() {
    var video = $('.ho-vid .hero-video'), hero = $('.hero.is-over');
    if (!video || !hero || !hasMotion || typeof M.scroll !== 'function') return;
    M.scroll(animate(video, { scale: [1, 1.14] }, { ease: 'linear' }),
      { target: hero, offset: ['start start', 'end start'] });
  }

  /* --- Motion: spring press on buttons and tiles -------------------------- */
  function initSpringPress() {
    if (!hasMotion) return;
    $$('.btn, .filter-btn, .area-cell, .search-open').forEach(function (el) {
      el.addEventListener('pointerdown', function () {
        animate(el, { scale: 0.96 }, { type: 'spring', stiffness: 520, damping: 26 });
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (name) {
        el.addEventListener(name, function () {
          animate(el, { scale: 1 }, { type: 'spring', stiffness: 380, damping: 16 });
        });
      });
    });
  }

  function initHeroSlides() {
    var wrap = $('.hero-slides');
    if (!wrap) return;
    var slides = $$('img', wrap);
    var pips = $$('.hero-progress button');
    var count = $('.hero-count b');
    if (slides.length < 2) return;
    var HOLD = 6000, index = 0, timer = null;
    document.documentElement.style.setProperty('--slide-ms', HOLD + 'ms');
    if (hasMotion) wrap.classList.add('fx-wipe');

    function mark() {
      pips.forEach(function (p, k) {
        p.classList.remove('is-active');
        p.classList.toggle('is-done', k < index);
        if (k === index) { void p.offsetWidth; p.classList.add('is-active'); }
      });
      if (count) count.textContent = (index < 9 ? '0' : '') + (index + 1);
    }
    function show(i, dir) {
      var next = (i + slides.length) % slides.length;
      if (next === index) return;
      var prev = index;
      index = next;
      slides.forEach(function (s, k) {
        s.classList.toggle('is-active', k === next);
        s.classList.toggle('is-prev', k === prev);
      });
      if (hasMotion) {
        /* the new photo wipes across the old one */
        var from = dir < 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)';
        animate(slides[next], { clipPath: [from, 'inset(0% 0% 0% 0%)'] }, { duration: 1.25, ease: [0.76, 0, 0.24, 1] })
          .then(function () { if (index === next) slides[prev].classList.remove('is-prev'); });
      }
      mark();
    }
    function play() {
      window.clearInterval(timer);
      if (reduced) return;
      timer = window.setInterval(function () { show(index + 1, 1); }, HOLD);
    }
    pips.forEach(function (p, k) {
      p.addEventListener('click', function () { show(k, k < index ? -1 : 1); play(); });
    });
    var prevBtn = $('.hero-prev'), nextBtn = $('.hero-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1, -1); play(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1, 1); play(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearInterval(timer); else play();
    });
    mark();
    play();
  }

  /* --- Lazy backgrounds for long product lists --------------------------- */
  function initLazyBg() {
    var items = $$('[data-bg]');
    if (!items.length) return;
    function load(el) {
      el.style.backgroundImage = "url('" + el.getAttribute('data-bg') + "')";
      el.removeAttribute('data-bg');
    }
    if (!('IntersectionObserver' in window)) { items.forEach(load); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); load(e.target); }
      });
    }, { rootMargin: '1600px 0px' });
    items.forEach(function (el) { io.observe(el); });
    return function refresh() { $$('[data-bg]').forEach(function (el) { io.observe(el); }); };
  }

  /* --- Product cards: no reveal ---------------------------------------------
     The owner wants every product photo there straight away, so the boxes are
     never hidden waiting for a scroll animation. All a page's box photos are
     also fetched as soon as it opens, so nothing is still loading when a pill
     is pressed or the page is scrolled. --- */
  function initCardReveals() {
    $$('.colour-img').forEach(function (el) {
      var bg = (el.style.backgroundImage || '').replace(/^url\(["']?|["']?\)$/g, '');
      if (bg) { var im = new Image(); im.decoding = 'async'; im.src = bg; }
    });
  }

  /* --- Catalogue: category pills + live search ---------------------------- */
  function initCatalogue() {
    var grid = $('[data-catalogue]');
    if (!grid) return;
    var bar = $('.filter-bar');
    var search = $('.catalogue-search input');
    var countEl = $('.catalogue-count b');
    var empty = $('.catalogue-empty');
    var items = $$('.colour-swatch', grid);
    var cat = 'all', term = '';

    function apply(animated) {
      var shown = [];
      items.forEach(function (item) {
        var okCat = cat === 'all' || item.getAttribute('data-category') === cat;
        var okTerm = !term || (item.getAttribute('data-name') || '').indexOf(term) !== -1;
        var on = okCat && okTerm;
        item.classList.toggle('is-hidden', !on);
        if (on) { item.classList.add('is-in'); item.style.setProperty('--d', '0s'); shown.push(item); }
      });
      if (countEl) countEl.textContent = shown.length;
      if (empty) empty.classList.toggle('is-on', shown.length === 0);
    }

    if (bar) {
      $$('.filter-btn', bar).forEach(function (btn) {
        btn.addEventListener('click', function () {
          cat = btn.getAttribute('data-filter');
          $$('.filter-btn', bar).forEach(function (b) {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          if (history.replaceState) history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
          apply(true);
          var top = grid.getBoundingClientRect().top + window.pageYOffset - 190;
          if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        });
      });
      /* products.html#carpet opens with that pill selected */
      var want = (location.hash || '').slice(1);
      var pre = want ? $('.filter-btn[data-filter="' + want + '"]', bar) : null;
      if (pre) {
        cat = want;
        $$('.filter-btn', bar).forEach(function (b) { b.classList.toggle('is-active', b === pre); });
      }
    }
    if (search) {
      var t = null;
      search.addEventListener('input', function () {
        window.clearTimeout(t);
        t = window.setTimeout(function () { term = search.value.trim().toLowerCase(); apply(true); }, 120);
      });
    }
    apply(false);
  }

  /* --- 3D tilt with a sheen that follows the pointer ---------------------- */
  function initTilt() {
    if (!hasMotion || !finePointer) return;
    $$('.service-card, .feature, .ab-photo, .ab-stat, .ab-cta').forEach(function (el) {
      el.classList.add('tilt');
      var sheen = document.createElement('span');
      sheen.className = 'tilt-sheen';
      sheen.setAttribute('aria-hidden', 'true');
      el.appendChild(sheen);
      var max = el.classList.contains('feature') ? 5 : 7;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (px * 100) + '%');
        el.style.setProperty('--my', (py * 100) + '%');
        animate(el, { rotateX: (0.5 - py) * max, rotateY: (px - 0.5) * max, transformPerspective: 900 },
          { duration: 0.35, ease: EASE });
      });
      el.addEventListener('mouseleave', function () {
        animate(el, { rotateX: 0, rotateY: 0 }, { type: 'spring', stiffness: 180, damping: 16 });
      });
    });
  }

  /* --- Spotlight that follows the pointer across navy sections ------------ */
  function initSpotlight() {
    if (!finePointer || reduced) return;
    $$('.bg-ink, .site-footer, section[style*="--ink-soft"]').forEach(function (sec) {
      sec.classList.add('has-spot');
      var queued = false, x = 0, y = 0;
      sec.addEventListener('mousemove', function (e) {
        var r = sec.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          sec.style.setProperty('--sx', x + 'px');
          sec.style.setProperty('--sy', y + 'px');
        });
      });
      sec.addEventListener('mouseenter', function () { sec.classList.add('is-lit'); });
      sec.addEventListener('mouseleave', function () { sec.classList.remove('is-lit'); });
    });
  }

  /* --- products.html#carpet opens with that pill already chosen ----------- */
  function initFilterHash() {
    var bar = $('.filter-bar');
    if (!bar) return;
    var want = (location.hash || '').slice(1);
    var pre = want ? $('.filter-btn[data-filter="' + want + '"]', bar) : null;
    if (pre) pre.click();
    $$('.filter-btn', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var c = btn.getAttribute('data-filter');
        if (history.replaceState) history.replaceState(null, '', c === 'all' ? location.pathname : '#' + c);
      });
    });
  }

  /* --- About: pinned scroll scene -------------------------------------------
     The frame is sticky (CSS). As each statement reaches the middle of the
     screen it becomes the active one: its photo wipes in, the counter and
     rail advance, and its words light up one by one with the scroll. ------ */
  function initAboutScene() {
    var scene = $('.about-scene');
    if (!scene) return;
    var steps = $$('.as-step', scene);
    var photos = $$('.as-photos img', scene);
    var count = $('.as-index b', scene);
    var fill = $('.as-rail-fill', scene);
    var ghost = $('.as-ghost', scene);
    var scroll = M.scroll;
    var active = 0;

    function setActive(i) {
      if (i === active) return;
      photos.forEach(function (im, k) {
        im.classList.toggle('was-on', k === active);
        im.classList.toggle('is-on', k === i);
      });
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k <= i); });
      if (count) count.textContent = '0' + (i + 1);
      active = i;
    }

    /* which statement is nearest the middle of the screen */
    function pick() {
      var mid = window.innerHeight * 0.45, best = 0, bestD = Infinity;
      steps.forEach(function (s, k) {
        var r = s.getBoundingClientRect();
        var d = Math.abs((r.top + r.height / 2) - mid);
        if (d < bestD) { bestD = d; best = k; }
      });
      setActive(best);
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; pick(); });
    }, { passive: true });
    window.addEventListener('resize', pick);
    pick();

    if (reduced || typeof scroll !== 'function') return;

    /* words light up with the scroll */
    scene.classList.add('as-live');
    $$('.as-text', scene).forEach(function (el) {
      var hl = (el.getAttribute('data-hl') || '').split(/\s+/).filter(Boolean);
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      var spans = [];
      /* find where the highlighted phrase starts */
      var start = -1;
      for (var i = 0; hl.length && i <= words.length - hl.length; i++) {
        var ok = true;
        for (var j = 0; j < hl.length; j++) { if (words[i + j] !== hl[j]) { ok = false; break; } }
        if (ok) { start = i; break; }
      }
      words.forEach(function (w, i) {
        var sp = document.createElement('span');
        sp.className = 'w' + (start >= 0 && i >= start && i < start + hl.length ? ' hl' : '');
        sp.textContent = w;
        el.appendChild(sp);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        spans.push(sp);
      });
      try {
        var last = -1;
        scroll(function (p) {
          var n = Math.round(Math.min(1, Math.max(0, p)) * spans.length);
          if (n === last) return;
          last = n;
          for (var k = 0; k < spans.length; k++) spans[k].classList.toggle('lit', k < n);
        }, { target: el, offset: ['start 88%', 'end 48%'] });
      } catch (err) { scene.classList.remove('as-live'); }
    });

    /* rail fills, and the outlined numeral slides behind everything */
    try {
      var lastS = -1, lastG = null;
      scroll(function (p) {
        var s = Math.round(p * 1000) / 1000;
        if (fill && s !== lastS) { lastS = s; fill.style.transform = 'scaleY(' + s + ')'; }
      }, { target: $('.as-steps', scene), offset: ['start 70%', 'end 60%'] });
      scroll(function (p) {
        var g = Math.round((p - 0.5) * -16 * 10) / 10;
        if (ghost && g !== lastG) { lastG = g; ghost.style.transform = 'translate3d(' + g + '%,0,0)'; }
      }, { target: scene, offset: ['start end', 'end start'] });
    } catch (err) { /* static is fine */ }
  }

  /* --- About photo showcase: one large photo at a time. It advances on its
         own, pauses while the pointer is over it, and can be driven by the
         arrows, the thumbnails or a swipe. ---------------------------------- */
  function initCollage() {
    var wall = $('.ag-wall');
    if (!wall) return;
    /* photos further down a column are clipped, so native lazy-loading would
       leave blanks: fetch them all just before the wall scrolls into view */
    var imgs = $$('img', wall);
    function loadAll() { imgs.forEach(function (im) { im.loading = 'eager'; }); }
    if ('IntersectionObserver' in window) {
      var pre = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { loadAll(); pre.disconnect(); }
      }, { rootMargin: '900px 0px' });
      pre.observe(wall);
    }
    /* and in any case once the rest of the page has finished loading */
    if (document.readyState === 'complete') window.setTimeout(loadAll, 1200);
    else window.addEventListener('load', function () { window.setTimeout(loadAll, 1200); });
    if (!hasMotion) return;
    var SPEED = 24;   /* px per second */
    var anims = $$('.ag-track', wall).map(function (track, i) {
      var half = track.scrollHeight / 2;
      /* a plain transform runs on the compositor, so it stays smooth */
      return animate(track, { transform: i % 2 ? ['translateY(-50%)', 'translateY(0%)'] : ['translateY(0%)', 'translateY(-50%)'] },
        { duration: Math.max(20, half / SPEED), ease: 'linear', repeat: Infinity });
    });
    function rate(v) { anims.forEach(function (a) { a.speed = v; }); }
    wall.addEventListener('mouseenter', function () { rate(0.25); });
    wall.addEventListener('mouseleave', function () { rate(1); });
  }

  function boot() {
    initCollage();
    initAboutScene();
    initFilterHash();
    initHeroSlides();
    initHeroVideo();
    initLazyBg();
    initCatalogue();
    initCardReveals();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
