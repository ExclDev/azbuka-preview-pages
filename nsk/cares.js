/* «Берём заботы на себя» (#why): ведомость забот. Разметка и CSS по умолчанию в конечном состоянии; здесь блок берётся под управление
   (класс .is-live), сбрасывается в начало и ведётся прокруткой. Без GSAP, при prefers-reduced-motion и без JS остаётся конечное состояние.
   Компьютер (от 1101 px, высота окна 700–1500): прилипший кадр, девять переносов ведёт ScrollTrigger scrub по дорожке.
   Телефон и планшет: один список, строка становится «нашей», когда её верх проходит 62 % высоты окна. */
(function () {
  'use strict';
  var sec = document.getElementById('why');
  var track = document.getElementById('caresTrack');
  if (!sec || !track) return;
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  var cares = [].slice.call(sec.querySelectorAll('.care'));
  var ours = cares.filter(function (c) { return c.hasAttribute('data-ours'); });
  var slots = [].slice.call(sec.querySelectorAll('.our-slot'));
  var proofs = [].slice.call(sec.querySelectorAll('.proof-i'));
  var tN = document.getElementById('caresN'), bN = document.getElementById('caresBarN');
  var N = ours.length;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* Для каждой строки «нашей» заботы: какой отзыв показывать (последний с отзывом среди строк до неё включительно) */
  var proofRows = proofs.map(function (p) { return +p.getAttribute('data-row'); });
  var proofFor = ours.map(function (row) {
    var idx = cares.indexOf(row), best = -1;
    proofRows.forEach(function (r) { if (r >= 0 && r <= idx && r > best) best = r; });
    return best;
  });

  var shownProof = null, lastCount = -1, lastDone = null;
  function setCount(n, done) {
    if (n !== lastCount) { tN.textContent = n; bN.textContent = n; lastCount = n; }
    if (done !== lastDone) { sec.classList.toggle('is-done', done); lastDone = done; }
  }
  function setProof(row) {
    if (row === shownProof) return;
    shownProof = row;
    proofs.forEach(function (p, i) { p.classList.toggle('on', proofRows[i] === row); });
  }

  /* Начальное состояние: ничего не перенесено */
  function resetStart() {
    ours.forEach(function (row, i) {
      row.style.setProperty('--k', 0); slots[i].style.setProperty('--k', 0);
      row.classList.remove('is-taken');
    });
    shownProof = null; lastCount = -1; lastDone = null;
    setCount(0, false); setProof(-1);
  }
  /* Конечное состояние: так блок выглядит без скрипта */
  function resetEnd() {
    ours.forEach(function (row, i) {
      row.style.removeProperty('--k'); slots[i].style.removeProperty('--k');
      row.classList.add('is-taken');
    });
    shownProof = null; lastCount = -1; lastDone = null;
    setCount(N, true); sec.classList.remove('is-done');
    proofs.forEach(function (p, i) { p.classList.toggle('on', i === proofs.length - 1); });
  }

  var mm = gsap.matchMedia();
  mm.add({
    desk: '(min-width: 1101px) and (min-height: 700px) and (max-height: 1500px)',
    mob: '(max-width: 1100px), (max-height: 699px), (min-height: 1501px)'
  }, function (ctx) {
    sec.classList.add('is-live');
    resetStart();
    var kLast = ours.map(function () { return -1; });
    var deskCleanup = null;

    if (ctx.conditions.desk) {
      /* Кадр стоит под панелью города (см. cares.css), поэтому дорожка начинается там же */
      var hh = function () { return parseFloat(getComputedStyle(sec).getPropertyValue('--city-bar-h')) || 36; };
      var stack = document.getElementById('whyStack');
      var about = stack && stack.querySelector('.about');
      var stage = sec.querySelector('.cares-stage');
      var start = 0.06, span = 0.74, step = span / N, win = step * 1.35;

      /* «О компании» прилипает (sticky, CSS), «Почему мы» выезжает на неё справа. Высоту «О компании» CSS берёт из --ab-h:
         пишем при смене размера, а не по кадрам. ws-tall: секция выше экрана под панелью города, она прилипает нижним краем. */
      var ro = null;
      if (stack && about) {
        var measure = function () {
          var h = about.offsetHeight;
          stack.style.setProperty('--ab-h', h + 'px');
          stack.classList.toggle('ws-tall', h > window.innerHeight - hh() + 1);
        };
        stack.classList.add('ws-live');
        measure();
        if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(about); }
        window.addEventListener('resize', measure);
      }

      /* Отрезок 1: выезд, translateX 100 % → 0, scrub без сглаживания, длина 100svh прокрутки с момента, когда кадр встал под панель города.
         Только transform (xPercent). Назад: сначала откатываются переносы (отрезок 2), потом блок уезжает вправо. */
      var slide = gsap.fromTo(stage, { xPercent: 100, x: 40 }, {   /* +40 px: тень у левого края (36 px) до начала выезда остаётся за экраном */
        xPercent: 0, x: 0, ease: 'none',
        scrollTrigger: { trigger: track, start: function () { return 'top top+=' + hh(); }, end: function () { return '+=' + window.innerHeight; }, scrub: true, invalidateOnRefresh: true }
      });
      var slideST = slide.scrollTrigger;
      /* Слой «О компании» прилип: включает сдвиг содержимого под показанную шапку */
      if (stack) {
        ScrollTrigger.create({
          trigger: track, start: function () { return 'top top+=' + hh(); }, endTrigger: stack, end: 'bottom bottom', invalidateOnRefresh: true,
          onToggle: function (self) { stack.classList.toggle('ws-pinned', self.isActive); }
        });
      }
      /* Отрезок 2: прежняя анимация, доли и тайминги не менялись; начало сдвинуто на длину выезда */
      ScrollTrigger.create({
        trigger: track, start: function () { return slideST.end; }, end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var p = self.progress, count = 0, latest = -1;
          for (var i = 0; i < N; i++) {
            var k = +ease(clamp((p - start - i * step) / win)).toFixed(3);
            if (k !== kLast[i]) {
              kLast[i] = k;
              ours[i].style.setProperty('--k', k); slots[i].style.setProperty('--k', k);
              ours[i].classList.toggle('is-taken', k > 0.5);
            }
            if (k > 0.5) { count++; latest = i; }
          }
          setProof(latest < 0 ? -1 : proofFor[latest]);
          setCount(count, p > start + span + 0.04);
        }
      });
      deskCleanup = function () {
        if (ro) ro.disconnect();
        window.removeEventListener('resize', measure);
        if (stack) { stack.classList.remove('ws-live', 'ws-pinned', 'ws-tall'); stack.style.removeProperty('--ab-h'); }
      };
    } else {
      var line = 0.62;
      var upd = function () {
        var count = 0;
        ours.forEach(function (r) { if (r.classList.contains('is-taken')) count++; });
        var last = cares[cares.length - 1].classList.contains('is-line');
        setCount(count, last);
        setProof(-1);
      };
      cares.forEach(function (row) {
        ScrollTrigger.create({
          trigger: row, start: 'top ' + (line * 100) + '%', end: 'max',
          onToggle: function (self) {
            var on = self.isActive;
            if (row.hasAttribute('data-ours')) row.classList.toggle('is-taken', on);
            if (row === cares[cares.length - 1]) row.classList.toggle('is-line', on);
            upd();
          }
        });
      });
    }
    ScrollTrigger.refresh();
    /* Откат (смена размера окна или режима): вернуть конечное состояние и убрать прилипание */
    return function () {
      if (deskCleanup) deskCleanup();
      sec.classList.remove('is-live');
      resetEnd();
    };
  });
})();
