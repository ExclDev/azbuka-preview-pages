/* ═══ vannaya.js: «Рентген» на первом экране страницы «Ванная под ключ» ═══
   Чертёж стены ванной лежит в двух слоях одного размера. Верхний слой («готовая ванная») закрыт круглой маской (service.css, .xr-fin),
   линза открывает нижний («под плиткой»). Центр линзы задают переменные --x и --y на .xr-stage (в пикселях блока), переход между точками делает CSS (@property).
   - Курсор: линза идёт за ним, обход на это время стоит.
   - Без курсора: каждые 2,6 с линза переходит к следующей из шести точек. Кнопки под чертежом наводят её на свою точку (aria-pressed).
   - Обход ставится на паузу, когда чертёж вне экрана или вкладка скрыта. При prefers-reduced-motion обхода нет: линза идёт только за курсором или по кнопке.
   - Точки заданы в координатах чертежа (viewBox 800 × 560) и пересчитываются в пиксели блока при каждом переходе и при смене размера.
   Скрипт не зависит от GSAP: он нужен всем, а не только посетителям с включённым движением. */
(function () {
  'use strict';
  var box = document.querySelector('[data-xr]');
  if (!box) return;
  var stage = box.querySelector('.xr-stage');
  var chips = [].slice.call(box.querySelectorAll('.xr-chip'));
  var note = box.querySelector('.xr-note');
  if (!stage || !chips.length) return;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VW = 800, VH = 560;           // viewBox чертежа
  var STEP = 2600;                  // пауза между точками обхода, мс
  var k = 0;                        // текущая точка
  var timer = null;
  var hand = 0;                     // когда посетитель последний раз управлял линзой сам (курсор или кнопка)
  var seen = true;                  // чертёж на экране

  function put(px, py) {
    stage.style.setProperty('--x', px + 'px');
    stage.style.setProperty('--y', py + 'px');
  }
  // координаты чертежа -> пиксели блока: SVG вписан с сохранением пропорций (xMidYMid meet)
  function at(x, y) {
    var r = stage.getBoundingClientRect();
    var s = Math.min(r.width / VW, r.height / VH);
    return [(r.width - VW * s) / 2 + x * s, (r.height - VH * s) / 2 + y * s];
  }
  function go(i) {
    k = i;
    var c = chips[i];
    var p = at(+c.dataset.x, +c.dataset.y);
    put(p[0], p[1]);
    chips.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
    if (note) note.innerHTML = '<b>' + c.querySelector('b').textContent + '.</b> ' + c.querySelector('span').textContent;
  }
  function tour() {
    if (hand || !seen || document.hidden) return;
    go((k + 1) % chips.length);
  }
  function start() { if (!still && !timer) timer = setInterval(tour, STEP); }
  // обход возобновляется, когда посетитель не трогал линзу достаточно давно
  function release(after) {
    setTimeout(function () { if (Date.now() - hand > after - 200) hand = 0; }, after);
  }

  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    hand = Date.now();
    stage.classList.add('is-hand', 'is-used');   // is-hand: без перехода, линза идёт строго за курсором
    put(e.clientX - r.left, e.clientY - r.top);
    chips.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  });
  stage.addEventListener('pointerleave', function () {
    stage.classList.remove('is-hand');
    release(2500);
  });
  chips.forEach(function (b, i) {
    b.addEventListener('click', function () {
      hand = Date.now();
      stage.classList.add('is-used');
      stage.classList.remove('is-hand');
      go(i);
      release(6000);
    });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; }).observe(stage);
  }
  // при смене размера точка пересчитывается заново; пока линза идёт за курсором, её не трогаем
  window.addEventListener('resize', function () { if (!stage.classList.contains('is-hand')) go(k); });

  // первая точка ставится без перехода, иначе линза поедет из левого верхнего угла
  stage.classList.add('is-hand');
  go(0);
  requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.remove('is-hand'); }); });
  start();
})();
