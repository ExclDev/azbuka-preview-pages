/* =========================================================
   Азбука Ремонта — слой движения (motion layer)
   GSAP 3 + ScrollTrigger + Lenis. Не меняет тексты и вёрстку:
   только добавляет движение поверх существующей страницы.
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var pre = document.getElementById('moPre');

  function bail() {
    clearTimeout(window.__moFailsafe);
    root.classList.remove('motion-pre');
    if (pre) pre.remove();
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    /* Без GSAP класс ed-no-hint не ставится, и плашка «Рассчитать стоимость»
       закрывала бы строки «Почему мы». Та же логика, что у ScrollTrigger ниже:
       пока блок на экране, плашка спрятана. */
    var hintGrid = document.querySelector('.reasons-grid');
    if (hintGrid && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        root.classList.toggle('ed-no-hint', en[0].isIntersecting);
      }).observe(hintGrid);
    }
    bail(); return;
  }

  /* Прогресс, подсветка «4 причин» и надпись в подвале: где есть animation-timeline, их ведёт CSS (motion.css, editorial.css),
     где нет (Safari до 26, Firefox) — ScrollTrigger, как раньше. */
  var cssTl = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  clearTimeout(window.__moFailsafe);
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-on');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isDesktop = function () { return window.innerWidth > 900; };
  var EXPO = 'expo.out';

  /* ---------------------------------------------------------
     1. Инерционный скролл (Lenis) + синхронизация со ScrollTrigger
     --------------------------------------------------------- */
  var lenis = null;
  /* Lenis только там, где есть мышь или трекпад. На сенсорных экранах прокрутка родная: инерция пальца у системы своя,
     второй слой сглаживания поверх неё даёт рывки и лишнюю работу каждый кадр. */
  var touchOnly = window.matchMedia('(pointer: coarse), (hover: none)').matches;
  if (window.Lenis && !touchOnly) {
    lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 1,
      prevent: function (node) {
        // Внутри модалок, квиза, мобильного меню — родной скролл
        return !!(node && node.closest && node.closest(
          '.quiz-body, .mobile-menu, .portfolio-modal, .popup, .popup-overlay, .modal, .lightbox, [data-lenis-prevent]'
        ));
      }
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Попапы сайта ставят html.scroll-locked — останавливаем инерцию
    new MutationObserver(function () {
      if (root.classList.contains('scroll-locked')) lenis.stop(); else lenis.start();
    }).observe(root, { attributes: true, attributeFilter: ['class'] });

    // Плавные переходы по якорям сайта идут через Lenis
    var nativeScrollTo = window.scrollTo.bind(window);
    window.scrollTo = function (a, b) {
      if (a && typeof a === 'object' && a.behavior === 'smooth' && !root.classList.contains('scroll-locked')) {
        lenis.scrollTo(typeof a.top === 'number' ? a.top : window.pageYOffset, {
          duration: 1.5, easing: function (t) { return 1 - Math.pow(1 - t, 4); }
        });
        return;
      }
      return nativeScrollTo(a, b);
    };
  }

  /* ---------------------------------------------------------
     2. Прелоадер + вход в первый экран
     --------------------------------------------------------- */
  var hero = $('.hero');
  var heroBg = $('.hero-bg-img');
  var heroTitle = $('[data-hero-title]');
  var heroEyebrow = $('.hero-eyebrow');
  /* Вход в первый экран (печать заголовка, въезд подписи, зум фона) только если скрипт успел раньше первой отрисовки.
     Иначе заголовок, подпись, плашки и кнопки остаются на месте: без пустого экрана и прыжка на медленной сети. */
  var introOn = !(window.azPainted && window.azPainted());
  var revealed = !introOn;
  var queued = null;

  // Печать заголовка (родная анимация сайта) стартует после прелоадера
  var origType = window.typeHeroTitle;
  if (typeof origType === 'function') {
    window.typeHeroTitle = function (a, b) {
      if (!revealed) { queued = [a, b]; return; }
      return origType(a, b);
    };
  }
  function startTyping() {
    if (typeof origType !== 'function') return;
    var args = queued;
    if (!args) {
      try {
        /* Заголовок первого экрана своего города: AZ_CITY выводится при сборке */
        args = ['Профессиональный', window.AZ_CITY.heroLine2];
      } catch (e) { args = null; }
    }
    if (args) origType(args[0], args[1]);
  }

  if (introOn) {
    gsap.set(heroBg, { scale: 1.32, transformOrigin: '50% 45%' });
    if (heroEyebrow) gsap.set(heroEyebrow, { animation: 'none', x: -30 });
    if (heroTitle) gsap.set(heroTitle, { autoAlpha: 0 });
  }
  root.classList.remove('motion-pre');

  var intro = gsap.timeline({ defaults: { ease: EXPO } });
  if (pre) {
    var num = $('.mo-pre__num', pre);
    var counter = { v: 0 };
    intro
      .to($('.mo-pre__logo', pre), { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
      .to($('.mo-pre__bar i', pre), { scaleX: 1, duration: 1.15, ease: 'power3.inOut' }, 0.1)
      .to(counter, {
        v: 100, duration: 1.15, ease: 'power3.inOut',
        onUpdate: function () { num.textContent = Math.round(counter.v); }
      }, 0.1)
      .to([$('.mo-pre__logo', pre), $('.mo-pre__bar', pre), num], { opacity: 0, duration: 0.35, ease: 'power2.in' }, 1.3)
      .to($('.mo-pre__panel--t', pre), { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 1.45)
      .to($('.mo-pre__panel--b', pre), { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, 1.45)
      .add(function () { pre.style.display = 'none'; }, 2.6);
  }
  var t0 = pre ? 1.75 : 0;
  if (introOn) intro
    .to(heroBg, { scale: 1, duration: 2.4, ease: 'expo.out' }, t0 - 0.2)
    .to(heroEyebrow, { x: 0, duration: 1.1 }, t0 + 0.15)
    .add(function () {
      revealed = true;
      if (heroTitle) gsap.set(heroTitle, { autoAlpha: 1 });
      startTyping();
    }, t0 + 0.35);

  /* --- Первый экран при прокрутке: уходит назад, «О компании» наезжает --- */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero, start: 'top top', end: '+=100%',
        scrub: true, pin: true, pinSpacing: false, anticipatePin: 1
      }
    });
    tl.to(hero, { clipPath: 'inset(0% 2.5% 0% 2.5% round 22px)', ease: 'none' }, 0)
      .to(heroBg, { yPercent: 14, scale: 1.12, ease: 'none' }, 0)
      .to('.hero-content', { y: -140, opacity: 0, ease: 'none' }, 0);
    gsap.set(hero, { clipPath: 'inset(0% 0% 0% 0% round 0px)' });
  });
  mm.add('(max-width: 900px)', function () {
    gsap.to(heroBg, {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero-content', {
      y: -60, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true }
    });
  });

  // Лёгкий параллакс фона за мышью
  if (finePointer && hero && heroBg) {
    var bx = gsap.quickTo(heroBg, 'x', { duration: 1.4, ease: 'power3.out' });
    var by = gsap.quickTo(heroBg, 'y', { duration: 1.4, ease: 'power3.out' });
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      bx(((e.clientX - r.left) / r.width - 0.5) * -26);
      by(((e.clientY - r.top) / r.height - 0.5) * -18);
    });
    hero.addEventListener('mouseleave', function () { bx(0); by(0); });
  }

  /* ---------------------------------------------------------
     3. Заголовки секций: строки выезжают из-под маски
     --------------------------------------------------------- */
  var titleSel = '.section-title, .consult-form-title, .sale-title';
  $$(titleSel).forEach(function (h) {
    if (h.closest('.hero')) return;
    var parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map(function (p) {
      return '<span class="mo-line"><span class="mo-in">' + p.trim() + '</span></span>';
    }).join('');
    var lines = $$('.mo-in', h);
    gsap.set(lines, { yPercent: 110, rotate: 2.5, transformOrigin: '0% 100%' });
    ScrollTrigger.create({
      trigger: h, start: 'top 88%', once: true,
      onEnter: function () {
        gsap.to(lines, { yPercent: 0, rotate: 0, duration: 1.25, ease: EXPO, stagger: 0.09 });
      }
    });
  });

  // Метка над заголовком: собирается из разреженных букв
  $$('.section-tag').forEach(function (t) {
    if (t.closest('.hero')) return;
    var ls = getComputedStyle(t).letterSpacing;
    gsap.fromTo(t, { opacity: 0, letterSpacing: '0.6em' }, {
      opacity: 1, letterSpacing: ls === 'normal' ? '0px' : ls, duration: 1.4, ease: EXPO,
      scrollTrigger: { trigger: t, start: 'top 90%', once: true }
    });
  });

  // Красные черты-разделители прорисовываются
  $$('.divider').forEach(function (d) {
    var s = $$('span', d);
    gsap.fromTo(s, { scaleX: 0 }, {
      scaleX: 1, duration: 1, ease: 'expo.inOut', stagger: 0.15,
      scrollTrigger: { trigger: d, start: 'top 90%', once: true }
    });
  });

  /* ---------------------------------------------------------
     4. Появление блоков (вместо родного fadeUp)
     --------------------------------------------------------- */
  var animEls = $$('.anim').filter(function (el) { return !el.classList.contains('tech-img'); });
  animEls.forEach(function (el) {
    var x = el.classList.contains('anim-from-right') ? 90 : el.classList.contains('anim-from-left') ? -90 : 0;
    gsap.set(el, { opacity: 0, y: x ? 0 : 70, x: x });
  });
  ScrollTrigger.batch(animEls, {
    start: 'top 90%', once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, x: 0, duration: 1.2, ease: EXPO, stagger: 0.09, overwrite: true });
      gsap.fromTo(batch, { '--ln': 0 }, { '--ln': 1, duration: 1.4, ease: 'expo.inOut', stagger: 0.09 });
    }
  });

  /* ---------------------------------------------------------
     4 причины: цифры выезжают из-под маски, активная строка
     подсвечивается, пока проходит середину экрана
     --------------------------------------------------------- */
  var rGrid = $('.reasons-grid');
  var rCards = $$('.reason-card');
  if (rGrid && rCards.length) {
    var rPhotos = $$('.reason-photo img');
    var rPhotoNum = document.getElementById('reasonPhotoNum');
    var rPhotoCur = 0;
    /* скрытые шторкой кадры браузер сам не грузит: подгружаем заранее, иначе смена кадра покажет пустоту */
    ScrollTrigger.create({
      trigger: rGrid, start: 'top 200%', once: true,
      onEnter: function () { rPhotos.forEach(function (im) { im.loading = 'eager'; }); }
    });
    function showReasonPhoto(i) {
      if (i === rPhotoCur || !rPhotos[i]) return;
      rPhotos.forEach(function (im) { im.classList.remove('is-prev'); });
      rPhotos[rPhotoCur].classList.remove('is-show');
      rPhotos[rPhotoCur].classList.add('is-prev');
      rPhotos[i].classList.add('is-show');
      rPhotoCur = i;
      if (rPhotoNum) rPhotoNum.textContent = i + 1;
    }
    rCards.forEach(function (card, idx) {
      var num = $('.reason-num', card);
      if (!num) return;
      num.innerHTML = '<span class="mo-digit">' + num.textContent.trim() + '</span>';
      var dg = num.firstChild;
      gsap.set(dg, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: card, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(dg, { yPercent: 0, duration: 1.1, ease: 'expo.out', delay: 0.15 }); }
      });
      var rt = $('.reason-back .reason-text', card);
      if (rt) {
        rt.innerHTML = rt.textContent.trim().split(/\s+/).map(function (w, i) {
          return '<span class="rw-w" style="--i:' + i + '">' + w + '</span>';
        }).join(' ');
      }
      var cnt = $('.counter[data-target]', card);
      var cntTween = null;
      ScrollTrigger.create({
        trigger: card, start: 'top 58%', end: 'bottom 58%',
        onUpdate: cssTl ? null : function (self) { card.style.setProperty('--act', self.progress.toFixed(3)); },
        onToggle: function (self) {
          card.classList.toggle('is-on', self.isActive);
          if (self.isActive) showReasonPhoto(idx);
          if (!cnt) return;
          if (self.isActive && !cntTween) {
            var c = { v: 0 };
            cntTween = gsap.to(c, {
              v: parseInt(cnt.getAttribute('data-target'), 10), duration: 1.2, ease: 'power2.out',
              onUpdate: function () { cnt.textContent = Math.round(c.v); }
            });
          } else if (!self.isActive && cntTween) {
            cntTween.progress(1);   /* в погашенной строке всегда итоговое число */
          }
        }
      });
    });
    ScrollTrigger.create({
      trigger: rGrid, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { root.classList.toggle('ed-no-hint', self.isActive); }
    });
    ScrollTrigger.create({
      trigger: rGrid, start: 'top 58%', end: 'bottom 58%',
      onToggle: function (self) { rGrid.classList.toggle('ed-spot', self.isActive); }
    });
  }

  /* ---------------------------------------------------------
     5. «О компании»: шторка фото, рамка, текст лесенкой
     --------------------------------------------------------- */
  var aboutTop = $('.about-top');
  if (aboutTop) {
    var photo = $('.about-photo', aboutTop);
    var pic = photo && $('picture', photo);
    var img = photo && $('img', photo);
    if (pic) pic.style.display = 'block';
    gsap.set(photo, { clipPath: 'inset(100% 0% 0% 0%)', '--fr': 0, '--fro': 0 });
    gsap.set(img, { scale: 1.35 });
    var aboutBits = [].concat($$('.about-text p', aboutTop), [$('.about-btns', aboutTop)]);
    gsap.set(aboutBits, { opacity: 0, y: 34 });
    var atl = gsap.timeline({ paused: true, defaults: { ease: EXPO } });
    atl.to(photo, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' }, 0)
       .to(img, { scale: 1.08, duration: 2.2 }, 0.1)
       .to(photo, { '--fr': 1, '--fro': 1, duration: 1.2 }, 0.9)
       .to(aboutBits, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.35);
    ScrollTrigger.create({ trigger: aboutTop, start: 'top 75%', once: true, onEnter: function () { atl.play(); } });
    if (pic) {
      gsap.fromTo(pic, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
  }

  /* ---------------------------------------------------------
     6. Работы (превью портфолио) + форма
     --------------------------------------------------------- */
  var grid = $('#portfolioPreviewGrid');
  var gridDone = false;
  function initGrid() {
    if (gridDone || !grid) return;
    var cells = $$('.consult-photo', grid);
    if (!cells.length) return;
    gridDone = true;
    cells.forEach(function (c, i) {
      gsap.set(c, { clipPath: i % 2 ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)' });
      var im = $('img', c);
      if (im) gsap.set(im, { scale: 1.3 });
    });
    ScrollTrigger.create({
      trigger: grid, start: 'top 80%', once: true,
      onEnter: function () {
        gsap.to(cells, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', stagger: 0.12 });
        gsap.to($$('img', grid), {
          scale: 1, duration: 2, ease: EXPO, stagger: 0.12,
          onComplete: function () { gsap.set($$('img', grid), { clearProps: 'transform' }); }
        });
      }
    });
    ScrollTrigger.refresh();
  }
  if (grid) {
    initGrid();
    new MutationObserver(initGrid).observe(grid, { childList: true });
  }
  var formBits = $$('.consult-form .form-subtitle, .consult-form .form-field, .consult-form .form-submit, .consult-form .form-privacy');
  if (formBits.length) {
    gsap.set(formBits, { opacity: 0, y: 30 });
    ScrollTrigger.create({
      trigger: '.consult-form', start: 'top 80%', once: true,
      onEnter: function () { gsap.to(formBits, { opacity: 1, y: 0, duration: 1, ease: EXPO, stagger: 0.06 }); }
    });
  }

  /* ---------------------------------------------------------
     7. Видео-лента: карточки въезжают веером, перекос от скорости
     --------------------------------------------------------- */
  var cards = $$('.av-card');
  if (cards.length) {
    gsap.set(cards, { opacity: 0, x: 160, rotate: 3 });
    ScrollTrigger.create({
      trigger: '#avRail', start: 'top 85%', once: true,
      onEnter: function () {
        gsap.to(cards, { opacity: 1, x: 0, rotate: 0, duration: 1.4, ease: EXPO, stagger: 0.07 });
      }
    });
  }
  var reelsSec = $('.av-reels');
  var rail = $('#avRail');
  mm.add('(min-width: 1025px)', function () {
    if (!reelsSec || !rail) return;
    reelsSec.classList.add('ed-h');
    var dist = function () {
      var r = rail.getBoundingClientRect();
      var left = r.left - (gsap.getProperty(rail, 'x') || 0);
      return Math.max(0, rail.scrollWidth + left - window.innerWidth + left);
    };
    var tw = gsap.to(rail, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: reelsSec, start: 'center center',
        end: function () { return '+=' + dist(); },
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
    return function () { reelsSec.classList.remove('ed-h'); gsap.set(rail, { clearProps: 'x' }); };
  });
  var skewProxy = { s: 0 };
  /* перекос от скорости нужен только пока лента видео в кадре: без trigger он считался на каждую прокрутку страницы и писал стиль карточкам вне экрана */
  ScrollTrigger.create({
    trigger: reelsSec || '#avRail', start: 'top bottom', end: 'bottom top',
    onUpdate: function (self) {
      var s = gsap.utils.clamp(-5, 5, self.getVelocity() / -350);
      if (Math.abs(s) > Math.abs(skewProxy.s)) {
        skewProxy.s = s;
        gsap.to(skewProxy, {
          s: 0, duration: 0.9, ease: 'power3', overwrite: true,
          onUpdate: function () { gsap.set(cards, { skewY: skewProxy.s }); }
        });
      }
    }
  });

  /* ---------------------------------------------------------
     8. Порядок работы: таймлайн с номерами, активная карточка,
        счётчик «шаг / 8» и шкала прогресса
     --------------------------------------------------------- */
  var procSec = $('.process');
  var steps = $$('.process-step');
  var stepsWrap = $('.process-steps');
  var drumCol = $('.ed-drum-col');
  var ticks = $$('.ed-ticks i');
  if (procSec && stepsWrap && steps.length) {
    procSec.classList.add('ed-steps');
    var tl = document.createElement('div');
    tl.className = 'ed-tl';
    tl.innerHTML = '<i></i>';
    stepsWrap.insertBefore(tl, stepsWrap.firstChild);
    steps.forEach(function (st) {
      var d = document.createElement('span');
      d.className = 'ed-dot';
      d.setAttribute('aria-hidden', 'true');
      d.textContent = st.getAttribute('data-num');
      st.appendChild(d);
    });
    gsap.to($('i', tl), {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: stepsWrap, start: 'top 55%', end: 'bottom 55%', scrub: true }
    });
    var cur = -1;
    var setStep = function (n) {
      if (n === cur) return;
      cur = n;
      steps.forEach(function (st, k) {
        st.classList.toggle('is-on', k === n);
        st.classList.toggle('is-done', k < n);
      });
      ticks.forEach(function (t, k) { t.classList.toggle('on', k <= n); });
      if (drumCol) gsap.to(drumCol, { yPercent: -100 / steps.length * n, duration: 0.9, ease: 'expo.out', overwrite: true });
    };
    steps.forEach(function (st, k) {
      /* карточка может ещё стоять со сдвигом появления: границы считаем от её итогового места */
      var edge = function (el, side) {
        return function () { return side + '-=' + gsap.getProperty(el, 'y') + ' 55%'; };
      };
      /* шаг длится до верха следующего: в зазоре между карточками переключение одно и то же вниз и вверх */
      var next = steps[k + 1];
      ScrollTrigger.create({
        trigger: st, start: edge(st, 'top'),
        endTrigger: next || st, end: next ? edge(next, 'top') : edge(st, 'bottom'),
        onToggle: function (self) { if (self.isActive) setStep(k); }
      });
    });
    setStep(0);
  }

  /* ---------------------------------------------------------
     Наши работы: эффект Hero Parallax на галерее
     --------------------------------------------------------- */
  var works = $('#edWorks');
  var rig = $('#edRig');
  var track = $('#edTrack');
  if (works && rig && track) {
    var wRows = $$('.ed-row', rig);
    var kf = function () { return window.innerWidth < 860 ? 0.55 : 1; };
    // 1) пока сцена въезжает в экран — ряды выпрямляются; к моменту закрепления плоские
    gsap.fromTo(rig,
      { rotateX: 15, rotateZ: 20, opacity: 0.2, y: function () { return -160 * kf(); } },
      { rotateX: 0, rotateZ: 0, opacity: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: track, start: 'top bottom', end: 'top top', scrub: 0.8, invalidateOnRefresh: true } });
    // 2) всё время, пока сцена в кадре и закреплена, ряды едут в разные стороны
    wRows.forEach(function (r) {
      var dir = +r.getAttribute('data-dir') || 1;
      gsap.fromTo(r, { x: function () { return -300 * kf() * dir; } }, {
        x: function () { return 900 * kf() * dir; }, ease: 'none',
        scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true }
      });
    });
    window.addEventListener('ed-works-ready', function () { ScrollTrigger.refresh(); });
  }

  /* ---------------------------------------------------------
     9. Технический проект: шторка слева направо + параллакс
     --------------------------------------------------------- */
  var techImg = $('.tech-img');
  if (techImg) {
    var tImg = $('img', techImg);
    gsap.set(techImg, { opacity: 1, clipPath: 'inset(0% 100% 0% 0%)' });
    gsap.set(tImg, { scale: 1.4 });
    ScrollTrigger.create({
      trigger: techImg, start: 'top 78%', once: true,
      onEnter: function () {
        gsap.to(techImg, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
        gsap.to(tImg, { scale: 1.1, duration: 2.2, ease: EXPO });
      }
    });
    gsap.fromTo(tImg, { yPercent: -4 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: techImg, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }
  var alertBox = $('.tech-alert');
  if (alertBox) {
    gsap.from(alertBox, {
      x: -40, opacity: 0, duration: 1.1, ease: EXPO,
      scrollTrigger: { trigger: alertBox, start: 'top 90%', once: true }
    });
  }

  /* ---------------------------------------------------------
     10. Акция: цена «щёлкает»
     --------------------------------------------------------- */
  var price = $('.sale-price');
  if (price) {
    gsap.from([price, $('.sale-price-old')], {
      scale: 0.6, opacity: 0, duration: 1, ease: 'back.out(2)', stagger: 0.12,
      transformOrigin: '0% 50%',
      scrollTrigger: { trigger: price, start: 'top 90%', once: true }
    });
  }
  var badge = $('.sale-badge');
  if (badge) {
    gsap.from(badge, {
      scale: 0, rotate: -12, duration: 0.9, ease: 'back.out(2.2)',
      scrollTrigger: { trigger: badge, start: 'top 90%', once: true }
    });
  }

  /* ---------------------------------------------------------
     11. Отзывы и контакты
     --------------------------------------------------------- */
  var meta = $('#arMeta');
  if (meta) {
    gsap.from(meta, { y: 30, opacity: 0, duration: 1.1, ease: EXPO,
      scrollTrigger: { trigger: meta, start: 'top 90%', once: true } });
  }
  var stackWrap = $('#arStackWrap');
  if (stackWrap) {
    gsap.from(stackWrap, { y: 80, opacity: 0, rotate: -1.5, duration: 1.4, ease: EXPO,
      scrollTrigger: { trigger: stackWrap, start: 'top 88%', once: true } });
  }
  var map = $('#contactsMap');
  if (map) {
    gsap.set(map, { clipPath: 'inset(0% 100% 0% 0%)' });
    ScrollTrigger.create({ trigger: map, start: 'top 80%', once: true, onEnter: function () {
      gsap.to(map, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
    } });
  }
  var cItems = $$('.contacts-item');
  if (cItems.length) {
    gsap.set(cItems, { opacity: 0, x: 50 });
    ScrollTrigger.create({ trigger: '.contacts-list', start: 'top 85%', once: true, onEnter: function () {
      gsap.to(cItems, { opacity: 1, x: 0, duration: 1.1, ease: EXPO, stagger: 0.08 });
    } });
  }
  var foot = $$('.footer-top > *, .footer-bottom > *');
  if (foot.length) {
    gsap.from(foot, { y: 24, opacity: 0, duration: 1, ease: EXPO, stagger: 0.06,
      scrollTrigger: { trigger: '.footer', start: 'top 95%', once: true } });
  }

  /* ---------------------------------------------------------
     12. Прогресс прокрутки и шапка
     --------------------------------------------------------- */
  var bar = document.createElement('div');
  bar.className = 'mo-progress';
  document.body.appendChild(bar);
  var header = $('.header');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      if (!cssTl) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
      if (!header) return;
      var y = self.scroll();
      var menuOpen = root.classList.contains('scroll-locked');
      if (y > 240 && self.direction === 1 && !menuOpen) header.classList.add('mo-hide');
      else if (self.direction === -1 || y <= 240) header.classList.remove('mo-hide');
    }
  });

  /* ---------------------------------------------------------
     13. Мышь: курсор, магнитные кнопки, наклон карточек
     --------------------------------------------------------- */
  if (finePointer) {
    var dot = document.createElement('div');
    dot.className = 'mo-cursor';
    var ring = document.createElement('div');
    ring.className = 'mo-ring';
    ring.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
    dot.classList.add('is-hidden'); ring.classList.add('is-hidden');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    var playIcon = ring.innerHTML;
    var zoomIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    var mode = '';
    var moved = false;
    window.addEventListener('mousemove', function (e) {
      if (!moved) { moved = true; gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden'); }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      var t = e.target;
      var media = t.closest && t.closest('.av-card, .ed-card, .consult-photo:not(.consult-photo-all)');
      var link = !media && t.closest && t.closest('a, button, input, select, textarea, label, [role="button"], .reason-card, .consult-photo-all');
      var next = media ? (media.classList.contains('av-card') ? 'play' : 'zoom') : link ? 'link' : '';
      if (next !== mode) {
        mode = next;
        ring.classList.toggle('is-media', next === 'play' || next === 'zoom');
        ring.classList.toggle('is-link', next === 'link');
        if (next === 'play') ring.innerHTML = playIcon;
        if (next === 'zoom') ring.innerHTML = zoomIcon;
        dot.classList.toggle('is-hidden', next === 'play' || next === 'zoom');
      }
      var light = t.closest && t.closest('.process');
      ring.classList.toggle('on-light', !!light && !media);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { dot.classList.add('is-hidden'); ring.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden'); });

    // Кнопки не трогаем: у них родной hover системы (подъём 3px, блик)

    // Наклон карточек за курсором
    [].forEach(function (c) {
      var tx = gsap.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3' });
      var ty = gsap.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3' });
      gsap.set(c, { transformPerspective: 900 });
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect();
        tx(((e.clientX - r.left) / r.width - 0.5) * 10);
        ty(((e.clientY - r.top) / r.height - 0.5) * -10);
      });
      c.addEventListener('mouseleave', function () { tx(0); ty(0); });
    });
  }

  /* ---------------------------------------------------------
     Editorial: параллакс крупного заголовка и вордмарк в подвале
     --------------------------------------------------------- */
  mm.add('(min-width: 1025px)', function () {
    var at = $('#about-title');
    if (at) {
      // слова плывут навстречу друг другу поверх фото
      var aLines = $$('.mo-line', at);
      if (aLines[0]) gsap.fromTo(aLines[0], { x: '-8vw' }, { x: '4vw', ease: 'none',
        scrollTrigger: { trigger: '.about-top', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      if (aLines[1]) gsap.fromTo(aLines[1], { x: '8vw' }, { x: '-3vw', ease: 'none',
        scrollTrigger: { trigger: '.about-top', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    }
  });
  var wm = $('.ed-wordmark');
  function fitWm() {
    if (!wm) return;
    wm.style.fontSize = '100px';
    var cs = getComputedStyle(wm.parentElement);
    var avail = wm.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    wm.style.fontSize = (100 * avail / wm.scrollWidth * 0.995) + 'px';
  }
  fitWm();
  window.addEventListener('resize', fitWm);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitWm(); ScrollTrigger.refresh(); });
  /* заливку надписи ведёт CSS по шкале view() (editorial.css); без animation-timeline — ScrollTrigger, как раньше */
  if (wm && !cssTl) {
    var wmTl = gsap.timeline({ scrollTrigger: { trigger: wm, start: 'top 98%', end: 'bottom bottom', scrub: 1 } });
    wmTl.fromTo(wm, { '--wm': '100%' }, { '--wm': '0%', ease: 'none' }, 0)
        .fromTo(wm.lastElementChild, { '--wm2': '100%' }, { '--wm2': '0%', ease: 'none' }, 0.25);
  }

  /* ---------------------------------------------------------
     14. Пересчёт позиций, когда догружается контент
     --------------------------------------------------------- */
  /* закрепления создаются позже анимаций ниже них: без сортировки те не учитывают
     высоту закреплённых секций и срабатывают раньше, чем блок виден */
  ScrollTrigger.addEventListener('refreshInit', function () { ScrollTrigger.sort(); });
  var rt;
  function refreshSoon() { clearTimeout(rt); rt = setTimeout(function () { ScrollTrigger.refresh(); }, 200); }
  ['#arStack', '#portfolioPreviewGrid'].forEach(function (s) {
    var el = $(s);
    if (el) new MutationObserver(refreshSoon).observe(el, { childList: true });
  });
  window.addEventListener('load', refreshSoon);
  /* вёрстка выше по странице изменила высоту: границы триггеров устарели */
  if (window.ResizeObserver) {
    var pageH = document.body.offsetHeight;
    new ResizeObserver(function () {
      var h = document.body.offsetHeight;
      if (h !== pageH) { pageH = h; refreshSoon(); }
    }).observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshSoon);
})();
