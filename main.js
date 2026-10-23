/* =====================================================================
   REYES TAPATIOS · Mariachi Versátil
   Comportamiento e interacciones
   ---------------------------------------------------------------------
   Dependencias (CDN, cargadas con defer antes de este archivo):
   · GSAP + ScrollTrigger  → animaciones ligadas al scroll
   · Lenis                 → scroll suave con inercia
   Si alguna librería no carga, la página sigue siendo 100% usable
   (clase .no-gsap) y respeta prefers-reduced-motion.
   ===================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Configuración y utilidades
  ------------------------------------------------------------------ */
  const WA_NUMBER = '523312969543';
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);

  let lenis = null;

  if (!hasGSAP) root.classList.add('no-gsap');
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /** Corta el texto en palabras envueltas en máscaras para animar titulares. */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            const i = document.createElement('span');
            w.className = 'w';
            i.className = 'w__in';
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    return $$('.w__in', el);
  }

  /** Quita estilos en línea de GSAP al terminar para devolver el control al CSS (hover, etc.). */
  function release(els) {
    els.forEach((el) => {
      el.style.transition = '';
      gsap.set(el, { clearProps: 'transform,opacity' });
    });
  }

  /** Revelado "desde abajo" con limpieza posterior. */
  function revealFrom(targets, vars, trigger) {
    const els = gsap.utils.toArray(targets);
    if (!els.length) return null;
    els.forEach((el) => { el.style.transition = 'none'; });
    return gsap.from(els, {
      ...vars,
      scrollTrigger: trigger,
      onComplete: () => release(els),
    });
  }

  /* ------------------------------------------------------------------
     1. LOADER: telón que se abre
  ------------------------------------------------------------------ */
  function initLoader(onOpen) {
    const loader = $('#loader');
    const body = document.body;
    if (!loader) { body.classList.remove('is-loading'); onOpen(); return; }

    const num = $('#loaderNum');
    const msg = $('#loaderMsg');
    const fill = $('.loader__fill');
    const messages = [
      [0, 'Afinando las vihuelas'],
      [0.34, 'Puliendo los botones de plata'],
      [0.68, 'Calentando la voz'],
      [0.97, 'Todo listo, que comience la fiesta'],
    ];

    const imgs = $$('img[data-preload]');
    let loaded = 0;
    const total = imgs.length + 1;
    const tick = () => { loaded += 1; };
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth) tick();
      else {
        img.addEventListener('load', tick, { once: true });
        img.addEventListener('error', tick, { once: true });
      }
    });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(tick);

    // la primera visita muestra el telón completo; en visitas repetidas de la sesión es más breve
    let seen = false;
    try { seen = sessionStorage.getItem('rt_seen') === '1'; sessionStorage.setItem('rt_seen', '1'); } catch (e) { /* sin storage */ }
    const MIN = reduceMotion ? 500 : seen ? 1200 : 2800;
    const MAX = 7500;
    const t0 = performance.now();
    let shown = 0;
    let lastMsg = -1;
    let closing = false;

    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const finish = () => {
      if (closing) return;
      closing = true;
      const done = () => {
        loader.classList.add('is-done');
        body.classList.remove('is-loading');
        if (lenis) lenis.start();
      };

      if (!hasGSAP || reduceMotion) {
        loader.style.transition = 'opacity .6s';
        loader.style.opacity = '0';
        onOpen();
        setTimeout(done, 650);
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      tl.to('.loader__center', { scale: 0.86, opacity: 0, duration: 0.7, ease: 'power3.in' })
        .to('.loader__light', { opacity: 1, scaleX: 1, duration: 0.5, ease: 'power2.out' }, '-=0.35')
        .to('.loader__curtain--l', { xPercent: -102, duration: 1.7, ease: 'power4.inOut' }, '-=0.1')
        .to('.loader__curtain--r', { xPercent: 102, duration: 1.7, ease: 'power4.inOut' }, '<')
        .to('.loader__light', { opacity: 0, duration: 0.8 }, '-=1.1')
        .add(onOpen, '-=1.25');
    };

    const frame = (now) => {
      const elapsed = now - t0;
      const timeP = ease(clamp(elapsed / MIN, 0, 1));
      const realP = clamp(loaded / total, 0, 1);
      const target = elapsed > MAX ? 1 : Math.min(timeP, realP);
      shown += (target - shown) * 0.14;
      if (target === 1 && shown > 0.995) shown = 1;

      const pct = Math.round(shown * 100);
      num.textContent = pct;
      fill.style.strokeDashoffset = String(100 - shown * 100);

      let idx = 0;
      messages.forEach(([at], i) => { if (shown >= at) idx = i; });
      if (idx !== lastMsg) { lastMsg = idx; msg.textContent = messages[idx][1]; }

      if (shown >= 1) { setTimeout(finish, 350); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     2. SCROLL SUAVE (Lenis) + sincronía con ScrollTrigger
  ------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (!hasGSAP || reduceMotion || !window.Lenis) return;
    lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // se libera cuando el telón termina de abrirse
  }

  function scrollToEl(el, offset = 0) {
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function initAnchors(closeMenu) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target);
    });
  }

  /* ------------------------------------------------------------------
     3. NAVEGACIÓN, MENÚ MÓVIL Y PROGRESO
  ------------------------------------------------------------------ */
  function initNav() {
    const nav = $('#nav');
    const burger = $('#burger');
    const menu = $('#menu');

    // estado "scrolled" con IntersectionObserver (sin listeners de scroll)
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:64px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle('is-scrolled', !entry.isIntersecting);
    }).observe(sentinel);

    // menú móvil
    if (menu) menu.inert = true;
    const setMenu = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      if (open) { document.body.style.overflow = 'hidden'; if (lenis) lenis.stop(); }
      else { document.body.style.overflow = ''; if (lenis && !document.body.classList.contains('is-loading')) lenis.start(); }
    };
    const closeMenu = () => { if (menu.classList.contains('is-open')) setMenu(false); };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });

    if (hasGSAP) {
      // barra de progreso
      gsap.to('.scroll-progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
      });

      // enlace activo según la sección
      ['formatos', 'ocasiones', 'repertorio', 'precio', 'preguntas'].forEach((id) => {
        const sec = document.getElementById(id);
        const link = $(`.nav__links a[href="#${id}"]`);
        if (!sec || !link) return;
        ScrollTrigger.create({
          trigger: sec, start: 'top 55%', end: 'bottom 55%',
          onToggle: (self) => link.classList.toggle('is-active', self.isActive),
        });
      });
    }
    return closeMenu;
  }

  /* ------------------------------------------------------------------
     4. PARTÍCULAS DE POLVO DORADO (canvas)
  ------------------------------------------------------------------ */
  class GoldDust {
    constructor(canvas, host) {
      this.canvas = canvas;
      this.host = host || canvas.parentElement;
      this.ctx = canvas.getContext('2d');
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.mouse = { x: -9999, y: -9999 };
      this.running = false;
      this.parts = [];
      this.last = 0;
      this.resize = this.resize.bind(this);
      this.loop = this.loop.bind(this);
      this.resize();

      let timer;
      window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(this.resize, 200); });
      new IntersectionObserver(([e]) => (e.isIntersecting ? this.start() : this.stop())).observe(canvas);
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
      if (canHover) {
        this.host.addEventListener('pointermove', (e) => {
          const r = canvas.getBoundingClientRect();
          this.mouse.x = e.clientX - r.left;
          this.mouse.y = e.clientY - r.top;
        });
        this.host.addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = -9999; });
      }
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = r.width;
      this.h = r.height;
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const count = this.w < 768 ? 38 : 80;
      this.parts = Array.from({ length: count }, () => this.spawn(true));
      if (reduceMotion) this.draw(0);
    }

    spawn(initial) {
      const big = Math.random() < 0.12;
      const star = !big && Math.random() < 0.1;
      return {
        x: rand(0, this.w), y: initial ? rand(0, this.h) : this.h + 30,
        r: big ? rand(10, 26) : rand(0.6, 2.3),
        vy: big ? rand(0.05, 0.15) : rand(0.12, 0.5),
        sway: rand(8, 34), phase: rand(0, 6.28), speed: rand(0.4, 1.2),
        alpha: big ? rand(0.05, 0.11) : rand(0.35, 0.95), twinkle: rand(1, 3.2),
        big, star, ox: 0, oy: 0,
      };
    }

    start() { if (this.running || reduceMotion) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); }
    stop() { this.running = false; }

    loop(t) {
      if (!this.running) return;
      const dt = Math.min((t - this.last) / 16.67, 3);
      this.last = t;
      this.draw(t, dt);
      requestAnimationFrame(this.loop);
    }

    draw(t, dt = 1) {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        p.y -= p.vy * dt;
        if (p.y < -40) Object.assign(p, this.spawn(false));
        let x = p.x + Math.sin(t * 0.001 * p.speed + p.phase) * p.sway;

        // el cursor aparta suavemente las partículas
        const dx = x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 19600) {
          const f = (1 - Math.sqrt(d2) / 140) * 2.2;
          p.ox += (dx / (Math.sqrt(d2) || 1)) * f;
          p.oy += (dy / (Math.sqrt(d2) || 1)) * f;
        }
        p.ox *= 0.94; p.oy *= 0.94;
        x += p.ox;
        const y = p.y + p.oy;

        const a = p.alpha * (0.6 + 0.4 * Math.sin(t * 0.001 * p.twinkle + p.phase));
        if (p.big) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.r);
          g.addColorStop(0, `rgba(240,201,135,${a})`);
          g.addColorStop(1, 'rgba(240,201,135,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
        } else if (p.star) {
          const s = p.r * 4;
          ctx.strokeStyle = `rgba(255,232,180,${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
          ctx.fillStyle = `rgba(255,240,200,${a})`;
          ctx.beginPath(); ctx.arc(x, y, p.r * 0.8, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(240,201,135,${a * 0.28})`;
          ctx.beginPath(); ctx.arc(x, y, p.r * 3, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,226,170,${a})`;
          ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ------------------------------------------------------------------
     5. HERO: entrada coreografiada, parallax y movimiento constante
  ------------------------------------------------------------------ */
  let heroWords = [];
  function prepareHero() {
    const title = $('.hero__title');
    if (title && hasGSAP) heroWords = splitWords(title);
    const dust = $('#dust-hero');
    if (dust) new GoldDust(dust, $('.hero'));
  }

  function playHeroIntro() {
    const nav = $('#nav');
    if (!hasGSAP || reduceMotion) { nav.classList.add('is-ready'); return; }

    const imgs = $$('.hero .arch__img');
    const cleanables = $$('.hero__cta > *, .hero__sub, .hero__eyebrow');
    cleanables.forEach((el) => { el.style.transition = 'none'; });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { release(cleanables); startHeroLoops(imgs); } });
    tl.from('.hero__crown', { opacity: 0, duration: 1.4 }, 0)
      .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, 0.15)
      .from(heroWords, { yPercent: 118, rotate: 4, duration: 1.4, stagger: 0.075 }, 0.25)
      .from('.hero__sub', { y: 26, opacity: 0, duration: 1.1 }, 0.85)
      .from('.hero__cta > *', { y: 28, opacity: 0, duration: 1, stagger: 0.12 }, 1.0)
      .from('.arch--main .arch__clip', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 24px 24px)', duration: 1.8, ease: 'expo.inOut' }, 0.15)
      .fromTo(imgs, { scale: 1.6 }, { scale: 1.12, duration: 2.6 }, 0.15)
      .from('.arch--mini', { y: 90, opacity: 0, duration: 1.5 }, 0.9)
      .from('.arch__line', { opacity: 0, duration: 1.6 }, 1.1)
      .from('.seal', { scale: 0, rotate: -140, opacity: 0, duration: 1.5, ease: 'back.out(1.5)' }, 1.15)
      .add(() => nav.classList.add('is-ready'), 0.7);
  }

  function startHeroLoops(imgs) {
    // Ken Burns lento y constante sobre las fotos del hero (se pausa al salir del hero)
    const kenBurns = imgs.map((img, i) =>
      gsap.to(img, { scale: 1.22, xPercent: i ? 1.5 : -1.5, yPercent: -1, duration: 16 + i * 3, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    ScrollTrigger.create({
      trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => kenBurns.forEach((t) => (self.isActive ? t.resume() : t.pause())),
    });

    const hero = $('.hero');
    // parallax con el cursor (solo escritorio con mouse)
    if (canHover) {
      const layers = $$('.hero__visual [data-depth]').map((el) => ({
        d: Number(el.dataset.depth),
        x: gsap.quickTo(el, 'x', { duration: 1.3, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 1.3, ease: 'power3' }),
      }));
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach((l) => { l.x(-nx * l.d * 2); l.y(-ny * l.d * 2); });
      });
      hero.addEventListener('pointerleave', () => layers.forEach((l) => { l.x(0); l.y(0); }));
    }
  }

  function initHeroScroll() {
    if (!hasGSAP || reduceMotion) return;
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__copy', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__visual', { yPercent: 9, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__orn', { yPercent: 14, ease: 'none', scrollTrigger: st });
  }

  /* ------------------------------------------------------------------
     6. MARQUEE: acelera con la velocidad del scroll
  ------------------------------------------------------------------ */
  function initMarquee() {
    const track = $('#marqueeTrack');
    if (!track || !hasGSAP || reduceMotion) return;
    const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
    let target = 1;
    let current = 1;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => { target = 1 + Math.min(Math.abs(self.getVelocity()) / 240, 7); },
      onToggle: (self) => (self.isActive ? tween.resume() : tween.pause()),
    });
    gsap.ticker.add(() => {
      target += (1 - target) * 0.05;
      current += (target - current) * 0.12;
      tween.timeScale(current);
    });
  }

  /* ------------------------------------------------------------------
     7. MANIFIESTO: las palabras se iluminan con el scroll
  ------------------------------------------------------------------ */
  function initManifesto() {
    const el = $('[data-words]');
    if (!el || !hasGSAP || reduceMotion) return;
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const highlights = ['recuerdo', 'cantar', 'familia'];
    const words = text.split(/\s+/).map((word) => {
      const span = document.createElement('span');
      span.className = 'word' + (highlights.some((h) => word.toLowerCase().includes(h)) ? ' word--hl' : '');
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
      return span;
    });
    gsap.to(words, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 },
    });
  }

  /* ------------------------------------------------------------------
     8. ESCENARIO: la foto se abre a pantalla completa
  ------------------------------------------------------------------ */
  function initStage() {
    const pin = $('#stagePin');
    if (!pin || !hasGSAP || reduceMotion) return;
    const media = $('#stageMedia');
    const img = $('#stageImg');
    const caption = $('#stageCaption');
    const wl = $('.stage__word--l');
    const wr = $('.stage__word--r');

    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)' }, (ctx) => {
      const { desktop } = ctx.conditions;
      const inset = desktop ? [16, 36, 16, 36] : [21, 14, 21, 14];
      const boxW = window.innerWidth * (1 - (inset[1] + inset[3]) / 100);
      const r = Math.round(Math.min(boxW / 2, 300));
      const from = `inset(${inset[0]}% ${inset[1]}% ${inset[2]}% ${inset[3]}% round ${r}px ${r}px 24px 24px)`;
      const to = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)';

      gsap.set(media, { clipPath: from });
      gsap.set(img, { scale: 1.14, objectPosition: desktop ? '50% 38%' : '12% 38%' });
      gsap.set(caption, { opacity: 0, y: 40 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: pin, start: 'top top', end: '+=190%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.to(media, { clipPath: to, duration: 1 }, 0)
        .to(img, { scale: 1, objectPosition: desktop ? '50% 38%' : '88% 38%', duration: 1 }, 0)
        .to(wl, { xPercent: -42, opacity: 0, duration: 0.85 }, 0)
        .to(wr, { xPercent: 42, opacity: 0, duration: 0.85 }, 0)
        .to(caption, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' }, 0.72)
        .to({}, { duration: 0.22 });
    });
  }

  /* ------------------------------------------------------------------
     9. FORMATOS: acordeón de imágenes
  ------------------------------------------------------------------ */
  function initFormats() {
    const wrap = $('#fmts');
    if (!wrap) return;
    const panels = $$('.fmt', wrap);
    let hoverTimer;

    const setActive = (panel, { scroll = false } = {}) => {
      panels.forEach((p) => {
        const on = p === panel;
        p.classList.toggle('is-active', on);
        const tab = $('.fmt__tab', p);
        tab.setAttribute('aria-expanded', String(on));
        tab.tabIndex = on ? -1 : 0;
      });
      if (scroll && !isDesktop()) setTimeout(() => scrollToEl(panel, -92), 60);
    };
    panels.forEach((p) => {
      $('.fmt__tab', p).tabIndex = p.classList.contains('is-active') ? -1 : 0;
      p.addEventListener('click', () => { if (!p.classList.contains('is-active')) setActive(p, { scroll: true }); });
      p.addEventListener('mouseenter', () => {
        if (!isDesktop() || !canHover) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => { if (!p.classList.contains('is-active')) setActive(p); }, 140);
      });
      p.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
    });
  }

  /* ------------------------------------------------------------------
     10. BENTO: foco de luz que sigue al cursor
  ------------------------------------------------------------------ */
  function initSpotlight() {
    if (!canHover) return;
    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ------------------------------------------------------------------
     11. REPERTORIO: armador de canciones
  ------------------------------------------------------------------ */
  function initRepertoire() {
    const chips = $$('.chip[data-song]');
    const list = $('#setList');
    const countEl = $('#setCount');
    const emptyEl = $('#setEmpty');
    const form = $('#songForm');
    const input = $('#songInput');
    const field = $('#f-songs');
    if (!list) return;

    const songs = [];

    field.addEventListener('input', () => { field.dataset.manual = '1'; });

    const render = () => {
      list.replaceChildren();
      songs.forEach((name) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = name;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', `Quitar ${name}`);
        btn.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>';
        btn.addEventListener('click', () => remove(name));
        li.append(label, btn);
        list.appendChild(li);
      });
      countEl.textContent = String(songs.length);
      emptyEl.hidden = songs.length > 0;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(songs.includes(c.dataset.song))));

      // refleja la selección en el formulario de contacto
      if (field.dataset.manual !== '1') field.value = songs.join(' / ');
      else {
        const missing = songs.filter((s) => !field.value.includes(s));
        if (missing.length) field.value = [field.value.trim(), ...missing].filter(Boolean).join(' / ');
      }
    };

    const has = (name) => songs.some((s) => s.toLowerCase() === name.toLowerCase());
    const add = (name) => { if (!has(name)) songs.push(name); render(); };
    const remove = (name) => { const i = songs.findIndex((s) => s.toLowerCase() === name.toLowerCase()); if (i > -1) songs.splice(i, 1); render(); };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const name = chip.dataset.song;
        if (has(name)) remove(name); else add(name);
        chip.classList.remove('pop');
        void chip.offsetWidth;
        chip.classList.add('pop');
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim().slice(0, 60);
      if (!value) { input.focus(); return; }
      add(value);
      input.value = '';
    });

    render();
  }

  /* ------------------------------------------------------------------
     12. PROCESO: tarjetas que se apilan
  ------------------------------------------------------------------ */
  function initProcess() {
    if (!hasGSAP || reduceMotion) return;
    const steps = $$('.step');
    steps.forEach((step, i) => {
      if (i === steps.length - 1) return;
      const card = $('.step__card', step);
      const nextOffset = 82 + (i + 1) * 16;
      gsap.to(card, {
        scale: 0.93, '--dim': 0.62, ease: 'none',
        scrollTrigger: { trigger: steps[i + 1], start: 'top bottom', end: `top ${nextOffset}px`, scrub: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     13. PRECIO: contador animado
  ------------------------------------------------------------------ */
  function initPrice() {
    const el = $('#priceNum');
    if (!el || !hasGSAP || reduceMotion) return;
    const end = Number(el.dataset.count);
    const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const obj = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 82%', once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(obj.v); } }),
    });
  }

  /* ------------------------------------------------------------------
     14. FAQ: acordeón accesible
  ------------------------------------------------------------------ */
  function initFaq() {
    const items = $$('.qa');
    items.forEach((item) => {
      const btn = $('button', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((i) => {
          const on = i === item && open;
          i.classList.toggle('is-open', on);
          $('button', i).setAttribute('aria-expanded', String(on));
        });
        if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 700);
      });
    });
  }

  /* ------------------------------------------------------------------
     15. FORMULARIO → WhatsApp
  ------------------------------------------------------------------ */
  function initForm() {
    const form = $('#quoteForm');
    if (!form) return;
    const btn = $('#formBtn');
    const done = $('#formDone');
    const doneName = $('#doneName');
    const doneLink = $('#doneLink');
    const dateInput = $('#f-date');

    const today = new Date();
    dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const setError = (input, text) => {
      const field = input.closest('.field');
      const err = $('.field__error', field);
      field.classList.toggle('has-error', Boolean(text));
      err.textContent = text || '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (text) input.setAttribute('aria-describedby', err.id || (err.id = `${input.id}-err`));
    };

    const validators = {
      nombre: (v) => (v.trim().length < 2 ? 'Escribe tu nombre para saber cómo llamarte.' : ''),
      telefono: (v) => (v.replace(/\D/g, '').length < 10 ? 'Escribe un número de 10 dígitos.' : ''),
      evento: (v) => (!v ? 'Elige qué vas a celebrar.' : ''),
    };

    const validate = () => {
      let first = null;
      Object.keys(validators).forEach((name) => {
        const input = form.elements[name];
        const msg = validators[name](input.value);
        setError(input, msg);
        if (msg && !first) first = input;
      });
      if (first) first.focus();
      return !first;
    };

    Object.keys(validators).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => setError(input, validators[name](input.value)));
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('has-error')) setError(input, validators[name](input.value)); });
    });

    const buildMessage = (d) => {
      const lines = ['Hola Reyes Tapatios, quiero cotizar un mariachi para mi evento.', ''];
      lines.push(`Nombre: ${d.nombre.trim()}`);
      lines.push(`Teléfono: ${d.telefono.trim()}`);
      lines.push(`Evento: ${d.evento}`);
      if (d.formato) lines.push(`Formato: ${d.formato}`);
      if (d.fecha) lines.push(`Fecha: ${new Date(`${d.fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`);
      if (d.lugar.trim()) lines.push(`Lugar: ${d.lugar.trim()}`);
      if (d.canciones.trim()) lines.push(`Canciones: ${d.canciones.trim()}`);
      return lines.join('\n');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      const data = Object.fromEntries(new FormData(form));
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildMessage(data))}`;
      window.open(url, '_blank', 'noopener');
      btn.classList.add('is-loading');
      setTimeout(() => {
        btn.classList.remove('is-loading');
        doneName.textContent = data.nombre.trim().split(/\s+/)[0];
        doneLink.href = url;
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        done.focus({ preventScroll: true });
      }, 800);
    });

    // los botones "Quiero el trío", "Mi boda con mariachi", etc. preseleccionan el formulario
    document.addEventListener('click', (e) => {
      const f = e.target.closest('[data-pick-format]');
      const ev = e.target.closest('[data-pick-event]');
      if (f) form.elements.formato.value = f.dataset.pickFormat;
      if (ev) {
        const sel = form.elements.evento;
        const wanted = ev.dataset.pickEvent;
        const match = Array.from(sel.options).find((o) => o.text === wanted);
        if (match) { sel.value = match.value || match.text; setError(sel, ''); }
      }
    });
  }

  /* ------------------------------------------------------------------
     16. REVELADOS GENERALES Y EFECTOS DE SCROLL
  ------------------------------------------------------------------ */
  function initReveals() {
    if (!hasGSAP || reduceMotion) return;

    // titulares por palabras
    $$('[data-split]').forEach((h) => {
      if (h.classList.contains('hero__title')) return;
      const words = splitWords(h);
      gsap.from(words, {
        yPercent: 118, duration: 1.25, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true },
      });
    });

    // elementos sueltos
    $$('[data-reveal]').forEach((el) => {
      revealFrom(el, { y: 44, opacity: 0, duration: 1.2, ease: 'expo.out' }, { trigger: el, start: 'top 90%', once: true });
    });

    // grupos con stagger
    $$('[data-reveal-group]').forEach((group) => {
      revealFrom($$('[data-reveal-item]', group), { y: 64, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.11 },
        { trigger: group, start: 'top 86%', once: true });
    });

    // parallax vertical de ornamentos
    $$('[data-parallax-y]').forEach((el) => {
      gsap.fromTo(el, { y: 0 }, {
        y: Number(el.dataset.parallaxY), ease: 'none',
        scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // footer: la marca gigante sube y aparece
    const brand = $('[data-footer-brand]');
    if (brand) {
      gsap.fromTo(brand, { yPercent: 35, opacity: 0.2 }, {
        yPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: '.footer__brand', start: 'top bottom', end: 'bottom bottom', scrub: true },
      });
    }
  }

  /* ------------------------------------------------------------------
     17. BOTONES MAGNÉTICOS, WHATSAPP FLOTANTE Y VOLVER ARRIBA
  ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!canHover || reduceMotion) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.34;
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0 0'; });
    });
  }

  function initFloatingWA() {
    const wa = $('#wa');
    const hero = $('.hero');
    if (!wa || !hero) return;
    let tipShown = false;
    new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting;
      wa.classList.toggle('is-visible', show);
      if (show && !tipShown) {
        tipShown = true;
        setTimeout(() => wa.classList.add('show-tip'), 1200);
        setTimeout(() => wa.classList.remove('show-tip'), 6200);
      }
    }, { threshold: 0, rootMargin: '-35% 0px 0px 0px' }).observe(hero);
  }

  function initToTop() {
    const btn = $('#toTop');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /** Pausa las animaciones CSS de las secciones que no están en pantalla. */
  function initOffscreenPause() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
    }, { rootMargin: '120px 0px' });
    $$('.hero, .stage, .occasions, .repertoire, .price, .faq, .contact, .footer').forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     ARRANQUE
  ------------------------------------------------------------------ */
  function boot() {
    initSmoothScroll();
    const closeMenu = initNav();
    initAnchors(closeMenu);
    prepareHero();

    // orden de creación = orden en el documento (necesario para los pines de ScrollTrigger)
    initHeroScroll();
    initMarquee();
    initManifesto();
    initStage();
    initFormats();
    initSpotlight();
    initRepertoire();
    initProcess();
    initPrice();
    initFaq();
    initForm();
    initReveals();
    initMagnetic();
    initFloatingWA();
    initToTop();
    initOffscreenPause();

    initLoader(playHeroIntro);

    if (hasGSAP) {
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    }
  }

  boot();
})();
