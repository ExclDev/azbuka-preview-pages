/* Страница «Натяжные потолки» (Новосибирск и Томск): ролики играют только на экране, рассказ на объекте со звуком по кнопке.
   Перенесено из макетов brand/maket-potolki-2026-11-18 (build.py). Подключает layouts/service.njk, когда задан hero.canvas, lights или video.variant "talk".
   Движение первого экрана («Над полотном») — CSS на шкале --ph и скрипта не требует. Без reduced-motion ролики запускаются, когда видны хотя бы на пятую часть, и ставятся на паузу, когда ушли с экрана. */
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vids = [].slice.call(document.querySelectorAll('.ph-under video, .pt-tile video'));
  var talk = document.getElementById('pgVid'), btn = document.getElementById('pgSnd');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && !still) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: .2 });
    vids.forEach(function (v) { io.observe(v); });
    // рассказ (≈ 4 МБ) начинает грузиться, когда секция в полутора экранах; без звука идёт, пока секция на экране
    if (talk) {
      var near = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { talk.preload = 'auto'; near.disconnect(); }
      }, { rootMargin: '150% 0px' });
      near.observe(talk);
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!still || !talk.muted) { var p = talk.play(); if (p && p.catch) p.catch(function () {}); } }
        else { if (!talk.muted) sound(false); talk.pause(); }
      }, { threshold: .25 }).observe(talk);
    }
  }

  // звук: по кнопке ролик идёт сначала один раз со звуком; после конца, по второй нажатой кнопке или при уходе с экрана снова беззвучная петля
  function sound(on) {
    talk.muted = !on; talk.loop = !on;
    if (on) { talk.currentTime = 0; var p = talk.play(); if (p && p.catch) p.catch(function () { sound(false); }); }
    else if (!still) { var q = talk.play(); if (q && q.catch) q.catch(function () {}); }
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.querySelector('span').textContent = btn.getAttribute(on ? 'data-on' : 'data-off');
  }
  if (talk && btn) {
    btn.addEventListener('click', function () { sound(talk.muted); });
    talk.addEventListener('ended', function () { sound(false); });
  }
})();
