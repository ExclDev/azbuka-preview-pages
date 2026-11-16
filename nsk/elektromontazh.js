/* Страница «Электромонтажные работы» (Новосибирск и Томск): звук ролика основателя на первом экране «Показал и снял» и пауза роликов вне экрана.
   Перенесено из макетов brand/maket-elektro-{nsk,tomsk}-2026-11-16 (el.js). Подключает layouts/service.njk, когда задан hero.show или sheet.
   Само движение (наезд крупных планов, прогресс-полоса, лист точек) задано CSS на шкалах --eb, --ca и скрипта не требует. */
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══ Звук: только по нажатию. Ролик идёт сначала один раз со звуком, по окончании снова беззвучная петля; при уходе с экрана звук выключается ═══ */
  var v = document.getElementById('ebVid'), b = document.getElementById('ebSnd'), tm = document.getElementById('ebT');
  function fmt(x) { x = Math.floor(x || 0); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); }
  function setSnd(on, noPlay) {
    v.muted = !on; v.loop = !on;
    if (on) { v.currentTime = 0; v.play().catch(function () {}); }
    else if (!noPlay && shown && !still) v.play().catch(function () {});
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('span').textContent = on ? 'Выключить звук' : 'Включить звук';
  }
  var shown = false;
  if (v && b) {
    b.addEventListener('click', function () { setSnd(v.muted); });
    v.addEventListener('ended', function () { setSnd(false); });
    v.addEventListener('timeupdate', function () { if (tm) tm.textContent = fmt(v.currentTime); });
  }

  /* ═══ Ролики первого экрана играют только на экране (при reduced-motion — стоят обложкой, звук по нажатию всё равно работает) ═══ */
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target, isMain = el === v;
      if (isMain) shown = e.isIntersecting;
      if (e.isIntersecting) { if (!still) el.play().catch(function () {}); }
      else { if (isMain && !v.muted) setSnd(false, true); el.pause(); }
    });
  }, { threshold: .15 });
  [].forEach.call(document.querySelectorAll('#top video'), function (el) { io.observe(el); });
})();
