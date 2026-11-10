/* ═══ priemka.js: движение страницы «Приёмка квартиры». Подключается после service.js только там, где есть hero.laser, check, act или video. ═══
   1. Первый экран: перекрестие догоняет курсор (pointermove + rAF), луч с точкой опускаются при прокрутке, кадр медленно растёт.
      Лучи и точка стоят на --cx, --cy, --drop (см. priemka.css). Опускание и курсор складываются: точка = (cx, cy + drop), всегда на пересечении лучей.
   2. «Обход квартиры»: стены плана прорисовываются при прокрутке. Сам выбор комнаты работает без JS (радиокнопки и :has).
   3. «Акт осмотра»: строки образца появляются при прокрутке, в конце ставится штамп.
   4. «Видео»: плеер без GSAP (кнопка «Смотреть со звуком», главы, подсветка текущей главы), см. initVideo.
   Наезд блока на первый экран сделан на CSS (view timeline), здесь его нет.
   Первая часть не зависит от GSAP. Остальное — ScrollTrigger из vendor/, как в service.js; при prefers-reduced-motion или без GSAP
   скрипт ничего не прячет и не двигает: перекрестие встаёт сразу под курсор, остальное стоит в конечном состоянии. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ═══ 1. Первый экран «Лазерный уровень» ═══ */
  (function initLaser() {
    var stage = $('.pkB-stage');
    if (!stage) return;
    var HOME = { x: 72, y: 46 };          // исходная точка перекрестия, % кадра (то же, что запасные значения в css)
    var TAU = 0.15;                       // постоянная догоняния, с: 95 % пути за ≈0,45 с
    var cur = { x: HOME.x, y: HOME.y }, tgt = { x: HOME.x, y: HOME.y };
    var drop = 0, zoom = 1, raf = 0, last = 0;
    var over = false, px = 0, py = 0;     // курсор над кадром и его положение в окне: при прокрутке кадр уезжает из-под него
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

    function scrollState() {
      if (reduce) { drop = 0; zoom = 1; return; }
      var y = window.pageYOffset;
      drop = clamp(y / 700, 0, 1) * 16;            // луч и точка опускаются на 16 % кадра за первые 700 px
      zoom = 1 + .12 * clamp(y / 800, 0, 1);       // кадр растёт на 12 % за первые 800 px
    }
    function paint() {
      stage.style.setProperty('--cx', cur.x.toFixed(3) + '%');
      stage.style.setProperty('--cy', cur.y.toFixed(3) + '%');
      stage.style.setProperty('--drop', drop.toFixed(3) + '%');
      stage.style.setProperty('--z', zoom.toFixed(4));
    }
    function aim() {
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tgt.x = clamp((px - r.left) / r.width * 100, 0, 100);
      tgt.y = clamp((py - r.top) / r.height * 100, 0, 100);
    }
    function tick(t) {
      raf = 0;
      scrollState();
      if (over) aim();
      var dt = last ? Math.min(.05, (t - last) / 1000) : .016;
      last = t;
      var k = reduce ? 1 : 1 - Math.exp(-dt / TAU);
      cur.x += (tgt.x - cur.x) * k;
      cur.y += (tgt.y - cur.y) * k;
      var moving = Math.abs(tgt.x - cur.x) > .01 || Math.abs(tgt.y - cur.y) > .01;
      if (!moving) { cur.x = tgt.x; cur.y = tgt.y; last = 0; }
      paint();
      if (moving) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    scrollState(); paint();

    // указатель: только мышь. На тач-экранах слушателей нет, перекрестие стоит в исходной точке
    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      over = true; px = e.clientX; py = e.clientY;
      aim();
      kick();
    }
    function onLeave() { over = false; tgt.x = HOME.x; tgt.y = HOME.y; kick(); }
    function bind() {
      var on = fine.matches;
      stage.classList.toggle('is-track', on);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (on) {
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerleave', onLeave);
      } else { onLeave(); }
    }
    bind();
    if (fine.addEventListener) fine.addEventListener('change', bind);
  })();

  /* ═══ 4. «Видео» на объекте ═══
     Не зависит от GSAP и от prefers-reduced-motion: плеер нужен всем. preload="none": пока посетитель не нажал, ролик не качается.
     Запуск любым способом (кнопка, глава, контролы плеера) скрывает кнопку и включает обычные контролы. Запуск всегда со звуком:
     вызывается из клика, поэтому браузер разрешает. Перемотка по главе при preload="none" возможна только после loadedmetadata,
     иначе currentTime запишется в видео без длительности и ролик стартует с нуля. Для перемотки нужны Range-запросы (Accept-Ranges). */
  (function initVideo() {
    var v = $('#pvVideo'), btn = $('#pvPlay');
    if (!v) return;
    var chs = $$('.pv-ch');
    var pending = null;                       // секунда, на которую перемотать, когда придут метаданные

    function started() { v.controls = true; if (btn) btn.hidden = true; }
    function applyPending() {
      if (pending == null) return;
      var t = pending; pending = null;
      try { v.currentTime = t; } catch (e) { /* перемотка не удалась: ролик пойдёт с начала */ }
    }
    function play() {
      var r = v.play();
      // запуск мог не разрешиться (политика браузера): возвращаем кнопку, чтобы нажать ещё раз
      if (r && r.catch) r.catch(function () { if (v.paused && btn) { btn.hidden = false; v.controls = false; } });
    }
    function go(t) {
      started();
      if (t == null) { play(); return; }
      if (v.readyState >= 1) { pending = null; v.currentTime = t; play(); return; }
      pending = t;
      v.addEventListener('loadedmetadata', applyPending, { once: true });
      play();                                  // запускает загрузку; перемотка сработает на loadedmetadata
    }
    function mark() {
      var cur = -1;
      chs.forEach(function (b, i) { if (v.currentTime >= +b.dataset.t) cur = i; });
      chs.forEach(function (b, i) {
        var on = i === cur && !v.paused && !v.ended;
        b.classList.toggle('on', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }

    if (btn) btn.addEventListener('click', function () { go(null); });
    chs.forEach(function (b) { b.addEventListener('click', function () { go(+b.dataset.t); }); });
    v.addEventListener('play', started);      // запуск из контролов плеера или с клавиатуры
    ['timeupdate', 'pause', 'ended', 'seeked', 'playing'].forEach(function (n) { v.addEventListener(n, mark); });
  })();

  /* ═══ 2–3. Движение при прокрутке (GSAP) ═══ */
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  var touched = [];
  try { initScroll(); } catch (err) {
    try { if (window.console) console.warn('priemka.js: движение отключено', err); } catch (e) { /* консоль недоступна */ }
    try { gsap.killTweensOf(touched); gsap.set(touched, { clearProps: 'all' }); } catch (e) { /* нечего возвращать */ }
  }

  function initScroll() {
    gsap.registerPlugin(ScrollTrigger);
    var H = function () { return window.innerHeight; };
    // позиция прокрутки по диапазону view-timeline макета (entry, cover), в пикселях страницы; считается заново при каждом refresh
    function vr(el, range, pct) {
      return function () {
        var r = el.getBoundingClientRect(), top = r.top + window.pageYOffset, h = r.height, p = pct / 100;
        if (range === 'entry') return top - H() + h * p;
        return top - H() + (H() + h) * p;
      };
    }
    function scrub(el, from, to, st) {
      touched = touched.concat(el);
      return gsap.fromTo(el, from, Object.assign(to, { ease: 'none', scrollTrigger: Object.assign({ scrub: true, invalidateOnRefresh: true }, st) }));
    }

    // стены и двери плана рисуются линией: у каждого пути свой диапазон, entry 10 % … cover 45 %
    $$('.pk-walls path, .pk-thin path').forEach(function (p) {
      scrub(p, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, strokeDasharray: 1 }, { trigger: p, start: vr(p, 'entry', 10), end: vr(p, 'cover', 45) });
    });

    // строки акта: entry 20 % … cover 45 % каждой строки
    $$('.pk-sheet tbody tr').forEach(function (tr) {
      scrub(tr, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { trigger: tr, start: vr(tr, 'entry', 20), end: vr(tr, 'cover', 45) });
    });
    // штамп: entry 60 % … cover 55 % самого штампа
    var stamp = $('.pk-stamp');
    if (stamp) scrub(stamp, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1 }, { trigger: stamp, start: vr(stamp, 'entry', 60), end: vr(stamp, 'cover', 55) });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
