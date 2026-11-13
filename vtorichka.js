/* ═══ vtorichka.js: «Капремонт вторички». Шторка «до / после» первого экрана и карточки-пары портфолио ═══
   GSAP не нужен. Без скриптов шторка стоит на 50 %, пары показывают «до». При prefers-reduced-motion шторка стоит на 50 %, проезда нет. */
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
})();
