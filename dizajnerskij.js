/* Страница «Дизайнерский ремонт», Новосибирск: цвет комнат и видео в зоне видимости. Перенесено из макета brand/maket-dizajner-nsk-2026-11-14 (dr.js).
   Подключается layouts/service.njk, когда страница задаёт rooms или viz. При prefers-reduced-motion видео стоят обложкой, фон переключается без перехода (dizajnerskij.css). */
(function () {
  /* ═══ Цвет комнат: фон берёт цвет комнаты, которая сейчас в середине экрана ═══ */
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dr = document.getElementById('drRooms');
  if (dr) dr.querySelectorAll('.dr-room').forEach(function (r) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) dr.dataset.c = r.dataset.c; }); }, { rootMargin: '-45% 0px -45% 0px' }).observe(r);
  });
  /* видео играют только в зоне видимости; при reduced-motion стоят обложкой */
  document.querySelectorAll('.dr-frame video, .dv-frame video').forEach(function (v) {
    if (still) return;
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(function () {}); } else v.pause(); }); }, { threshold: .35 }).observe(v);
  });
})();
