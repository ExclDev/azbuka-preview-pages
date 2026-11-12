/* dvideo.js: видео с объекта на странице «Технический проект» (blocks/video-stage.njk, Новосибирск).
   Плеер без GSAP: кнопка «Смотреть со звуком», перемотка по карточкам-решениям, подсветка карточки текущего момента.
   Видео грузится только по нажатию (preload="none"): перемотка до загрузки метаданных ждёт loadedmetadata.
   Наезд секции на «Листы проекта» сделан на CSS (service.css), здесь его нет. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(document.querySelectorAll('[data-dv]'), function (box) {
    var v = box.querySelector('.dv-v'), btn = box.querySelector('.dv-play');
    if (!v) return;
    var cards = Array.prototype.slice.call(box.querySelectorAll('.dv-card'));
    var pending = null;                       // секунда, на которую перемотать, когда придут метаданные

    function started() { v.controls = true; if (btn) btn.hidden = true; }
    function play() {
      var r = v.play();
      // запуск мог не разрешиться (политика браузера): возвращаем кнопку, чтобы нажать ещё раз
      if (r && r.catch) r.catch(function () { if (v.paused && btn) { btn.hidden = false; v.controls = false; } });
    }
    function applyPending() {
      if (pending == null) return;
      var t = pending; pending = null;
      try { v.currentTime = t; } catch (e) { /* перемотка не удалась: ролик пойдёт с начала */ }
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
      cards.forEach(function (b, i) { if (v.currentTime >= +b.dataset.t) cur = i; });
      cards.forEach(function (b, i) {
        var on = i === cur && !v.paused && !v.ended;
        b.classList.toggle('on', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }

    if (btn) btn.addEventListener('click', function () { go(null); });
    cards.forEach(function (b) {
      b.addEventListener('click', function () {
        go(+b.dataset.t);
        // на телефоне карточки стоят под плеером: подтягиваем плеер в экран, чтобы видео не играло за кадром
        var r = v.getBoundingClientRect();
        if (r.bottom < 80 || r.top > window.innerHeight - 80) v.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    v.addEventListener('play', started);      // запуск из контролов плеера или с клавиатуры
    ['timeupdate', 'pause', 'ended', 'seeked'].forEach(function (e) { v.addEventListener(e, mark); });
  });
})();
