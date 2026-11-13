/* ═══ service.js: движение внутренних страниц (шаблон услуги). GSAP + ScrollTrigger + Lenis из vendor/. ═══
   motion.js главной сюда не подключается: у него другая разметка. Правила те же, что на главной:
   - контент появляется один раз (ScrollTrigger once) и при прокрутке назад не прячется;
   - декор привязан к прокрутке (scrub) и идёт в обе стороны;
   - закрепление этапов — от 1100 px, навигация по разделам — от 1280 px;
   - при prefers-reduced-motion или без GSAP скрипт ничего не прячет: всё видно в конечном состоянии.
   Переключатель квартиры не зависит от GSAP: JS меняет только классы строк и переменные --i, --n, дальше работает CSS. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══ 1. Переключатель «Какая у вас квартира?» ═══ */
  (function initSwitcher() {
    var tabsBox = $('#svTabs');
    var list = $('#svRows');
    if (!tabsBox || !list) return;
    var rows = $$('.sv-row', list);
    var tabs = $$('.sv-tab', tabsBox);
    var drum = $('#svDrum'), total = $('#svTotal'), check = $('#svCheck'), checkWrap = $('#svCheckWrap');
    var sr = $('#svSr'), label = $('#svSumLabel');
    var cur = 0;
    // подписи статусов берём из разметки первой строки: их задают данные страницы
    var first = rows[0];
    var B = first ? {
      do: $('.b-do', first).textContent,
      check: $('.b-check', first).textContent,
      skip: $('.b-skip', first).textContent
    } : {};
    var data = rows.map(function (li) { return li.getAttribute('data-s').split(','); });

    function apply(i) {
      var shown = 0, done = 0, chk = 0;
      rows.forEach(function (li, k) {
        var st = data[k][i];
        li.classList.remove('do', 'check', 'skip');
        li.classList.add(st);
        $('.sv-badge .sv-sr', li).textContent = B[st];
        shown++;  // «Не нужно» остаётся в списке зачёркнутым, поэтому входит в общее число
        if (st === 'do') done++;
        if (st === 'check') chk++;
      });
      cur = i;
      tabsBox.style.setProperty('--i', i);
      tabs.forEach(function (b, k) {
        b.classList.toggle('on', k === i);
        b.setAttribute('aria-pressed', String(k === i));
      });
      if (label) label.textContent = tabs[i].getAttribute('data-label');
      if (drum) { drum.style.setProperty('--n', done); drum.style.setProperty('--d', String(done).length); }  // ширина барабана по числу цифр
      if (total) total.textContent = shown;
      if (check) check.textContent = chk;
      if (checkWrap) checkWrap.hidden = chk === 0;  // «, ещё N проверяем и доводим» только при N > 0
      if (sr) sr.textContent = done + ' из ' + shown;
    }

    tabsBox.addEventListener('click', function (e) {
      var b = e.target.closest('.sv-tab');
      if (b) apply(Number(b.getAttribute('data-i')));
    });
    // клавиатура: Tab и Enter/Space работают у кнопок сами; стрелки и Home/End переключают состояния
    tabsBox.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, i = cur;
      if (k === 'ArrowRight' || k === 'ArrowDown') i = (cur + 1) % n;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') i = (cur - 1 + n) % n;
      else if (k === 'Home') i = 0;
      else if (k === 'End') i = n - 1;
      else return;
      e.preventDefault();
      apply(i);
      tabs[i].focus();
    });
  })();

  /* ═══ 2. Движение ═══ */
  function release() {
    clearTimeout(window.__svFailsafe);
    root.classList.remove('sv-pre');
  }
  if (reduce || !window.gsap || !window.ScrollTrigger) { release(); return; }

  var touched = [];   // всё, что скрипт прятал: на случай ошибки возвращаем в видимое состояние
  function bail(err) {
    try { if (err && window.console) console.warn('service.js: движение отключено', err); } catch (e) { /* консоль недоступна */ }
    try {
      ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      gsap.killTweensOf(touched);
      gsap.set(touched, { clearProps: 'all' });
    } catch (e) { /* нечего возвращать */ }
    root.classList.remove('sv-motion', 'sv-pinned');
    release();
  }
  try { initMotion(); } catch (err) { bail(err); }

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    root.classList.add('sv-motion');

    var EXPO = 'expo.out';
    var H = function () { return window.innerHeight; };
    function S(els, vars) { // gsap.set с учётом возврата при ошибке
      var list = [].concat(els).filter(Boolean);
      if (!list.length) return list;   // пустой список GSAP принимает с предупреждением в консоли (у «Приёмки» нет .sv-hero-copy)
      touched = touched.concat(list);
      gsap.set(list, vars);
      return list;
    }
    // Позиции прокрутки по диапазонам view-timeline макета (entry, cover, exit), в пикселях страницы.
    // Считаются заново при каждом refresh. Для элементов выше закреплённой секции.
    function vr(el, range, pct) {
      return function () {
        var r = el.getBoundingClientRect(), top = r.top + window.pageYOffset, h = r.height, p = pct / 100;
        if (range === 'entry') return top - H() + h * p;
        if (range === 'exit') return top + h * p;
        return top - H() + (H() + h) * p; // cover
      };
    }
    function scrub(el, from, to, st, extra) {
      var cfg = { ease: 'none', scrollTrigger: Object.assign({ scrub: true, invalidateOnRefresh: true }, st) };
      return gsap.fromTo(el, from, Object.assign(to, cfg, extra || {}));
    }

    /* ── Lenis + синхронизация со ScrollTrigger (как на главной) ── */
    var lenis = null;
    /* Lenis только там, где есть мышь или трекпад. На сенсорных экранах прокрутка родная: инерция пальца у системы своя,
       второй слой сглаживания поверх неё даёт рывки и лишнюю работу каждый кадр. */
    var touchOnly = window.matchMedia('(pointer: coarse), (hover: none)').matches;
    if (window.Lenis && !touchOnly) {
      lenis = new Lenis({
        lerp: 0.085, smoothWheel: true, wheelMultiplier: 1,
        prevent: function (node) {
          return !!(node && node.closest && node.closest('.mobile-menu, .portfolio-modal, .popup, .popup-overlay, .modal, .lightbox, [data-lenis-prevent]'));
        }
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      new MutationObserver(function () {
        if (root.classList.contains('scroll-locked')) lenis.stop(); else lenis.start();
      }).observe(root, { attributes: true, attributeFilter: ['class'] });
      // плавные переходы по якорям base.js идут через Lenis
      var nativeScrollTo = window.scrollTo.bind(window);
      window.scrollTo = function (a, b) {
        if (a && typeof a === 'object' && a.behavior === 'smooth' && !root.classList.contains('scroll-locked')) {
          lenis.scrollTo(typeof a.top === 'number' ? a.top : window.pageYOffset, {
            duration: 1.5, easing: function (t) { return 1 - Math.pow(1 - t, 4); }
          });
          return;
        }
        // со вторым аргументом undefined родной scrollTo читает объект как (x, y), поэтому аргументы передаём как пришли
        return arguments.length > 1 ? nativeScrollTo(a, b) : nativeScrollTo(a);
      };
    }

    var crumbs = $('.sv-crumbs');
    var h1Lines = $$('.sv-h1 .ln > span');
    var heroCopy = $$('.sv-hero-copy > *:not(.sv-h1)');   // у первого экрана «Ванной» H1 стоит в этой же колонке: он выезжает по строкам (h1Lines), а не плавает целиком
    var photo = $('.sv-hero-photo');
    var imgs = $$('img', photo || document.createElement('div'));
    var grayImg = $('.sv-ph-gray', photo || document);
    var colorImg = $('.sv-ph-color', photo || document);
    var plan = $('.sv-plan');
    var cap = photo ? $('figcaption', photo) : null;   // не искать по всей странице: у «Листов проекта» своя подпись, и её это движение не касается

    /* ── Скрытые начальные состояния. После этого блока html.sv-pre снимается: дальше их держат инлайн-стили GSAP ── */
    /* Крошки, H1, лид, факты и кнопки видны с первой отрисовки. Скрываем и выводим их только если скрипты успели раньше неё;
       на медленной сети (GSAP приехал после первой отрисовки) текст остаётся на месте, без пустого экрана и прыжка. */
    var introOn = !(window.azPainted && window.azPainted());
    if (introOn) {
      S(crumbs, { y: 16 });          // без opacity:0: подписи, лид, цена и кнопки видны с первой отрисовки, входят сдвигом
      S(h1Lines, { yPercent: 105 });
      S(heroCopy, { y: 16 });
    }
    if (photo) S(photo, { clipPath: 'inset(0% 0% 100% 0%)' });
    if (colorImg && grayImg) S(colorImg, { clipPath: 'inset(0% 100% 0% 0%)' });
    if (plan) { S($$('.pl-txt', plan), { opacity: 0 }); }
    if (cap) S(cap, { opacity: 0, visibility: 'hidden' });

    var titles = $$('.sv-sec .section-title .mo-in');
    var ctaLines = $$('.sv-cta h2 .ln > span');
    S(titles.concat(ctaLines), { yPercent: 105 });
    var cards = $$('.sv-rv').filter(function (el) { return !el.classList.contains('sv-step'); });
    S(cards, { opacity: 0, y: 48 });
    var stepEls = $$('.sv-step');                                        // с финалом (он последний, только при закреплении)
    var stepCards = stepEls.filter(function (el) { return !el.classList.contains('sv-step-fin'); });
    var drumCol = $('.sv-facts .sv-drum-col');
    release();

    /* ── Загрузка: появление первого экрана ── */
    var intro = gsap.timeline({ defaults: { ease: EXPO } });
    if (introOn) {
      if (crumbs) intro.to(crumbs, { y: 0, duration: .7, ease: 'sine.out', clearProps: 'transform' }, 0);
      h1Lines.forEach(function (el, i) { intro.to(el, { yPercent: 0, duration: 1, clearProps: 'transform' }, i * .1); });
      heroCopy.forEach(function (el, i) { intro.to(el, { y: 0, duration: .9, clearProps: 'transform' }, .2 + i * .1); });
    }
    if (drumCol) {
      // y: 0 задан явно, чтобы GSAP не прочитал CSS-сдвиг -6em как начальное значение
      intro.fromTo(drumCol, { y: 0, yPercent: 0 }, { y: 0, yPercent: -600 / 7, duration: 1.4 }, .45);
    }
    if (photo) intro.to(photo, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.inOut', clearProps: 'clipPath' }, .15);

    /* Полоса прогресса, дрейф H1, зум фото первого экрана, зачёркивание старой цены, красные разделители, надпись в подвале, шторка и параллакс работ,
       красная линия шагов на узких экранах и зум фона призыва: где есть animation-timeline, их ведёт CSS (service.css, конец файла: scroll() / view()),
       и JS их не трогает. Где его нет (Safari до 26, Firefox), те же эффекты считает ScrollTrigger, как раньше. */
    var cssTl = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
    if (!cssTl) {
      /* ── Прогресс прокрутки страницы ── */
      var bar = $('.sv-progress i');
      if (bar) scrub(bar, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center' }, { trigger: document.body, start: 0, end: 'max' });

      /* ── Дрейф H1: строки расходятся ── */
      var lns = $('.vI') ? [] : $$('.sv-h1 .ln');   // «Было — стало»: дрейф H1 отключён
      if (lns[0]) scrub(lns[0], { x: 0 }, { x: '-7vw' }, { trigger: document.body, start: 0, end: 700 });
      if (lns[1]) scrub(lns[1], { x: 0 }, { x: '9vw' }, { trigger: document.body, start: 0, end: 700 });

      /* ── Фото первого экрана: медленный зум при уходе с экрана ── */
      if (photo) scrub(imgs, { scale: 1 }, { scale: 1.12 }, { trigger: photo, start: 'center center', end: 'bottom top' });

    }

    /* ── Веер листов (страница «Технический проект»): при прокрутке крайние листы расходятся шире, назад сходятся ──
       Диапазон как у макета: cover 50 % … exit 80 %. --fan (0…1) читает service.css; наведение (--h) и раздача при загрузке работают на CSS. */
    var deck = $('.hv-c-deck');
    if (deck) {
      touched.push(deck);
      scrub(deck, { '--fan': 0 }, { '--fan': 1 }, { trigger: deck, start: vr(deck, 'cover', 50), end: vr(deck, 'exit', 80) });
    }

    /* ── Чертёж → интерьер ── */
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1100px)', function () {
      if (!plan || !photo) return;
      // линии рисуются при загрузке (стены, двери и окна, размеры), подписи комнат проявляются
      var draw = function (sel, delay, dur) { gsap.to($$(sel, plan), { strokeDashoffset: 0, duration: dur, delay: delay, ease: 'power2.inOut' }); };
      draw('.pl-walls path:nth-child(1)', .5, 1.4);
      draw('.pl-walls path:nth-child(2)', 1.2, 1.1);
      draw('.pl-walls path:nth-child(3)', 1.35, 1.1);
      draw('.pl-walls path:nth-child(4)', 1.5, 1.1);
      draw('.pl-thin path', 1.9, .8);
      draw('.pl-dim path', 2.2, .9);
      gsap.to($$('.pl-txt', plan), { opacity: 1, duration: .8, delay: 2.4, ease: 'power1.out' });
      // прокрутка 40–420 px: план гаснет; 120–620 px: цветное фото открывается шторкой слева направо
      scrub(plan, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.06 }, { trigger: document.body, start: 40, end: 420 });
      if (colorImg && grayImg) scrub(colorImg, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }, { trigger: document.body, start: 120, end: 620 });
      if (cap) scrub(cap, { opacity: 0, visibility: 'hidden' }, { opacity: 1, visibility: 'visible' }, { trigger: document.body, start: 420, end: 620 });
    });
    mm.add('(max-width: 1099px)', function () {
      if (!plan || !photo) return;
      // фото ниже первого экрана: всё привязано к самому фото
      var d = { trigger: photo };
      scrub($$('path', plan), { strokeDashoffset: 1 }, { strokeDashoffset: 0 }, Object.assign({ start: vr(photo, 'entry', 10), end: vr(photo, 'cover', 40) }, d));
      scrub($$('.pl-txt', plan), { opacity: 0 }, { opacity: 1 }, Object.assign({ start: vr(photo, 'cover', 30), end: vr(photo, 'cover', 42) }, d));
      scrub(plan, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.06 }, Object.assign({ start: vr(photo, 'cover', 48), end: vr(photo, 'cover', 62) }, d));
      if (colorImg && grayImg) scrub(colorImg, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }, Object.assign({ start: vr(photo, 'cover', 50), end: vr(photo, 'cover', 72) }, d));
      if (cap) scrub(cap, { opacity: 0, visibility: 'hidden' }, { opacity: 1, visibility: 'visible' }, Object.assign({ start: vr(photo, 'cover', 62), end: vr(photo, 'cover', 72) }, d));
    });

    /* ── Контент появляется один раз ── */
    // Триггером служит неподвижная обёртка (маска строки): сам заголовок сдвинут вниз, и его положение не годится для расчёта
    titles.forEach(function (el) {
      ScrollTrigger.create({
        trigger: el.parentNode, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(el, { yPercent: 0, duration: 1, ease: EXPO, clearProps: 'transform' }); }
      });
    });
    // у заголовка призыва строки появляются по очереди: триггер один, цели две
    $$('.sv-cta h2').forEach(function (h) {
      $$('.ln > span', h).forEach(function (el, i) {
        ScrollTrigger.create({
          trigger: h, start: 'top 85%', once: true,
          onEnter: function () { gsap.to(el, { yPercent: 0, duration: 1, delay: i * .1, ease: EXPO, clearProps: 'transform' }); }
        });
      });
    });
    cards.forEach(function (el, i) {
      var parent = el.parentNode;
      var col = $$('.sv-rv', parent).indexOf(el) % 3;
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          el.style.transition = 'none';  // CSS-переход hover не должен спорить с GSAP, пока идёт появление
          gsap.to(el, {
            opacity: 1, y: 0, duration: .9, delay: col * .1, ease: EXPO,
            onComplete: function () { gsap.set(el, { clearProps: 'transform,opacity' }); el.style.transition = ''; }
          });
        }
      });
    });

    if (!cssTl) {
      /* ── Красный разделитель: две черты прорисовываются слева ── */
      $$('.sv-div').forEach(function (d) {
        var a = $('span:first-child', d), b = $('span:last-child', d);
        S([a, b], { transformOrigin: 'left center' });
        scrub(a, { scaleX: 0 }, { scaleX: 1 }, { trigger: d, start: 'top 92%', end: 'top 80%' });
        scrub(b, { scaleX: 0 }, { scaleX: 1 }, { trigger: d, start: 'top 88%', end: 'top 72%' });
      });

      /* ── Старая цена: красное зачёркивание прорисовывается ── */
      $$('.sv-old').forEach(function (el) {
        scrub(el, { backgroundSize: '0% 2px' }, { backgroundSize: '100% 2px' }, { trigger: el, start: 'top 85%', end: 'top 55%' });
      });

    }

    /* ── Этапы ── */
    var stepsSec = $('.sv-steps-sec');
    var pinST = null;
    // «Ванная под ключ»: секция этапов вместе с отзывами и вопросами (.vn-hzsec). Где работает view(), ленту и выезд панелей ведёт CSS (service.css, раздел 5),
    // а закрепление GSAP здесь не нужно. Где view() нет, прежнее закрепление ставится на .sv-pin, а панели идут обычным потоком под этапами.
    var hzSec = stepsSec && stepsSec.classList.contains('vn-hzsec');
    // «Капремонт вторички»: портфолио наезжает на этапы (.vo-sec, vtorichka.css). Лента и наезд на CSS при view(); без view() этапы закрепляются на .sv-pin, портфолио идёт ниже обычным блоком
    var voSec = stepsSec && stepsSec.classList.contains('vo-sec');
    var viewCss = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
    if (stepsSec) {
      var track = $('.sv-steps', stepsSec);
      mm.add('(min-width: 1100px)', function () {
        if ((hzSec || voSec) && viewCss) return;
        // секция закреплена, лента из шагов едет влево; каждый шаг загорается и тянет свою красную линию
        root.classList.add('sv-pinned');
        var pinEl = (hzSec || voSec) ? $('.sv-pin', stepsSec) : stepsSec;
        var tl =gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: pinEl, start: 'top top', end: function () { return '+=' + Math.round(H() * 2.2); },
            pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1
          }
        });
        pinST = tl.scrollTrigger;
        // Прогресс 0–100 % = весь путь закрепления. Лента: 0–10 % стоит, 10–100 % равномерно сдвигается ровно на 5 ширин шага
        // (5 × 400 px = 2000 px). Сдвиг задан шириной шага, а не шириной ленты или экрана: тогда текущий шаг всегда в кадре
        // между левым краем контента и +400 px на любой ширине окна от 1100 px.
        var stepW = function () { return stepEls[0].offsetWidth; };
        tl.fromTo(track, { x: 0 }, { x: function () { return -5 * stepW(); }, duration: 90 }, 10);
        // загорание: прозрачность, линия (--p), заливка кольца. Шаг k+1 загорается за 6 % до того, как он дойдёт до левого края.
        // Шестой отрезок — финал «Новоселье» (только при закреплении).
        var ranges = [[0, 2], [4, 10], [22, 28], [40, 46], [58, 64], [76, 82], [94, 100]];
        stepEls.forEach(function (st, i) {
          var r = ranges[i] || ranges[ranges.length - 1];
          tl.fromTo(st, { opacity: .28 }, { opacity: 1, duration: r[1] - r[0] }, r[0]);
          tl.fromTo(st, { '--p': 0 }, { '--p': 1, duration: r[1] - r[0] }, r[0]);
          // кольцо шага заливается красным в том же отрезке: пройденные залиты, будущие только контур
          var ring = $('.sv-step-n', st);
          if (ring) tl.fromTo(ring, { backgroundColor: '#f5f5f7', color: '#e8201a' }, { backgroundColor: '#e8201a', color: '#ffffff', duration: r[1] - r[0] }, r[0]);
        });
        return function () { root.classList.remove('sv-pinned'); pinST = null; };
      });
      // обычная сетка (телефон и планшет, где нет сцены «Ванной»): шаги появляются карточками; красную линию по шагам ведёт CSS (--svlist)
      var flat = function () {
        var list = $('.sv-steps', stepsSec);
        if (hzSec && viewCss) return;   // у «Ванной» с view() ленту и панели ведёт CSS
        stepCards.forEach(function (el, i) {
          var col = i % 3;
          gsap.set(el, { opacity: 0, y: 48 });
          ScrollTrigger.create({
            trigger: el, start: 'top 90%', once: true,
            onEnter: function () { gsap.to(el, { opacity: 1, y: 0, duration: .9, delay: col * .1, ease: EXPO, clearProps: 'transform,opacity' }); }
          });
          if (!cssTl) {   // без animation-timeline красную линию по шагам ведёт ScrollTrigger, как раньше
            var a = i === 0 ? vr(list, 'entry', 70) : vr(list, 'cover', 34 + (i - 1) * 6);
            var b = i === 0 ? vr(list, 'cover', 34) : vr(list, 'cover', 34 + i * 6);
            scrub(el, { '--p': 0 }, { '--p': 1 }, { trigger: list, start: a, end: b });
          }
        });
      };
      // три условия вместо одного (max-width: 1099px): планшет в портрете (768–1099 × от 900) у «Ванной» с view() живёт на CSS
      mm.add('(max-width: 1099px) and (max-height: 899px)', flat);
      mm.add('(max-width: 767px)', flat);
      mm.add('(min-width: 768px) and (max-width: 1099px) and (min-height: 900px)', flat);
    }

    if (!cssTl) {
      /* ── Портфолио: шторка, параллакс картинки внутри рамки ── */
      $$('.sv-work-img').forEach(function (frame) {
        scrub(frame, { clipPath: 'inset(18% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)' }, {
          trigger: frame, start: 'top bottom', end: function () { return 'top bottom-=' + Math.round(frame.offsetHeight * .8); }
        });
        var im = $('img', frame);
        if (im) scrub(im, { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14 }, { trigger: frame, start: 'top bottom', end: 'bottom top' });
      });

      /* ── Финальный призыв: фон медленно увеличивается ── */
      var ctaImg = $('.sv-cta-bg img');
      if (ctaImg) scrub(ctaImg, { scale: 1 }, { scale: 1.12 }, { trigger: '.sv-cta', start: 'top bottom', end: 'bottom top' });

      /* ── Надпись в подвале: слова въезжают слева и проявляются ── */
      var wm = $('.ed-wordmark');
      if (wm) {
        var tail = $('span:last-child', wm);
        var wmEnd = 'bottom bottom';
        scrub(wm, { '--wm': '100%' }, { '--wm': '0%' }, { trigger: wm, start: 'top bottom', end: wmEnd });
        if (tail) scrub(tail, { '--wm2': '100%' }, { '--wm2': '0%' }, {
          trigger: wm, start: function () { return 'top bottom-=' + Math.round(wm.offsetHeight * .25); }, end: wmEnd
        });
      }

    }

    /* ── Навигация по разделам: от 1280 px ── */
    mm.add('(min-width: 1280px)', function () {
      var toc = $('.sv-toc');
      if (!toc) return;
      var links = $$('a', toc);
      scrub(toc, { opacity: 0, visibility: 'hidden' }, { opacity: 1, visibility: 'visible' }, { trigger: document.body, start: 500, end: 800 });
      links.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        var sec = document.getElementById(id);
        if (!sec) return;
        // «Ванная»: отзывы и вопросы выезжают в прилипшем слое, их собственное положение на странице не годится. Границы считаем по шкале выезда (.vn-tl2):
        // этапы — до середины въезда «Отзывов» (14 % шкалы), «Отзывы» — до середины въезда «Вопросов» (69 %), «Вопросы» — до конца секции.
        // «Капремонт вторички»: портфолио въезжает в прилипшем слое (.vo-tl2, шкала --t-over). Этапы идут до середины въезда (40 % шкалы), «Работы» — после, до конца секции.
        var vtl2 = $('.vo-tl2');
        if (vtl2 && getComputedStyle(vtl2).display !== 'none' && (id === 'steps' || id === 'works')) {
          var VT = function () { return vtl2.getBoundingClientRect().top + window.pageYOffset + .4 * (vtl2.offsetHeight - H()); };
          var vFrom = id === 'steps' ? function () { return $('#steps').getBoundingClientRect().top + window.pageYOffset - H() * .55; } : VT;
          var vTo = id === 'steps' ? VT : function () { return $('#steps').getBoundingClientRect().bottom + window.pageYOffset - H() * .55; };
          ScrollTrigger.create({ start: vFrom, end: vTo, invalidateOnRefresh: true, onToggle: function (self) { a.classList.toggle('is-on', self.isActive); } });
          return;
        }
        var tl2 = $('.vn-tl2');
        var hzMode = tl2 && getComputedStyle(tl2).display !== 'none' && (id === 'steps' || id === 'reviews' || id === 'faq');
        if (hzMode) {
          var T2 = function () { return tl2.getBoundingClientRect().top + window.pageYOffset; };
          var R2 = function () { return tl2.offsetHeight - H(); };
          var at = function (p) { return function () { return T2() + p * R2(); }; };
          var from = { steps: function () { return $('#steps').getBoundingClientRect().top + window.pageYOffset - H() * .55; }, reviews: at(.14), faq: at(.69) }[id];
          var to = { steps: at(.14), reviews: at(.69), faq: function () { return $('#steps').getBoundingClientRect().bottom + window.pageYOffset - H() * .55; } }[id];
          ScrollTrigger.create({ start: from, end: to, invalidateOnRefresh: true, onToggle: function (self) { a.classList.toggle('is-on', self.isActive); } });
          return;
        }
        ScrollTrigger.create({
          trigger: sec, start: 'top 55%',
          // у закреплённых этапов раздел длится, пока секция закреплена
          end: function () { return (id === 'steps' && pinST) ? pinST.end : 'bottom 55%'; },
          onToggle: function (self) { a.classList.toggle('is-on', self.isActive); }
        });
      });
      return function () { links.forEach(function (a) { a.classList.remove('is-on'); }); };
    });

    /* ── Пересчёт после загрузки картинок и шрифтов ── */
    var refresh = function () { ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }
})();
