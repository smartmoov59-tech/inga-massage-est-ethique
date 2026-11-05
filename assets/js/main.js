/* Inga Massage Est’Éthique — mouvement & interactions
   GSAP + ScrollTrigger + Lenis (auto-hébergés). Aucune dépendance externe, aucun back-end. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const hasLibs = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animated = hasLibs && !reduce;
  const PHONE_SMS = '+33781891151';

  let lenis = null;
  const loaderEl = $('[data-loader]');

  if (animated) root.classList.add('anim');

  /* ------------------------------------------------------------------ utilitaires */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function splitText(el, mode) {
    if (!el || el.dataset.splitDone) return [];
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    const frag = document.createDocumentFragment();
    const parts = [];
    const makeWord = (text, cls) => {
      const w = document.createElement('span');
      w.className = ('w ' + cls).trim();
      w.setAttribute('aria-hidden', 'true');
      if (mode === 'chars') {
        Array.from(text).forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'c';
          c.textContent = ch;
          w.appendChild(c);
          parts.push(c);
        });
      } else {
        const wi = document.createElement('span');
        wi.className = 'wi';
        wi.textContent = text;
        w.appendChild(wi);
        parts.push(wi);
      }
      return w;
    };
    const walk = (node, cls) => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else frag.appendChild(makeWord(part, cls));
        });
      } else if (node.nodeType === 1) {
        if (node.classList.contains('visually-hidden')) { frag.appendChild(node.cloneNode(true)); return; }
        if (node.tagName === 'BR') { frag.appendChild(document.createElement('br')); return; }
        const next = (cls + (node.tagName === 'EM' ? ' is-em' : '')).trim();
        Array.from(node.childNodes).forEach((n) => walk(n, next));
      }
    };
    Array.from(el.childNodes).forEach((n) => walk(n, ''));
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.splitDone = '1';
    return parts;
  }

  function lavenderSVG(flip, seed) {
    const rnd = mulberry32(seed);
    const sprigs = [
      { x: 56, bend: -30, h: 360 },
      { x: 108, bend: 10, h: 420 },
      { x: 160, bend: 36, h: 330 },
    ];
    let out = '<svg viewBox="0 0 220 440" aria-hidden="true"><g' + (flip ? ' transform="translate(220,0) scale(-1,1)"' : '') + '>';
    sprigs.forEach((sp) => {
      const x0 = sp.x, y0 = 446, x1 = sp.x + sp.bend, y1 = 446 - sp.h;
      const cx = x0 - sp.bend * 0.45, cy = (y0 + y1) / 2;
      out += '<path d="M' + x0 + ' ' + y0 + ' Q' + cx + ' ' + cy + ' ' + x1 + ' ' + y1 + '" fill="none" stroke="#7d8656" stroke-width="2.4" stroke-linecap="round"/>';
      const n = 24;
      for (let i = 0; i < n; i++) {
        const t = 0.4 + (i / (n - 1)) * 0.6, mt = 1 - t;
        const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
        const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
        const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
        const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        const size = 7 + (1 - Math.abs(t - 0.72)) * 5;
        [-1, 1].forEach((side) => {
          const off = side * (4 + rnd() * 4);
          const rot = ang + side * (16 + rnd() * 16);
          out += '<ellipse cx="' + (px + off).toFixed(1) + '" cy="' + py.toFixed(1) + '" rx="' + (size * 0.46).toFixed(1) + '" ry="' + (size * 1.05).toFixed(1) + '" transform="rotate(' + rot.toFixed(1) + ' ' + (px + off).toFixed(1) + ' ' + py.toFixed(1) + ')" fill="' + (side > 0 ? '#8b72b8' : '#a891d3') + '" opacity="' + (0.8 + rnd() * 0.2).toFixed(2) + '"/>';
        });
      }
      out += '<ellipse cx="' + x1 + '" cy="' + (y1 - 5) + '" rx="3.4" ry="9" fill="#bba7e3"/>';
    });
    return out + '</g></svg>';
  }

  function scrollToEl(target, instant) {
    if (!target) return;
    const spacer = target.parentElement && target.parentElement.classList.contains('pin-spacer') ? target.parentElement : target;
    if (lenis) {
      lenis.scrollTo(spacer, { duration: instant ? 0 : 1.7, easing: (t) => 1 - Math.pow(1 - t, 4), offset: 0 });
    } else {
      spacer.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }
  window.IngaScrollTo = scrollToEl;

  /* ------------------------------------------------------------------ fonctions communes (avec ou sans animation) */
  function initCommon() {
    // Lavande du hero
    $$('[data-lavender]').forEach((el) => {
      el.innerHTML = lavenderSVG(el.dataset.lavender === 'r', el.dataset.lavender === 'r' ? 7 : 3);
    });

    // Horaires : jour courant
    const today = $('[data-hours] [data-day="' + new Date().getDay() + '"]');
    if (today) today.classList.add('is-today');

    // Carte Google Maps (chargée à l’approche)
    const iframe = $('iframe[data-src]');
    if (iframe) {
      const load = () => { if (iframe.dataset.src) { iframe.src = iframe.dataset.src; iframe.removeAttribute('data-src'); } };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { load(); io.disconnect(); } }, { rootMargin: '700px 0px' });
        io.observe(iframe);
      } else load();
    }

    // Vidéos d’ambiance : chargées à l’approche, en pause hors écran
    const vids = $$('[data-lazy-video]');
    if (vids.length && !reduce && !saveData && 'IntersectionObserver' in window) {
      const vio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting) {
            if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = 'auto'; }
            const p = v.play(); if (p && p.catch) p.catch(() => {});
          } else if (v.src) v.pause();
        });
      }, { rootMargin: '300px 0px' });
      vids.forEach((v) => vio.observe(v));
    }

    // Menu mobile
    const burger = $('.burger');
    const mmenu = $('[data-mmenu]');
    const setMenu = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      mmenu.classList.toggle('is-open', open);
      mmenu.setAttribute('aria-hidden', String(!open));
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      else document.body.style.overflow = open ? 'hidden' : '';
    };
    window.IngaCloseMenu = () => { if (mmenu.classList.contains('is-open')) setMenu(false); };
    burger.addEventListener('click', () => setMenu(!mmenu.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.IngaCloseMenu(); });

    // Ancres
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      window.IngaCloseMenu();
      setTimeout(() => scrollToEl(target), mmenu.classList.contains('is-open') ? 50 : 0);
    });

    // FAQ
    let faqTimer;
    $$('.qa').forEach((qa) => {
      const btn = $('button', qa);
      btn.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        $$('.qa.is-open').forEach((o) => { if (o !== qa) { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
        qa.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (animated) { clearTimeout(faqTimer); faqTimer = setTimeout(() => ScrollTrigger.refresh(), 800); }
      });
    });

    // Avis : carrousel
    const rail = $('[data-rev-rail]');
    if (rail) {
      const bar = $('[data-rev-bar]');
      const step = () => {
        const card = $('.rev', rail);
        return card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 24);
      };
      $('[data-rev-next]').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
      $('[data-rev-prev]').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
      const upd = () => {
        const max = rail.scrollWidth - rail.clientWidth;
        const p = max > 0 ? rail.scrollLeft / max : 0;
        bar.style.transform = 'scaleX(' + Math.max(0.08, p).toFixed(3) + ')';
      };
      rail.addEventListener('scroll', upd, { passive: true });
      upd();
      rail.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); rail.scrollBy({ left: step(), behavior: 'smooth' }); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: -step(), behavior: 'smooth' }); }
      });
      if (!reduce && 'IntersectionObserver' in window) {
        let paused = false, visible = false;
        const rio = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0.35 });
        rio.observe(rail);
        ['pointerenter', 'focusin', 'touchstart'].forEach((ev) => rail.addEventListener(ev, () => { paused = true; }, { passive: true }));
        ['pointerleave', 'focusout'].forEach((ev) => rail.addEventListener(ev, () => { paused = false; }));
        setInterval(() => {
          if (paused || !visible || document.hidden) return;
          const max = rail.scrollWidth - rail.clientWidth;
          if (rail.scrollLeft >= max - 6) rail.scrollTo({ left: 0, behavior: 'smooth' });
          else rail.scrollBy({ left: step(), behavior: 'smooth' });
        }, 5200);
      }
    }

    // Carte cadeau
    const gift = $('[data-gift]');
    if (gift) {
      gift.addEventListener('click', (e) => { if (!e.target.closest('a')) gift.classList.toggle('is-flipped'); });
      gift.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.target === gift) { e.preventDefault(); gift.classList.toggle('is-flipped'); } } });
      const g = $('[data-gift-sms]');
      if (g) g.href = 'sms:' + PHONE_SMS + '?&body=' + encodeURIComponent('Bonjour Inga, je souhaiterais offrir une carte cadeau (valable 6 mois). Pouvez-vous m’indiquer comment faire ? Merci !');
    }

    // Retour en haut
    const top = $('[data-top]');
    if (top) top.addEventListener('click', () => scrollToEl($('#accueil')));

    // Barre d’action mobile : visible après le hero, masquée sur la section de réservation
    const mbar = $('[data-mbar]');
    if (mbar && 'IntersectionObserver' in window) {
      let afterHero = false, inBook = false;
      const sync = () => mbar.classList.toggle('is-on', afterHero && !inBook);
      const hero = $('#accueil'), book = $('#reserver');
      new IntersectionObserver((es) => { afterHero = !es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(hero);
      new IntersectionObserver((es) => { inBook = es[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(book);
    }

    // Lightbox
    const dlg = $('[data-lightbox-dialog]');
    if (dlg) {
      const img = $('[data-lb-img]'), cap = $('[data-lb-cap]');
      const prev = $('[data-lb-prev]'), next = $('[data-lb-next]');
      const links = $$('[data-lightbox]');
      const groups = { g: [], c: [] };
      links.forEach((a) => {
        const key = a.closest('.gallery') ? 'g' : 'c';
        a._group = key;
        groups[key].push({ src: a.getAttribute('href'), cap: a.dataset.caption || '', alt: (a.querySelector('img') || {}).alt || a.dataset.caption || '' });
        a._idx = groups[key].length - 1;
      });
      let cur = 'g', idx = 0;
      const show = (i) => {
        const list = groups[cur];
        idx = (i + list.length) % list.length;
        img.src = list[idx].src; img.alt = list[idx].alt; cap.textContent = list[idx].cap;
        const multi = list.length > 1;
        prev.hidden = !multi; next.hidden = !multi;
      };
      const open = () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); if (lenis) lenis.stop(); };
      links.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); cur = a._group; show(a._idx); open(); }));
      $('[data-lb-close]').addEventListener('click', () => dlg.close());
      prev.addEventListener('click', () => show(idx - 1));
      next.addEventListener('click', () => show(idx + 1));
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { if (lenis) lenis.start(); });
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' && !next.hidden) show(idx + 1);
        if (e.key === 'ArrowLeft' && !prev.hidden) show(idx - 1);
      });
    }
  }

  /* ------------------------------------------------------------------ mode statique (mouvement réduit ou GSAP absent) */
  function initStatic() {
    if (loaderEl) loaderEl.remove();
    root.classList.add('is-ready');
    const header = $('[data-header]');
    const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const bar = $('[data-progress]');
    const thread = $('[data-thread-fill]');
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (thread) thread.style.transform = 'scaleY(' + p + ')';
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ mode animé */
  function initAnimated() {
    gsap.registerPlugin(ScrollTrigger);

    // Smooth scroll
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();

    // Découpage des titres
    const splits = new Map();
    $$('[data-split]').forEach((el) => splits.set(el, splitText(el, el.dataset.split)));
    const heroTitle = $('[data-split-intro]');
    const heroChars = splitText(heroTitle, 'chars');
    const giant = $('[data-footer-giant]');
    const giantChars = splitText(giant, 'chars');
    gsap.set(heroChars, { yPercent: 118 });
    gsap.set($$('[data-hero-in]'), { autoAlpha: 0, y: 34 });
    gsap.set($$('.hero__lav svg'), { yPercent: 45, autoAlpha: 0 });
    gsap.set($$('.hero__poster, .hero__video'), { scale: 1.35 });

    // Vidéo du hero (desktop & tablette, hors économie de données)
    const hv = $('[data-hero-video]');
    if (hv && !saveData && window.innerWidth >= 760) {
      hv.src = hv.dataset.src;
      hv.preload = 'auto';
      hv.addEventListener('playing', () => hv.classList.add('is-playing'), { once: true });
      const p = hv.play(); if (p && p.catch) p.catch(() => {});
    }

    /* ---- Préchargeur ---- */
    const paths = $$('.loader .draw');
    paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    gsap.set(paths, { fill: 'rgba(230,189,114,0)' });
    const count = $('[data-load-count]');
    const cnt = { v: 0 };
    const nameParts = $$('.loader__name span, .loader__name em');
    const loadTl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    loadTl
      .to(paths, { strokeDashoffset: 0, duration: 1.6, stagger: 0.2 }, 0)
      .to(paths, { fill: 'rgba(230,189,114,0.16)', duration: 0.9, ease: 'power1.out' }, 1.8)
      .fromTo(nameParts, { y: 34, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.16, ease: 'expo.out' }, 0.7)
      .to(cnt, { v: 100, duration: 2.5, ease: 'power1.inOut', onUpdate: () => { count.textContent = Math.round(cnt.v); } }, 0);

    const loadDone = new Promise((res) => loadTl.eventCallback('onComplete', res));
    const heroImg = $('.hero__poster');
    const assetsReady = Promise.race([
      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise((res) => { if (heroImg.complete) res(); else { heroImg.addEventListener('load', res); heroImg.addEventListener('error', res); } }),
      ]),
      new Promise((res) => setTimeout(res, 5000)),
    ]);

    Promise.all([loadDone, assetsReady]).then(() => {
      const ex = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: () => {
          if (loaderEl) loaderEl.remove();
          lenis.start();
          heroScroll();
          ScrollTrigger.refresh();
        },
      });
      ex.to('.loader__center', { y: -70, autoAlpha: 0, duration: 0.8, ease: 'power3.in' }, 0)
        .to('.loader__curtain i', { yPercent: -101, duration: 1.4, stagger: 0.09, ease: 'expo.inOut' }, 0.35)
        .to($$('.hero__poster, .hero__video'), { scale: 1.04, duration: 3.2, ease: 'power3.out' }, 0.45)
        .add(() => root.classList.add('is-ready'), 1.0)
        .to(heroChars, { yPercent: 0, duration: 1.6, stagger: 0.035 }, 1.0)
        .to($$('[data-hero-in]'), { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.13 }, 1.4)
        .to($$('.hero__lav svg'), { yPercent: 0, autoAlpha: 1, duration: 2.2, stagger: 0.18 }, 1.0);
    });

    /* ---- En-tête : se cache en descendant, revient en remontant ---- */
    const header = $('[data-header]');
    lenis.on('scroll', ({ scroll, direction }) => {
      header.classList.toggle('is-solid', scroll > 60);
      if (scroll > 500 && direction === 1) header.classList.add('is-hidden');
      else if (direction === -1 || scroll <= 500) header.classList.remove('is-hidden');
    });

    /* ---- Progression : barre + fil d’or ---- */
    gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
    const thread = $('.thread');
    if (thread) {
      gsap.to('[data-thread-fill]', { scaleY: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
      gsap.to('[data-thread-bead]', { y: () => thread.offsetHeight, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2, invalidateOnRefresh: true } });
    }

    /* ---- Poussière dorée du hero ---- */
    const dust = $('[data-dust]');
    if (dust) {
      const rnd = mulberry32(11);
      const n = window.innerWidth < 760 ? 14 : 30;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('i');
        const size = 2 + rnd() * 4;
        s.style.cssText = 'left:' + (rnd() * 100).toFixed(1) + '%;top:' + (30 + rnd() * 70).toFixed(1) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px';
        dust.appendChild(s);
        gsap.fromTo(s, { y: 0, x: 0, autoAlpha: 0 }, {
          y: -(80 + rnd() * 220), x: (rnd() - 0.5) * 90, autoAlpha: 0.25 + rnd() * 0.65,
          duration: 5 + rnd() * 7, delay: rnd() * 6, ease: 'sine.inOut', repeat: -1, yoyo: true,
        });
      }
    }
    // Balancement de la lavande + parallaxe souris
    $$('.hero__lav svg').forEach((svg, i) => {
      gsap.to(svg, { rotation: i ? -2.4 : 2.4, duration: 4.5 + i, ease: 'sine.inOut', repeat: -1, yoyo: true });
    });
    const hero = $('[data-hero]');
    if (finePointer && hero) {
      const layers = [
        { el: $('[data-hero-halo]'), k: 22 },
        { el: $('.hero__lav--l'), k: -28 },
        { el: $('.hero__lav--r'), k: -34 },
        { el: $('.hero__dust'), k: 14 },
      ];
      const xTo = layers.map((l) => gsap.quickTo(l.el, 'x', { duration: 1.4, ease: 'power3.out' }));
      const yTo = layers.map((l) => gsap.quickTo(l.el, 'y', { duration: 1.4, ease: 'power3.out' }));
      hero.addEventListener('pointermove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        layers.forEach((l, i) => { xTo[i](nx * l.k); yTo[i](ny * l.k * 0.6); });
      });
    }

    function heroScroll() {
      const trig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('[data-hero-media]', { yPercent: 14, ease: 'none', scrollTrigger: trig });
      gsap.to('[data-hero-halo]', { yPercent: 30, scale: 1.2, ease: 'none', scrollTrigger: trig });
      gsap.to('.hero__lav--l', { yPercent: -30, ease: 'none', scrollTrigger: trig });
      gsap.to('.hero__lav--r', { yPercent: -42, ease: 'none', scrollTrigger: trig });
      gsap.to('[data-hero-content]', { yPercent: -16, ease: 'none', scrollTrigger: { ...trig, end: '75% top' } });
      gsap.to('.hero__chips', { autoAlpha: 0, y: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: '25% top', end: '55% top', scrub: true } });
    }

    /* ---- Marquees : vitesse et sens réagissent au scroll ---- */
    const marquees = $$('[data-marquee]').map((m) => {
      const dir = parseInt(m.dataset.dir, 10) || -1;
      const track = $('.marquee__track', m);
      const tween = dir < 0
        ? gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 })
        : gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: 46, ease: 'none', repeat: -1 });
      return { dir, tween };
    });
    let boost = 1, scrollDir = 1;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        scrollDir = self.direction || scrollDir;
        boost = 1 + Math.min(Math.abs(self.getVelocity()) / 220, 6);
      },
    });
    gsap.ticker.add(() => {
      boost += (1 - boost) * 0.06;
      marquees.forEach((m) => m.tween.timeScale(scrollDir * boost));
    });

    /* ---- Révélations génériques ---- */
    splits.forEach((parts, el) => {
      if (el.classList.contains('cat__title')) return;
      gsap.fromTo(parts, { yPercent: 112 }, {
        yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      });
    });
    gsap.fromTo(giantChars, { yPercent: 115 }, {
      yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.03,
      scrollTrigger: { trigger: giant, start: 'top 92%', once: true },
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 44, autoAlpha: 0, duration: 1.2, ease: 'power3.out', delay: parseFloat(el.dataset.delay || 0), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-img-reveal]').forEach((wrap) => {
      gsap.fromTo(wrap, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: wrap, start: 'top 85%', once: true } });
    });
    // Images qui bougent légèrement dans leur cadre
    $$('.pimg:not(.pimg--x)').forEach((p) => {
      const img = $('img', p);
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: p.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Vidéos d’ambiance en parallaxe douce
    [['.stats__video', '.stats'], ['.cta__video', '.cta']].forEach(([v, s]) => {
      gsap.fromTo(v, { yPercent: -7, scale: 1.14 }, { yPercent: 7, scale: 1.14, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Compteurs animés
    const fmt = (v, d) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
      const obj = { v: 0 };
      el.textContent = fmt(0, dec);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(obj, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(obj.v, dec); } }),
      });
    });

    // Cadrans de durée
    $$('.dial').forEach((d) => {
      const arc = $('.dial__arc', d);
      const r = parseFloat(getComputedStyle(d).getPropertyValue('--r')) || 1;
      const C = 578;
      gsap.fromTo(arc, { strokeDashoffset: C }, { strokeDashoffset: C * (1 - r), duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: d, start: 'top 88%', once: true } });
      gsap.from(d, { scale: 0.86, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: d, start: 'top 90%', once: true } });
    });
    gsap.from('.packs__grid', { y: 70, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.packs__grid', start: 'top 88%', once: true } });
    gsap.from('.packs__grid > *', { autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'power2.out', scrollTrigger: { trigger: '.packs__grid', start: 'top 88%', once: true } });

    // Statistiques
    gsap.from('.stats__grid li', { y: 60, autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.stats__grid', start: 'top 86%', once: true } });

    // Galerie : cercle qui s’ouvre
    $$('.g-item').forEach((item) => {
      const media = $('.g-item__media', item);
      gsap.fromTo(media, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(78% at 50% 50%)', duration: 1.7, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 88%', once: true } });
      gsap.from($('img', item), { scale: 1.4, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 88%', once: true } });
    });

    // Avis
    gsap.from('.rev', { x: 90, autoAlpha: 0, duration: 1.3, stagger: 0.09, ease: 'expo.out', scrollTrigger: { trigger: '.reviews__rail', start: 'top 85%', once: true } });

    // Réservation / FAQ / contact
    gsap.from('.bsteps li', { y: 30, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.bsteps', start: 'top 90%', once: true } });
    gsap.from('.bform', { y: 70, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.bform', start: 'top 90%', once: true } });
    gsap.from('.ticket', { x: 60, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.ticket', start: 'top 92%', once: true } });
    gsap.from('.qa', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.faq__list', start: 'top 85%', once: true } });
    gsap.from('.cta__btns .btn', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.cta__btns', start: 'top 92%', once: true } });
    gsap.from('.cta__tel', { y: 60, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.cta__tel', start: 'top 92%', once: true } });
    gsap.from('.find__addr a, .hours tr', { x: -30, autoAlpha: 0, duration: 1, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.find__info', start: 'top 80%', once: true } });
    gsap.from('[data-polaroid]', { y: 70, rotation: 14, autoAlpha: 0, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: '.find__map', start: 'top 70%', once: true } });
    gsap.from('.footer__top > *', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.footer__top', start: 'top 92%', once: true } });

    /* ---- Responsive : pin & horizontal sur desktop, version simple sur mobile ---- */
    const mm = gsap.matchMedia();

    mm.add('(min-width: 901px)', () => {
      // Section pinnée : le rituel en 4 étapes
      const section = $('#rituel');
      const steps = $$('.step', section);
      const imgs = $$('.ritual__img', section);
      const n = steps.length;
      const countEl = $('[data-ritual-count]');
      const dots = $$('.ritual__dots i');
      gsap.set(steps, { autoAlpha: 0, y: 50 });
      gsap.set(steps[0], { autoAlpha: 1, y: 0 });
      gsap.set(imgs, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(imgs[0], { clipPath: 'inset(0% 0% 0% 0%)' });
      let lastIdx = -1;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: function () {
          const idx = Math.min(n - 1, Math.floor(this.time() + 0.4));
          if (idx !== lastIdx) {
            lastIdx = idx;
            countEl.textContent = '0' + (idx + 1);
            dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
          }
        },
        scrollTrigger: {
          trigger: section, start: 'top top', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          end: () => '+=' + Math.round(window.innerHeight * ((n - 1) * 0.95 + 0.5)),
        },
      });
      for (let i = 1; i < n; i++) {
        tl.to(steps[i - 1], { autoAlpha: 0, y: -50, duration: 0.4 }, i - 0.35)
          .fromTo(steps[i], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.4 }, i - 0.05)
          .to(imgs[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'power2.inOut' }, i - 0.4);
      }
      tl.to({}, { duration: 0.5 });

      // Défilement horizontal piloté par le scroll vertical : la carte
      const menu = $('#massages');
      const track = $('[data-menu-track]');
      const bar = $('[data-menu-bar]');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const hTween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: menu, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => { bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; },
        },
      });
      $$('.cat', menu).forEach((cat) => {
        const img = $('.pimg--x img', cat);
        if (img) gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: cat, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } });
        const title = splits.get($('.cat__title', cat));
        if (title) gsap.fromTo(title, { yPercent: 112 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: cat, containerAnimation: hTween, start: 'left 78%', once: true } });
        gsap.from($$('.m-item', cat), { y: 34, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: cat, containerAnimation: hTween, start: 'left 74%', once: true } });
      });
      gsap.from('.menu__outro > *', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.menu__outro', containerAnimation: hTween, start: 'left 85%', once: true } });

      // Galerie : parallaxe décalée
      $$('.g-item').forEach((item) => {
        const speed = parseFloat(item.dataset.speed || 0);
        if (speed) gsap.to(item, { yPercent: speed, ease: 'none', scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      return () => {};
    });

    mm.add('(max-width: 900px)', () => {
      $$('.step').forEach((step) => {
        gsap.from(step, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: step, start: 'top 88%', once: true } });
        const im = $('.step__img', step);
        if (im) gsap.fromTo(im, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: step, start: 'top 88%', once: true } });
      });
      $$('.cat').forEach((cat) => {
        gsap.from(cat, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: cat, start: 'top 88%', once: true } });
        const title = splits.get($('.cat__title', cat));
        if (title) gsap.fromTo(title, { yPercent: 112 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: cat, start: 'top 80%', once: true } });
      });
      gsap.from('.menu__outro > *', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.menu__outro', start: 'top 88%', once: true } });
      return () => {};
    });

    /* ---- Micro-interactions (souris) ---- */
    if (finePointer) {
      // Boutons magnétiques
      $$('[data-magnetic]').forEach((el) => {
        const label = $('.btn__label', el);
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
          gsap.to(el, { x: x * 0.28, y: y * 0.34, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
          if (label) gsap.to(label, { x: x * 0.12, y: y * 0.14, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        });
        el.addEventListener('pointerleave', () => {
          gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
          if (label) gsap.to(label, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
        });
      });

      // Inclinaison 3D + reflet lumineux
      $$('[data-tilt]').forEach((el) => {
        let raf = 0;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            el.classList.add('is-tilting');
            el.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
            el.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
            el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
            el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          });
        });
        el.addEventListener('pointerleave', () => {
          cancelAnimationFrame(raf);
          el.classList.remove('is-tilting');
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
        });
      });

      // Curseur
      const cursor = $('[data-cursor]');
      const label = $('.cursor__label', cursor);
      let cx = 0, cy = 0, tx = 0, ty = 0;
      window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('is-on'); }, { passive: true });
      document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
      gsap.ticker.add(() => {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      });
      document.addEventListener('pointerover', (e) => {
        const t = e.target;
        const view = t.closest('.g-item, [data-lightbox]');
        const link = t.closest('a, button, [data-gift], .bitem, .bopt, .slot, .cal__day');
        cursor.classList.toggle('is-view', !!view);
        cursor.classList.toggle('is-link', !!link && !view);
        label.textContent = view ? 'Voir' : '';
      });
    }

    // Recalcul quand tout est chargé
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------------ démarrage */
  function fallback() {
    try {
      if (hasLibs) { ScrollTrigger.getAll().forEach((t) => t.kill()); gsap.globalTimeline.clear(); }
    } catch (e) { /* rien */ }
    root.classList.remove('anim');
    $$('[style]').forEach((el) => {
      if (el.closest('svg')) return;
      el.style.opacity = ''; el.style.visibility = ''; el.style.transform = ''; el.style.clipPath = '';
    });
    if (loaderEl) loaderEl.remove();
    root.classList.add('is-ready');
    if (lenis) { try { lenis.destroy(); } catch (e) { /* rien */ } lenis = null; }
  }

  try {
    initCommon();
    if (animated) initAnimated();
    else initStatic();
  } catch (err) {
    console.error('[Inga] initialisation :', err);
    fallback();
  }
})();
