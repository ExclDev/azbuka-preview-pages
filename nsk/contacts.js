/* «Контакты»: стрелка на строках-ссылках и прорисовка иконок при появлении */
(function () {
  'use strict';
  var items = [].slice.call(document.querySelectorAll('.contacts-item'));
  items.forEach(function (it) {
    if (it.querySelector('a[href^="tel:"], a[href^="mailto:"]')) {
      it.classList.add('ct-link');
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ct-arrow'); s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      it.appendChild(s);
    }
  });
  if (window.ScrollTrigger) {
    ScrollTrigger.batch(items, {
      start: 'top 88%', once: true,
      onEnter: function (b) { b.forEach(function (it, i) { setTimeout(function () { it.classList.add('ct-draw'); }, 200 + i * 160); }); }
    });
  } else {
    items.forEach(function (it) { it.classList.add('ct-draw'); });
  }
})();

/* Демо в окне просмотра: tel:/mailto: внутри рамки не открываются и оставляют пустую страницу.
   Поэтому в рамке клик копирует номер или почту и показывает уведомление сайта.
   На живом сайте (не в рамке) ссылки работают как обычно. */
(function () {
  'use strict';
  var inFrame = false;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  if (!inFrame) return;
  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a) return;
    e.preventDefault();
    var isTel = a.getAttribute('href').indexOf('tel:') === 0;
    var val = isTel ? a.textContent.trim() : a.getAttribute('href').replace(/^mailto:/, '');
    var done = function () { toast((isTel ? 'Номер скопирован: ' : 'Почта скопирована: ') + val); };
    try {
      navigator.clipboard.writeText(val).then(done, function () { toast(val); });
    } catch (err) { toast(val); }
  }, true);
})();
