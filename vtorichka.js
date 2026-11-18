/* ═══ vtorichka.js: «Капремонт вторички» и «Ремонт вторички». Шторка «до / после» первого экрана и карточки-пары портфолио (Томск),
   первый экран «Входим» и «Квартира по комнатам» (Новосибирск, префикс rv-) ═══
   GSAP не нужен. Без скриптов шторка стоит на 50 %, пары показывают «до». При prefers-reduced-motion шторка стоит на 50 %, проезда нет.
   «Входим» и «По комнатам»: при prefers-reduced-motion и Save-Data ничего не играет, стоят обложки, подписи маршрута «пройдено». */
(function () {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Шторка ── */
  var c = document.querySelector('.vI-cmp');
  if (c) {
    var r = c.querySelector('.vI-range'), po = c.querySelector('.vI-po'), dimg = c.querySelector('.vI-do');
    var tabs = [].slice.call(document.querySelectorAll('.vI-tab'));
    var base = c.getAttribute('data-base');
    var timer = 0;
    var vt = function (v) { v = Math.round(v); r.setAttribute('aria-valuetext', 'До ремонта ' + v + ' %, после ремонта ' + (100 - v) + ' %'); };
    var set = function (v) { c.style.setProperty('--x', v + '%'); r.value = v; vt(v); };
    r.addEventListener('input', function () { c.classList.remove('is-intro'); c.style.setProperty('--x', r.value + '%'); vt(r.value); });
    // проезд: с 88 % на 42 % за 1,8 с
    var intro = function () {
      c.classList.add('is-intro'); set(88);
      requestAnimationFrame(function () { requestAnimationFrame(function () { set(42); }); });
      clearTimeout(timer); timer = setTimeout(function () { c.classList.remove('is-intro'); }, 1900);
    };
    if (still) set(50); else { set(88); setTimeout(intro, 700); }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var k = t.getAttribute('data-k');
        if (k === c.getAttribute('data-k')) return;
        tabs.forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
        var go = function () {
          c.setAttribute('data-k', k);
          po.src = base + k + '-posle.webp'; po.alt = t.getAttribute('data-alt-po');
          dimg.src = base + k + '-do.webp'; dimg.alt = t.getAttribute('data-alt-do');
          var done = function () { c.classList.remove('is-swap'); if (!still) intro(); };
          (po.decode ? Promise.all([po.decode(), dimg.decode()]).catch(function () {}) : Promise.resolve()).then(done);
        };
        if (still) { go(); return; }
        c.classList.add('is-swap'); setTimeout(go, 280);
      });
    });
  }

  /* ── Пары портфолио: нажатие переключает «до» и «после», наведение (мышь) показывает «после» на CSS ── */
  [].slice.call(document.querySelectorAll('.vw')).forEach(function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
  });
  /* ── Новосибирск: «Входим» и «Квартира по комнатам». Блоки ищутся по своим классам: на странице Томска этого кода нет в деле ── */
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var calm = still || saveData;

  /* Первый экран «Входим»: ролик играет, пока карточка на экране (порог 0,4); полоски маршрута заполняются по timeupdate; после конца пауза 1,8 с и повтор */
  var walk = document.querySelector('[data-walk]');
  if (walk) {
    var wv = walk.querySelector('.rv-vid');
    var wl = [].slice.call(walk.querySelectorAll('.rv-route li'));
    var wt = wl.map(function (x) { return +x.getAttribute('data-t'); });
    if (calm) {
      wl.forEach(function (x) { x.classList.add('done'); });
      if (saveData) wv.preload = 'none';
    } else {
      var seen = false, again = 0;
      var paint = function () {
        var t = wv.currentTime, end = wv.duration || 1e9;
        wl.forEach(function (x, i) {
          var a = wt[i], b = i + 1 < wt.length ? wt[i + 1] : end;
          x.classList.toggle('done', t >= b);
          x.classList.toggle('on', t >= a && t < b);
          x.querySelector('b').style.width = t >= b ? '100%' : t >= a ? ((t - a) / (b - a) * 100) + '%' : '0';
        });
      };
      new IntersectionObserver(function (es) {
        seen = es[0].isIntersecting;
        clearTimeout(again);
        if (seen) wv.play().catch(function () {}); else wv.pause();
      }, { threshold: .4 }).observe(wv);
      wv.addEventListener('timeupdate', paint);
      wv.addEventListener('ended', function () {
        paint();
        clearTimeout(again);
        again = setTimeout(function () { wv.currentTime = 0; if (seen) wv.play().catch(function () {}); }, 1800);
      });
    }
  }

  /* «Квартира по комнатам»: активная комната пересекает середину окна (rootMargin -45 %); в прилипшем кадре играет только её ролик и только пока кадр на экране.
     До 960 px прилипшего кадра нет (display: none), ролик стоит в каждой комнате и играет, пока виден (порог 0,3). */
  var flat = document.getElementById('flat');
  if (flat) {
    var sv = [].slice.call(flat.querySelectorAll('.rv-stick video'));
    var lab = flat.querySelector('.rv-lab');
    var items = [].slice.call(flat.querySelectorAll('.rv-item'));
    var stickOn = false, cur = '1';
    var play = function (v) { if (calm) return; v.preload = 'auto'; v.play().catch(function () {}); };
    var set = function (r) {
      cur = r;
      items.forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-r') === r); });
      sv.forEach(function (v) {
        var on = v.getAttribute('data-r') === r;
        v.classList.toggle('on', on);
        if (on && stickOn) play(v); else v.pause();
      });
      var it = items.filter(function (x) { return x.getAttribute('data-r') === r; })[0];
      if (it && lab) lab.textContent = it.getAttribute('data-name');
    };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) set(e.target.getAttribute('data-r')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    items.forEach(function (x) { io.observe(x); });
    var stick = flat.querySelector('.rv-stick');
    if (stick) new IntersectionObserver(function (es) { stickOn = es[0].isIntersecting; set(cur); }).observe(stick);
    var mo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
    }, { threshold: .3 });
    [].forEach.call(flat.querySelectorAll('.rv-m'), function (v) { mo.observe(v); });
  }
})();
