/* ==========================================================================
   Multistock Building Resources — site behaviour
   Animation: Motion (motion.dev) v13, vendored at js/motion.min.js
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var M = window.Motion || {};
  var animate = M.animate;
  var inView  = M.inView;
  var scroll  = M.scroll;
  var stagger = M.stagger;

  var reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasMotion = typeof animate === 'function' && !reduced;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EASE = [0.22, 1, 0.36, 1];

  /* One passive scroll listener for the whole site. Subscribers are called
     once per animation frame with the current offset, so nothing reads or
     writes layout more than once per frame. */
  var scrollSubs = [], scrollTicking = false;
  function runScrollSubs() {
    scrollTicking = false;
    var y = window.pageYOffset;
    for (var i = 0; i < scrollSubs.length; i++) scrollSubs[i](y);
  }
  function onScrollFrame(fn) {
    scrollSubs.push(fn);
    fn(window.pageYOffset);
    if (scrollSubs.length === 1) {
      window.addEventListener('scroll', function () {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(runScrollSubs);
      }, { passive: true });
    }
  }

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Split headings into masked words --------------------------------- */
  function splitWords(el) {
    if (el.dataset.split === 'done') return [];
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    var inners = [];
    words.forEach(function (word, i) {
      var mask = document.createElement('span');
      mask.className = 'word-mask';
      var inner = document.createElement('span');
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      inners.push(inner);
    });
    el.dataset.split = 'done';
    return inners;
  }

  function initHeadings() {
    if (!hasMotion || typeof inView !== 'function') return;
    $$('[data-split]').forEach(function (el) {
      var inners = splitWords(el);
      if (!inners.length) return;
      inners.forEach(function (i) { i.style.transform = 'translateY(105%)'; });
      el.style.opacity = 1;
      inView(el, function () {
        animate(inners, { y: ['105%', '0%'] },
          { duration: 0.78, delay: stagger ? stagger(0.035) : 0, ease: EASE });
      }, { amount: 0.1 });
    });
  }

  /* --- Reveal on scroll -------------------------------------------------- */
  function initReveals() {
    var items = $$('[data-reveal]');

    if (!hasMotion || typeof inView !== 'function') {
      items.forEach(function (el) { el.style.opacity = 1; });
      $$('[data-stagger] > *').forEach(function (el) { el.style.opacity = 1; });
      return;
    }

    items.forEach(function (el) {
      var kind = el.getAttribute('data-reveal') || 'up';
      var delay = parseFloat(el.getAttribute('data-delay') || 0);
      var from = { opacity: [0, 1] };
      if (kind === 'up')    from.y = [26, 0];
      if (kind === 'down')  from.y = [-20, 0];
      if (kind === 'left')  from.x = [-28, 0];
      if (kind === 'right') from.x = [28, 0];
      if (kind === 'scale') { from.scale = [0.965, 1]; from.y = [16, 0]; }

      inView(el, function () {
        animate(el, from, { duration: 0.68, delay: delay, ease: EASE });
      }, { amount: 0.18, margin: '0px 0px -8% 0px' });
    });

    $$('[data-stagger]').forEach(function (group) {
      var kids = $$(':scope > *', group);
      kids.forEach(function (k) { k.style.opacity = 0; });
      inView(group, function () {
        animate(kids, { opacity: [0, 1], y: [24, 0] },
          { duration: 0.66, delay: stagger ? stagger(0.06) : 0, ease: EASE });
      }, { amount: 0.12 });
    });
  }

  /* --- Clip-path wipe on feature imagery --------------------------------- */
  function initClipReveals() {
    if (!hasMotion || typeof inView !== 'function') return;
    var targets = $$('.split-media > img, .team-photo img, .checklist-media img');
    targets.forEach(function (img) {
      img.style.clipPath = 'inset(0 0 100% 0)';
      inView(img, function () {
        animate(img,
          { clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'], scale: [1.06, 1] },
          { duration: 0.85, ease: EASE });
      }, { amount: 0.15 });
    });
  }

  /* --- Stacked media: staged reveal with depth ---------------------------
     The two photos wipe up one after the other, the brass frame draws in
     behind them, the badge springs in last, and the pair drift at slightly
     different rates on scroll so the group reads as layered. ------------- */
  function initMediaStack() {
    var stacks = $$('.media-stack');
    if (!stacks.length) return;

    if (!hasMotion || typeof inView !== 'function') return;

    stacks.forEach(function (stack) {
      var imgs = $$('img', stack);
      var frame = stack.closest('.media-frame');
      var badge = frame ? $('.badge-float', frame) : null;
      if (!imgs.length) return;

      imgs.forEach(function (im) { im.style.clipPath = 'inset(0 0 100% 0)'; });
      if (frame) frame.classList.add('frame-armed');
      if (badge) badge.style.opacity = 0;

      inView(stack, function () {
        imgs.forEach(function (im, i) {
          animate(im,
            { clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'], scale: [1.14, 1] },
            { duration: 1.15, delay: i * 0.18, ease: EASE });
        });
        if (frame) frame.classList.add('frame-in');
        if (badge) {
          animate(badge, { opacity: [0, 1], scale: [0.78, 1], y: [16, 0] },
            { duration: 0.8, delay: 0.55, type: 'spring', stiffness: 240, damping: 17 });
        }
      }, { amount: 0.25 });

      if (typeof scroll === 'function') {
        try {
          var lastA = null, lastB = null;
          scroll(function (p) {
            var t = (p - 0.5) * 2;
            var a = Math.round(t * -14), b = Math.round(t * 20);
            if (a !== lastA) { lastA = a; imgs[0].style.translate = '0 ' + a + 'px'; }
            if (imgs[1] && b !== lastB) { lastB = b; imgs[1].style.translate = '0 ' + b + 'px'; }
          }, { target: stack, offset: ['start end', 'end start'] });
        } catch (err) { /* static is fine */ }
      }
    });
  }

  /* --- Header (always visible, condenses on scroll) ----------------------- */
  function initHeader() {
    var header = $('.site-header');
    if (!header) return;
    var solid = null;
    /* Home page: the hero stays on screen while its video plays, so the menu stays
       clear over it for that whole time and only turns solid once the hero has gone. */
    var heldHero = $('.hero-scrub');
    onScrollFrame(function (y) {
      var want = heldHero ? heldHero.getBoundingClientRect().bottom < header.offsetHeight : y > 40;
      if (want !== solid) { solid = want; header.classList.toggle('is-solid', want); }
    });
  }

  /* --- Scroll progress ---------------------------------------------------- */
  function initScrollProgress() {
    var bar = $('.scroll-progress');
    if (!bar) return;
    /* scrollHeight forces a synchronous layout, so it is cached and only
       refreshed when the document can actually have changed size. */
    var max = 1, last = -1;
    function measure() { max = document.documentElement.scrollHeight - window.innerHeight; }
    measure();
    onScrollFrame(function (y) {
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (Math.abs(p - last) < 0.0015) return;
      last = p;
      bar.style.transform = 'scaleX(' + p + ')';
    });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if (window.ResizeObserver) new ResizeObserver(measure).observe(document.body);
  }

  /* --- Mobile nav --------------------------------------------------------- */
  function initMobileNav() {
    var toggle = $('.nav-toggle');
    var drawer = $('.mobile-nav');
    if (!toggle || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle('is-open', open);
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open && hasMotion) {
        animate($$('.mobile-nav-links a', drawer), { opacity: [0, 1], y: [18, 0] },
          { duration: 0.55, delay: stagger ? stagger(0.05) : 0, ease: EASE });
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(!drawer.classList.contains('is-open'));
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && drawer.classList.contains('is-open')) setOpen(false);
    });
  }

  /* --- Hero parallax ------------------------------------------------------ */
  function initParallax() {
    if (!hasMotion || typeof scroll !== 'function') return;
    $$('[data-parallax]').forEach(function (el) {
      var depth = parseFloat(el.getAttribute('data-parallax')) || 12;
      // optional data-parallax-scale (default 1.1); 1 keeps a whole-photo banner from being enlarged
      var sc = parseFloat(el.getAttribute('data-parallax-scale')) || 1.1;
      var section = el.closest('.hero, .page-hero, .cta-band') || el.parentElement;
      try {
        var lastY = null;
        scroll(function (progress) {
          var yv = Math.round(progress * depth * 100) / 100;
          if (yv === lastY) return;
          lastY = yv;
          el.style.transform = 'translate3d(0,' + yv + '%,0) scale(' + sc + ')';
        }, { target: section, offset: ['start start', 'end start'] });
      } catch (err) { /* static image is an acceptable fallback */ }
    });
  }

  /* --- Magnetic buttons --------------------------------------------------- */
  function initMagnetic() {
    if (!hasMotion || !finePointer) return;
    $$('.btn, .quote-btn, .to-top').forEach(function (el) {
      var strength = el.classList.contains('btn') ? 0.22 : 0.3;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * strength;
        var y = (e.clientY - (r.top + r.height / 2)) * strength;
        animate(el, { x: x, y: y }, { duration: 0.4, ease: EASE });
      });
      el.addEventListener('mouseleave', function () {
        animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 220, damping: 18 });
      });
    });
  }

  /* --- Animated counters --------------------------------------------------- */
  function initCounters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;
    if (!hasMotion || typeof inView !== 'function') {
      nodes.forEach(function (n) {
        n.textContent = (n.getAttribute('data-prefix') || '') + n.getAttribute('data-count') + (n.getAttribute('data-suffix') || '');
      });
      return;
    }
    nodes.forEach(function (n) {
      var target = parseFloat(n.getAttribute('data-count'));
      var suffix = n.getAttribute('data-suffix') || '';
      var prefix = n.getAttribute('data-prefix') || '';
      /* the count starts at 1, not 0 (data-from can set another start) */
      var from = Math.min(target, parseFloat(n.getAttribute('data-from') || 1));
      n.textContent = prefix + from + suffix;
      inView(n, function () {
        animate(from, target, {
          duration: 1.3, ease: EASE,
          onUpdate: function (v) { n.textContent = prefix + Math.round(v) + suffix; }
        });
      }, { amount: 0.6 });
    });
  }

  /* --- Review row -----------------------------------------------------------------
     The reviews sit in a row that scrolls sideways and always stops on whole cards
     (CSS scroll snap). This adds the arrows, the "1–3 of 7" count and the progress
     line, and hides all three when every review already fits in view. Works for
     any number of cards; swiping on a phone or trackpad works without it. --- */
  function initReviewRow() {
    var wrap = $('.tm-slider');
    if (!wrap) return;
    var track = $('.tm-track', wrap), nav = $('.tm-nav', wrap);
    if (!track || !nav) return;
    var prev = $('.tm-prev', nav), next = $('.tm-next', nav), count = $('.tm-count', nav), bar = $('.tm-bar i', nav);
    var moving = false;

    function cards() { return $$('.tm-card', track); }
    function step() { var c = cards(); return c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : track.clientWidth; }
    function perView() { return Math.max(1, Math.round(track.clientWidth / step())); }
    function index() { return Math.round(track.scrollLeft / step()); }

    function update() {
      var n = cards().length, p = perView(), i = Math.min(index(), Math.max(0, n - p));
      nav.hidden = n <= p;
      if (nav.hidden) return;
      prev.disabled = i <= 0;
      next.disabled = i >= n - p;
      count.textContent = (i + 1) + (p > 1 ? '\u2013' + Math.min(n, i + p) : '') + ' of ' + n;
      bar.style.width = (p / n * 100) + '%';
      bar.style.transform = 'translateX(' + (i / p * 100) + '%)';
    }

    function go(dir) {
      if (moving) return;
      var n = cards().length, p = perView();
      var to = Math.min(Math.max(index() + dir, 0), Math.max(0, n - p)) * step();
      if (!hasMotion) { track.scrollLeft = to; update(); return; }
      moving = true;
      track.style.scrollSnapType = 'none';            /* snap would fight the glide */
      animate(track.scrollLeft, to, {
        duration: 0.55, ease: EASE,
        onUpdate: function (v) { track.scrollLeft = v; }
      });
      window.setTimeout(function () { track.scrollLeft = to; track.style.scrollSnapType = ''; moving = false; update(); }, 600);
    }

    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking || moving) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* --- "The difference" line -----------------------------------------------------
     Plays once, the first time the row scrolls into view: the first marker
     appears, the line draws across to the second, then on to the third, each
     marker and its wording arriving as the line reaches it. Without Motion
     (or with reduced motion) nothing is hidden and nothing moves. --- */
  function initTrack() {
    var row = $('.track-row');
    if (!row || !hasMotion || typeof inView !== 'function') return;
    var line = $('.track-line', row);
    var items = $$('.track-list li', row);
    if (!line || !items.length) return;
    var vertical = window.matchMedia('(max-width: 700px)').matches;
    var STEP = 0.55;                         /* seconds for the line to travel between two markers */

    line.style.transform = vertical ? 'scaleY(0)' : 'scaleX(0)';
    items.forEach(function (li) {
      var node = $('.track-node', li);
      node.style.opacity = 0;
      node.style.transform = 'scale(.6)';
      $$('h3, p', li).forEach(function (t) { t.style.opacity = 0; t.style.transform = 'translateY(12px)'; });
    });

    inView(row, function () {
      animate(line, vertical ? { scaleY: [0, 1] } : { scaleX: [0, 1] },
        { duration: STEP * (items.length - 1), delay: 0.25, ease: 'linear' });
      items.forEach(function (li, i) {
        var at = i === 0 ? 0 : 0.25 + STEP * i - 0.1;   /* just as the line arrives */
        animate($('.track-node', li), { opacity: [0, 1], scale: [0.6, 1] }, { duration: 0.45, delay: at, ease: EASE });
        animate($$('h3, p', li), { opacity: [0, 1], y: [12, 0] },
          { duration: 0.5, delay: stagger ? stagger(0.07, { startDelay: at + 0.12 }) : at + 0.12, ease: EASE });
      });
    }, { amount: 0.45 });
  }

  /* --- Process timeline ------------------------------------------------------ */
  function initProcess() {
    var wrap = $('.process');
    if (!wrap) return;
    var bar = $('.process-progress', wrap);
    var steps = $$('.process-step', wrap);

    if (!hasMotion || typeof scroll !== 'function') {
      steps.forEach(function (s) { s.classList.add('is-active'); });
      if (bar) bar.style.transform = 'scaleY(1)';
      return;
    }
    try {
      var lastScale = -1, activeCount = -1;
      scroll(function (progress) {
        /* scaleY is composited; setting height would force layout each frame */
        var s = Math.round(progress * 1000) / 1000;
        if (bar && s !== lastScale) { lastScale = s; bar.style.transform = 'scaleY(' + s + ')'; }
        var n = 0;
        for (var i = 0; i < steps.length; i++) {
          if (progress >= (i / steps.length) * 0.92) n++;
        }
        if (n !== activeCount) {
          activeCount = n;
          for (var k = 0; k < steps.length; k++) steps[k].classList.toggle('is-active', k < n);
        }
      }, { target: wrap, offset: ['start 72%', 'end 62%'] });
    } catch (err) {
      steps.forEach(function (s) { s.classList.add('is-active'); });
      if (bar) bar.style.transform = 'scaleY(1)';
    }
  }

  /* --- Accordion -------------------------------------------------------------- */
  function initAccordion() {
    $$('.acc-item').forEach(function (item) {
      var trigger = $('.acc-trigger', item);
      var panel = $('.acc-panel', item);
      var inner = $('.acc-panel-inner', item);
      if (!trigger || !panel || !inner) return;

      trigger.setAttribute('aria-expanded', 'false');

      trigger.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        var target = open ? inner.offsetHeight : 0;
        var from = panel.offsetHeight;
        function settle() { panel.style.height = open ? 'auto' : '0px'; }
        if (hasMotion) {
          panel.style.height = from + 'px';
          /* If the tab is hidden mid-click the animation never ticks, which
             would leave the panel collapsed while marked open. */
          var guard = window.setTimeout(settle, 700);
          animate(panel, { height: [from + 'px', target + 'px'] }, { duration: 0.5, ease: EASE })
            .then(function () { window.clearTimeout(guard); settle(); });
        } else {
          settle();
        }
      });
    });

    /* Keep an open panel correct when the viewport changes */
    window.addEventListener('resize', function () {
      $$('.acc-item.is-open .acc-panel').forEach(function (p) { p.style.height = 'auto'; });
    });
  }

  /* --- Portfolio filter --------------------------------------------------------- */
  function initFilter() {
    var bar = $('.filter-bar');
    var grid = $('.masonry');
    if (!bar || !grid) return;
    var items = $$('.masonry-item', grid);

    $$('.filter-btn', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filter');
        /* A bar with no "All" pill: pressing the chosen category again shows everything. */
        var clear = btn.classList.contains('is-active') && !$('.filter-btn[data-filter="all"]', bar);
        $$('.filter-btn', bar).forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        if (clear) {
          cat = 'all';
        } else {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
        }

        var shown = [];
        items.forEach(function (item) {
          var match = cat === 'all' || item.getAttribute('data-category') === cat;
          item.classList.toggle('is-hidden', !match);
          if (match) shown.push(item);
        });

        /* results are simply there: no fade, no delay */
        buildLightboxList();
      });
    });
  }

  /* --- Back button ----------------------------------------------------------------
     Returns to the page the visitor came from. If they did not come from another page
     of this site (a search result, a bookmark), the link's own address is used: the
     parent page. --- */
  function initBack() {
    /* Which page did the visitor come from? document.referrer is empty when the site is opened
       straight from the computer (file://) and on some browsers, so the site also keeps the
       last page it showed in sessionStorage. */
    var here = location.href.split('#')[0], from = document.referrer || '';
    try {
      var last = sessionStorage.getItem('ms-current') || '';
      if (!from && last) from = last;
      sessionStorage.setItem('ms-current', here);
    } catch (err) {}
    $$('[data-back]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var same = false;
        try {
          var f = new URL(from, location.href);
          same = !!from && f.protocol === location.protocol && f.host === location.host && f.href.split('#')[0] !== here;
        } catch (err) {}
        if (same && window.history.length > 1) { e.preventDefault(); window.history.back(); }
      });
    });
    /* keep "the page shown last" right when a page comes back from the back/forward cache */
    window.addEventListener('pageshow', function () { try { sessionStorage.setItem('ms-current', here); } catch (err) {} });
  }

  /* --- Banner slideshow (Tiles) ---------------------------------------------------
     Parallax push: the next photo glides in from the right inside its frame while the
     picture itself travels more slowly (so it seems to emerge with depth), the current
     photo slides partly away to the left and dims, with a soft shadow between them.
     Each photo then settles with a very slow zoom. No mouse movement. Swipe on phones.
     Pauses off screen / hidden tab; reduced motion = plain cross-fade. --- */
  function initHeroSlides() {
    var box = $('[data-slides]');
    if (!box) return;
    var imgs = $$('.banner-slide', box);
    if (imgs.length < 2) return;
    var hero = box.closest('.page-hero');
    var HOLD = 5.6, TRANS = 1.35, EASE = [0.77, 0, 0.18, 1];
    var cur = 0, timer = null, busy = false, paused = false, visible = true, settle = null;

    // each photo sits in its own frame, so the frame and the picture can move separately
    var frames = imgs.map(function (img, i) {
      var f = document.createElement('div');
      f.className = 'banner-frame' + (i === 0 ? ' is-active' : '');
      img.parentNode.insertBefore(f, img); f.appendChild(img);
      img.classList.add('is-active');
      return f;
    });
    function stop(a) { if (a) { try { a.stop(); } catch (e) {} } }
    function settleIn(i) {
      stop(settle);
      if (!hasMotion) return;
      settle = animate(imgs[i], { scale: [1.07, 1] }, { duration: HOLD + TRANS + 1, ease: [0.25, 0.1, 0.25, 1] });
    }
    function schedule() {
      clearTimeout(timer);
      if (paused || !visible) return;
      timer = setTimeout(function () { go((cur + 1) % frames.length); }, HOLD * 1000);
    }
    function go(n, dir) {
      if (busy || n === cur) return;
      busy = true; clearTimeout(timer);
      dir = dir || 1;
      var fa = frames[cur], fb = frames[n], ia = imgs[cur], ib = imgs[n];
      frames.forEach(function (f) { f.style.zIndex = ''; });
      fa.style.zIndex = 1; fb.style.zIndex = 2;
      fb.classList.add('is-active', 'is-entering');
      var ended = false;
      function done() {
        if (ended) return; ended = true;
        fa.classList.remove('is-active');
        fa.style.transform = ''; ia.style.filter = ''; ia.style.transform = '';
        fb.classList.remove('is-entering'); fb.style.transform = ''; fb.style.zIndex = 1;
        cur = n; busy = false; schedule();
      }
      if (!hasMotion) {
        fb.style.transition = fa.style.transition = 'opacity 1s ease';
        fb.style.opacity = '1'; fa.style.opacity = '0';
        return setTimeout(function () { fa.style.opacity = ''; fb.style.opacity = ''; done(); }, 1050);
      }
      stop(settle);
      animate(fb, { x: [dir * 100 + '%', '0%'] }, { duration: TRANS, ease: EASE });
      animate(ib, { x: [dir * -55 + '%', '0%'], scale: [1.14, 1.07] }, { duration: TRANS, ease: EASE });
      animate(fa, { x: ['0%', dir * -32 + '%'] }, { duration: TRANS, ease: EASE });
      animate(ia, { filter: ['brightness(1)', 'brightness(.42)'] }, { duration: TRANS, ease: EASE });
      setTimeout(function () { settleIn(n); }, TRANS * 1000 - 20);
      setTimeout(done, TRANS * 1000 + 40);
    }
    function step(d) { go((cur + d + frames.length) % frames.length, d); }

    // swipe on touch screens
    var sx = null;
    hero.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') sx = e.clientX; }, { passive: true });
    hero.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener('visibilitychange', function () { paused = document.hidden; if (paused) clearTimeout(timer); else if (!busy) schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (!visible) clearTimeout(timer); else if (!busy) schedule(); }).observe(hero);
    }
    frames[0].style.zIndex = 1;
    settleIn(0); schedule();
  }

  /* --- Gallery videos: silent preview in view, progress line, click for the film with sound --- */
  function initGalleryVideos() {
    var wrap = $('.gallery-videos');
    if (!wrap) return;
    var modal = $('.gv-modal'), mv = modal && modal.querySelector('video');
    $$('button.gv-item', wrap).forEach(function (card) {
      var v = card.querySelector('video'), bar = card.querySelector('.gv-bar i');
      if (!v) return;
      v.addEventListener('timeupdate', function () { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
      if ('IntersectionObserver' in window && !reduced) {
        new IntersectionObserver(function (es) { es[0].isIntersecting ? v.play().catch(function () {}) : v.pause(); }, { threshold: .4 }).observe(card);
      }
      card.addEventListener('click', function () {
        if (!modal) return;
        mv.src = card.getAttribute('data-video'); modal.hidden = false; mv.currentTime = 0; mv.play().catch(function () {});
        if (hasMotion) animate(mv, { opacity: [0, 1], scale: [.96, 1] }, { duration: .45, ease: [0.22, 1, 0.36, 1] });
      });
    });
    function close() { if (!modal) return; mv.pause(); mv.removeAttribute('src'); mv.load(); modal.hidden = true; }
    if (modal) {
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.gv-close')) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
    }
    if (hasMotion && typeof inView === 'function') {
      var cards = $$('.gv-item', wrap);
      cards.forEach(function (c) { c.style.opacity = 0; });
      inView(wrap, function () {
        cards.forEach(function (c, i) { animate(c, { opacity: [0, 1], y: [28, 0] }, { duration: .8, delay: i * .12, ease: [0.22, 1, 0.36, 1] }); });
      }, { amount: .25 });
    }
  }

  /* --- Return to the same spot -------------------------------------------------
     Going Back (the Back button or the browser's back arrow) should land where the
     visitor was, not at the top. The browser's own restore can miss on these pages
     (photos and reveal effects are still settling when it runs), so the position is
     kept per page in sessionStorage and put back once the page has its full height. --- */
  function initReturnSpot() {
    var key = 'ms-scroll:' + location.pathname;
    function save() { try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch (err) {} }
    window.addEventListener('pagehide', save);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && !a.hash) save();
    }, true);
    var nav = null;
    try { nav = performance.getEntriesByType('navigation')[0]; } catch (err) {}
    var isBack = nav ? nav.type === 'back_forward' : (performance.navigation && performance.navigation.type === 2);
    if (!isBack || location.hash) return;
    var y = null;
    try { y = parseInt(sessionStorage.getItem(key), 10); } catch (err) {}
    if (!y || y < 1) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var html = document.documentElement, done = false, tries = 0;
    function go() {
      if (done) return;
      var prev = html.style.scrollBehavior; html.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      html.style.scrollBehavior = prev;
      if (Math.abs(window.scrollY - y) < 4 || ++tries > 12) done = true;
    }
    go();
    requestAnimationFrame(go);
    window.addEventListener('load', go);
    [120, 300, 600, 1000, 1600].forEach(function (t) { window.setTimeout(go, t); });
    /* stop once the visitor scrolls themselves */
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { done = true; }, { once: true, passive: true }); });
  }

  /* --- Range pages: category pills -----------------------------------------------
     A centred row of pills under the range heading. Whatever carries a type on the
     page (a product-family group on Accessories, a single box elsewhere) is shown
     or hidden at once: no delay, no stagger. --- */
  function initRangeNav() {
    var bar = $('.range-nav');
    if (!bar) return;
    var items = $$('[data-category]', bar.parentNode);
    var btns = $$('.filter-btn', bar);
    function boxes(el) { return el.classList.contains('colour-swatch') ? [el] : $$('.colour-swatch', el); }

    /* Counts are read from the page, so they stay right as products are added */
    btns.forEach(function (b) {
      var cat = b.getAttribute('data-filter'), n = 0;
      items.forEach(function (el) {
        if (cat === 'all' || el.getAttribute('data-category') === cat) n += boxes(el).length;
      });
      var count = $('.filter-count', b);
      if (count) count.textContent = n;
    });

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filter');
        /* A bar with no "All" pill: pressing the chosen type again shows everything. */
        var clear = btn.classList.contains('is-active') && !$('.filter-btn[data-filter="all"]', bar);
        if (clear) cat = 'all';
        btns.forEach(function (b) {
          var on = b === btn && !clear;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        var groups = [];
        items.forEach(function (el) {
          var match = cat === 'all' || el.getAttribute('data-category') === cat;
          el.classList.toggle('is-hidden', !match);
          el.classList.remove('is-last');
          if (!match) return;
          if (el.classList.contains('range-group')) groups.push(el);
          /* boxes normally wait for their scroll reveal; the ones just brought back are simply there */
          boxes(el).forEach(function (c) { c.classList.add('is-in', 'is-now'); });
        });
        if (groups.length) groups[groups.length - 1].classList.add('is-last');
      });
    });
  }

  /* --- Lightbox ------------------------------------------------------------------
     One viewer for the gallery and every product range. A "set" is the list
     of images the arrows move through: the visible gallery tiles, the plain
     product cards on a page, or the photos inside one multi-image card. --- */
  var lbSet = [], lbIndex = 0, lbOpen = null;

  function buildLightboxList() { /* sets are built at click time */ }

  function captionOf(el) {
    var fig = el.closest('figure, .service-card');
    var cap = fig ? $('figcaption, h3', fig) : null;
    var name = cap ? ($('.swatch-name', cap) || cap) : null;
    return name ? name.textContent.trim() : '';
  }

  function initLightbox() {
    var box = $('.lightbox');
    if (!box) return;
    var img = $('.lightbox-figure img', box);
    var title = $('.lightbox-meta strong', box);
    var cat = $('.lightbox-meta em', box);
    var counter = $('.lightbox-counter', box);
    var strip = $('.lightbox-strip', box);
    var lastFocus = null;

    function renderStrip() {
      if (!strip) return;
      strip.innerHTML = '';
      if (lbSet.length < 2) return;
      lbSet.forEach(function (item, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'View image ' + (i + 1));
        var t = document.createElement('img');
        t.src = item.thumb || item.full;
        t.alt = '';
        t.loading = 'lazy';
        b.appendChild(t);
        b.addEventListener('click', function (e) { e.stopPropagation(); show(i); });
        strip.appendChild(b);
      });
    }

    function markStrip() {
      if (!strip) return;
      $$('button', strip).forEach(function (b, i) { b.classList.toggle('is-active', i === lbIndex); });
      var active = strip.children[lbIndex];
      if (active && active.scrollIntoView) {
        active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    }

    function show(i) {
      if (!lbSet.length) return;
      lbIndex = (i + lbSet.length) % lbSet.length;
      var item = lbSet[lbIndex];
      img.src = item.full;
      img.alt = item.title || '';
      if (title) title.textContent = item.title || '';
      if (cat) cat.textContent = item.label || '';
      if (counter) counter.textContent = lbSet.length > 1 ? (lbIndex + 1) + ' / ' + lbSet.length : '';
      markStrip();
      if (hasMotion) animate(img, { opacity: [0, 1], scale: [0.985, 1] }, { duration: 0.45, ease: EASE });
    }

    function open(set, i) {
      if (!set.length) return;
      lastFocus = document.activeElement;
      lbSet = set;
      renderStrip();
      show(i < 0 ? 0 : i);
      box.classList.add('is-open');
      box.classList.toggle('is-single', set.length < 2);
      document.body.style.overflow = 'hidden';
      $('.lightbox-close', box).focus();
    }
    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    lbOpen = open;

    /* Gallery tiles */
    $$('.masonry-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var visible = $$('.masonry-item').filter(function (m) { return !m.classList.contains('is-hidden'); });
        var set = visible.map(function (m) {
          return {
            full: m.getAttribute('data-full') || $('img', m).src,
            thumb: $('img', m).getAttribute('src'),
            title: m.getAttribute('data-title') || '',
            label: m.getAttribute('data-label') || ''
          };
        });
        open(set, visible.indexOf(item));
      });
    });

    /* Plain product cards: the arrows move through the other plain cards */
    var plain = $$('.colour-img[data-full]:not(.swatch-carousel)');
    plain.forEach(function (el) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'Enlarge ' + (captionOf(el) || 'image'));
      function go() {
        var shown = plain.filter(function (p) { return !p.closest('.is-hidden'); });
        var set = shown.map(function (p) {
          var bg = p.getAttribute('data-bg') || (p.style.backgroundImage || '').replace(/^url\(["']?|["']?\)$/g, '');
          var fig = p.closest('figure');
          return { full: p.getAttribute('data-full'), thumb: bg || p.getAttribute('data-full'), title: captionOf(p), label: fig ? (fig.getAttribute('data-label') || '') : '' };
        });
        open(set, shown.indexOf(el));
      }
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    $('.lightbox-close', box).addEventListener('click', close);
    $('.lightbox-prev', box).addEventListener('click', function (e) { e.stopPropagation(); show(lbIndex - 1); });
    $('.lightbox-next', box).addEventListener('click', function (e) { e.stopPropagation(); show(lbIndex + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(lbIndex - 1);
      if (e.key === 'ArrowRight') show(lbIndex + 1);
      if (e.key === 'Tab') {
        var focusables = $$('button', box).filter(function (b) { return b.offsetParent !== null; });
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var startX = null;
    box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(lbIndex + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* --- Multi-image product cards ---------------------------------------------
     Arrows flip through the photos inside one card; opening the card shows
     only that card's photos in the viewer. ------------------------------- */
  function initCarousels() {
    $$('.swatch-carousel').forEach(function (car) {
      var fulls = (car.getAttribute('data-fulls') || '').split(',').filter(Boolean);
      var thumbs = (car.getAttribute('data-thumbs') || '').split(',').filter(Boolean);
      if (fulls.length < 2) return;
      var idx = 0;
      var count = document.createElement('span');
      count.className = 'carousel-count';
      count.setAttribute('aria-hidden', 'true');
      car.appendChild(count);

      function render(animated) {
        car.style.backgroundImage = "url('" + (thumbs[idx] || fulls[idx]) + "')";
        car.setAttribute('data-full', fulls[idx]);
        count.textContent = (idx + 1) + ' / ' + fulls.length;
        if (animated && hasMotion) animate(car, { opacity: [0.55, 1] }, { duration: 0.4, ease: EASE });
      }
      function move(step) { idx = (idx + step + fulls.length) % fulls.length; render(true); }

      var prev = $('.carousel-prev', car), next = $('.carousel-next', car);
      if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); move(-1); });
      if (next) next.addEventListener('click', function (e) { e.stopPropagation(); move(1); });

      car.addEventListener('click', function () {
        if (!lbOpen) return;
        var name = captionOf(car);
        lbOpen(fulls.map(function (f, i) { return { full: f, thumb: thumbs[i] || f, title: name, label: '' }; }), idx);
      });

      var sx = null;
      car.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      car.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) { e.preventDefault(); move(dx < 0 ? 1 : -1); }
        sx = null;
      });
      render(false);
    });
  }

  /* --- Single product page: thumbnail rail ------------------------------------ */
  function initProductGallery() {
    var main = $('.product-main-img');
    if (!main) return;
    var thumbs = $$('.product-thumb');
    var name = ($('h1') || {}).textContent || '';
    var cur = 0;
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        cur = i;
        thumbs.forEach(function (x) { x.classList.toggle('active', x === t); });
        main.style.backgroundImage = "url('" + t.getAttribute('data-img') + "')";
      });
    });
    main.addEventListener('click', function () {
      if (!lbOpen) return;
      lbOpen(thumbs.map(function (t) { var u = t.getAttribute('data-img'); return { full: u, thumb: u, title: name.trim(), label: '' }; }), cur);
    });
  }

  /* --- Reviews: 3D coverflow ---------------------------------------------
     The active card sits front and centre, its neighbours sit behind and
     turned away. Arrows rotate the set; a side card can be clicked to
     bring it forward. ---------------------------------------------------- */
  function initQuotes() {
    var wrap = $('.reviews');
    if (!wrap) return;
    var stage = $('.review-stage', wrap);
    var cards = $$('.review-card', wrap);
    if (!cards.length) return;

    var nav = $('.quote-nav');
    var countEl = nav ? $('.quote-count b', nav) : null;
    /* No autoplay: reviews only move when the reader moves them. */
    var index = 0, dragFrom = null;
    var n = cards.length;

    function pad(v) { return (v < 10 ? '0' : '') + v; }

    /* shortest signed distance from the active card, so the set wraps */
    function offsetOf(i) {
      var d = i - index;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    }

    function place(animated) {
      var narrow = window.matchMedia('(max-width: 680px)').matches;
      var shiftX = narrow ? 40 : 72;      /* % of card width */

      cards.forEach(function (card, i) {
        var d = offsetOf(i);
        var far = Math.abs(d) > 1;
        /* flat transforms only — no rotateY or translateZ, so an
           off-centre card can never pick up a perspective skew */
        /* cards beyond the two neighbours park behind them rather than
           flying off sideways, which would widen the page */
        var dPos = d < -1 ? -1 : (d > 1 ? 1 : d);
        var target = {
          x: (-50 + dPos * shiftX) + '%',
          scale: d === 0 ? 1 : 0.8,
          opacity: far ? 0 : (d === 0 ? 1 : 0.5)
        };
        card.style.zIndex = String(10 - Math.abs(d));
        card.classList.toggle('is-active', d === 0);
        card.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
        card.style.pointerEvents = far ? 'none' : 'auto';

        if (animated && hasMotion) {
          animate(card, target, { duration: 0.78, ease: [0.3, 0.9, 0.25, 1] });
        } else {
          card.style.transform = 'translateX(' + target.x + ') scale(' + target.scale + ')';
          card.style.opacity = target.opacity;
        }
      });
      if (countEl) countEl.textContent = pad(index + 1);
    }

    function go(next) {
      index = (next + n) % n;
      place(true);
    }

    function step(next) { go(next); }

    var prev = $('.quote-prev'), next = $('.quote-next');
    if (prev) prev.addEventListener('click', function () { step(index - 1); });
    if (next) next.addEventListener('click', function () { step(index + 1); });

    /* click a neighbouring card to bring it to the front */
    cards.forEach(function (card, i) {
      card.addEventListener('click', function () {
        if (offsetOf(i) !== 0) step(i);
      });
    });

    if (nav) nav.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(index + 1); }
    });

    wrap.addEventListener('touchstart', function (e) { dragFrom = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', function (e) {
      if (dragFrom === null) return;
      var dx = e.changedTouches[0].clientX - dragFrom;
      if (Math.abs(dx) > 45) step(index + (dx < 0 ? 1 : -1));
      dragFrom = null;
    });

    /* keep the stage as tall as the tallest card */
    function fitStage() {
      if (!stage) return;
      var tallest = 0;
      cards.forEach(function (c) { tallest = Math.max(tallest, c.scrollHeight); });
      if (tallest) stage.style.height = tallest + 'px';
    }

    place(false);
    fitStage();
    window.addEventListener('resize', function () { fitStage(); place(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStage);
    window.addEventListener('load', fitStage);
  }

  /* --- Back to top + mobile CTA ---------------------------------------------------- */
  function initFloaters() {
    var top = $('.to-top');
    var cta = $('.mobile-cta');
    if (top) {
      top.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    }
    var shownTop = null, shownCta = null;
    onScrollFrame(function (y) {
      var a = y > 900, b = y > 600;
      if (top && a !== shownTop) { shownTop = a; top.classList.toggle('is-visible', a); }
      if (cta && b !== shownCta) { shownCta = b; cta.classList.toggle('is-visible', b); }
    });
  }

  /* --- Quote form (delivered through Formspree) ------------------------------------ */
  function initForm() {
    var form = $('#enquiry-form');
    if (!form) return;
    var status = $('.form-status', form);

    function validate() {
      var ok = true;
      $$('[required]', form).forEach(function (input) {
        var field = input.closest('.field');
        var valid = input.checkValidity() && input.value.trim() !== '';
        if (field) field.classList.toggle('has-error', !valid);
        if (!valid && ok) { input.focus(); ok = false; }
      });
      return ok;
    }

    $$('input, textarea, select', form).forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field && field.classList.contains('has-error') && input.value.trim() !== '') {
          field.classList.remove('has-error');
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;

      var submitBtn = $('[type="submit"]', form);
      var original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending&hellip;';
      status.className = 'form-status';

      fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error('Submission failed');
          status.className = 'form-status is-ok';
          status.innerHTML = '<strong>Thanks!</strong> Your request has been received &mdash; our team will be in touch shortly.';
          form.reset();
        })
        .catch(function () {
          status.className = 'form-status is-err';
          status.innerHTML = 'Sorry, something went wrong sending your request. Please email <a href="mailto:sales@multistock.com.au">sales@multistock.com.au</a> directly.';
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = original;
        });
    });
  }

  /* --- Map: fetch the Google embed only as it comes into range ----------- */
  function initMap() {
    var wrap = $('.map-embed');
    if (!wrap) return;
    /* The map iframe is normally already in the page (it starts loading with the page and marks
       itself loaded). The code below is only a fallback for a page without it. */
    if ($('iframe', wrap)) return;
    var src = wrap.getAttribute('data-map-src');
    if (!src) return;

    function load() {
      if (wrap.dataset.loaded) return;
      wrap.dataset.loaded = '1';
      var f = document.createElement('iframe');
      f.title = 'Map to Multistock Building Resources, 2/25 Grant Road, Somerville';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      f.addEventListener('load', function () { wrap.classList.add('is-loaded'); });
      f.src = src;
      wrap.insertBefore(f, wrap.firstChild);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          load();
        }
      }, { rootMargin: '600px 0px' });
      io.observe(wrap);
    } else {
      load();
    }

    /* Tapping the card loads the map rather than leaving the site */
    var ph = $('.map-placeholder', wrap);
    if (ph) ph.addEventListener('click', function (e) {
      if (!wrap.dataset.loaded) { e.preventDefault(); load(); }
    });
  }

  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }


  /* --- Safety net -------------------------------------------------------
     IntersectionObserver does not report an element that enters and leaves
     between two frames (a fast fling, Cmd+End, or an in-page anchor jump).
     This sweep guarantees nothing is ever left invisible: anything that has
     reached the viewport but is still hidden gets shown. ------------------ */
  function rescueHidden() {
    var vh = window.innerHeight;

    $$('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) return;
      if (parseFloat(getComputedStyle(el).opacity) > 0.95) return;
      el.style.opacity = 1;
      el.style.transform = 'none';
    });

    $$('[data-stagger] > *').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) return;
      if (parseFloat(getComputedStyle(el).opacity) > 0.95) return;
      el.style.opacity = 1;
      el.style.transform = 'none';
    });

    $$('.word-mask > span').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) return;
      var t = getComputedStyle(el).transform;
      if (t && t !== 'none' && t.indexOf('matrix(1, 0, 0, 1, 0, 0)') === -1) el.style.transform = 'none';
    });

    $$('.badge-float').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) return;
      if (parseFloat(getComputedStyle(el).opacity) > 0.95) return;
      el.style.opacity = 1;
      el.style.transform = 'none';
    });

    $$('.media-frame').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) return;
      el.classList.add('frame-in');
    });

    $$('.split-media img, .media-stack img, .team-photo img').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) return;
      var c = el.style.clipPath;
      if (c && c.indexOf('100%') !== -1) {
        el.style.clipPath = 'inset(0 0 0% 0)';
        el.style.transform = 'none';
      }
    });
  }

  function initRescue() {
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        rescueHidden();
      });
    }
    /* One debounced timer. The previous version started a timeout on every
       scroll event, piling up hundreds of them during a single flick. */
    var debounce = null;
    window.addEventListener('scroll', function () {
      if (debounce) return;
      debounce = window.setTimeout(function () { debounce = null; schedule(); }, 700);
    }, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', function () { window.setTimeout(rescueHidden, 1800); });
    window.setTimeout(rescueHidden, 3500);
  }

  /* --- Boot --------------------------------------------------------------------------- */
  function boot() {
    initHeader();
    initScrollProgress();
    initMobileNav();
    initHeadings();
    initReveals();
    initClipReveals();
    initMediaStack();
    initParallax();
    initMagnetic();
    initCounters();
    initTrack();
    initReviewRow();
    initProcess();
    initAccordion();
    initFilter();
    initRangeNav();
    initBack();
    initReturnSpot();
    initHeroSlides();
    initGalleryVideos();
    initLightbox();
    initCarousels();
    initProductGallery();
    initQuotes();
    initFloaters();
    initForm();
    initMap();
    initYear();
    initRescue();

    /* Re-sync the header, progress bar and floating controls after the
       browser restores a scroll position (reload, bfcache, back/forward),
       which does not always emit a scroll event of its own. */
    function syncScrollState() { runScrollSubs(); }
    window.addEventListener('load', syncScrollState);
    window.addEventListener('pageshow', syncScrollState);
    window.setTimeout(syncScrollState, 400);
    window.setTimeout(syncScrollState, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
