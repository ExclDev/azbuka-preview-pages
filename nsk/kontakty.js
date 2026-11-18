/* «О компании и контакты» (/kontakty/): карта и поздняя загрузка кадров первого экрана. Движение — CSS (kontakty.css), скрипта на прокрутке для него нет.
   Кадры 2 и 3 карточки первого экрана (img[data-ok-src], декоративные) получают src при первой прокрутке, касании или нажатии клавиши: до этого грузится только портрет (LCP).
   Карта Яндекса: iframe без src, адрес лежит в data-map-src. Грузится, когда блок подходит к экрану (за 300 px), а не при открытии страницы.
   Щит «Нажмите, чтобы двигать карту» лежит поверх: пока на него не нажали, карта не перехватывает прокрутку и масштаб колесом.
   Без IntersectionObserver карта грузится сразу. */
(function () {
  'use strict';

  var late = document.querySelectorAll('img[data-ok-src]');
  function loadLate() {
    ['scroll', 'touchstart', 'keydown', 'wheel'].forEach(function (t) { window.removeEventListener(t, loadLate); });
    Array.prototype.forEach.call(late, function (img) { img.src = img.getAttribute('data-ok-src'); });
  }
  if (late.length) ['scroll', 'touchstart', 'keydown', 'wheel'].forEach(function (t) { window.addEventListener(t, loadLate, { passive: true }); });

  var box = document.querySelector('[data-ok-map]');
  if (!box) return;
  var frame = box.querySelector('iframe');
  var shield = box.querySelector('.ok-shield');
  var src = box.getAttribute('data-map-src');

  var loaded = false;
  function load() {
    if (loaded || !frame || !src) return;
    loaded = true;
    frame.src = src;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { load(); io.disconnect(); }
    }, { rootMargin: '300px 0px' });
    io.observe(box);
  } else {
    load();
  }

  if (shield) {
    shield.addEventListener('click', function () {
      load();                 // нажали раньше, чем карта дошла до экрана: грузим сейчас
      shield.hidden = true;
      if (frame) frame.focus({ preventScroll: true });
    });
  }
})();
