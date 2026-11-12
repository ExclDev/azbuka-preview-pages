/* Первый экран: Б «Глубина» + В «Лента работ». */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var bg = document.querySelector('.hero-bg-img');
  if (!hero || !bg) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Б: наклон фото за курсором (только мышь) */
  if (window.gsap && fine && !reduce) {
    var content = hero.querySelector('.hero-content');
    var rx = gsap.quickTo(bg, 'rotationX', { duration: 1.2, ease: 'power3.out' });
    var ry = gsap.quickTo(bg, 'rotationY', { duration: 1.2, ease: 'power3.out' });
    var cx = content ? gsap.quickTo(content, 'x', { duration: 1.2, ease: 'power3.out' }) : function () {};
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 5); rx(py * -4); cx(px * 14);
    });
    hero.addEventListener('mouseleave', function () { rx(0); ry(0); cx(0); });
  }

  /* В: лента работ; клик открывает галерею сайта */
  var strip = document.createElement('div');
  strip.className = 'hv-strip';
  var sin = document.createElement('div');
  sin.className = 'hv-strip-in';
  strip.appendChild(sin);
  hero.appendChild(strip);
  fetch('images/portfolio/portfolio.json').then(function (r) { return r.json(); }).then(function (list) {
    var pick = [0, 2, 5, 10, 18, 22, 43, 1, 7, 19, 25, 24, 3, 20];
    var html = '';
    for (var rep = 0; rep < 2; rep++) {
      pick.forEach(function (i) {
        if (!list[i]) return;
        html += '<button type="button" data-i="' + i + '" aria-label="Открыть фото работы ' + (i + 1) + '"' + (rep ? ' tabindex="-1" aria-hidden="true"' : '') +
          '><img src="' + list[i].src + '" alt="" loading="lazy" /></button>';
      });
    }
    sin.innerHTML = html;
  }).catch(function () { strip.remove(); });
  sin.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && window.openPortfolioModal) window.openPortfolioModal(+b.getAttribute('data-i'));
  });
  /* Лента едет на Web Animations (transform на компоситоре), а не на requestAnimationFrame с записью стиля каждый кадр.
     Скорость прежняя: 0,5 px за кадр при 60 Гц = 30 px/с. Стоит при наведении и фокусе, вне экрана и при prefers-reduced-motion. */
  var paused = false, visible = true, stripAnim = null;
  function syncStrip() {
    if (!stripAnim) return;
    if (!paused && visible) stripAnim.play(); else stripAnim.pause();
  }
  function startStrip() {
    if (reduce || !sin.animate) return;
    var half = sin.scrollWidth / 2;
    if (!half) return;
    var prev = 0;
    if (stripAnim) {
      var d = stripAnim.effect.getTiming().duration;
      prev = ((stripAnim.currentTime || 0) % d) / d;
      stripAnim.cancel();
    }
    var dur = half / 30 * 1000;
    stripAnim = sin.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (-half) + 'px,0,0)' }],
      { duration: dur, iterations: Infinity, easing: 'linear' }
    );
    stripAnim.currentTime = prev * dur;
    syncStrip();
  }
  strip.addEventListener('mouseenter', function () { paused = true; syncStrip(); });
  strip.addEventListener('mouseleave', function () { paused = false; syncStrip(); });
  strip.addEventListener('focusin', function () { paused = true; syncStrip(); });
  strip.addEventListener('focusout', function () { paused = false; syncStrip(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; syncStrip(); }).observe(strip);
  if (window.ResizeObserver) new ResizeObserver(startStrip).observe(sin);
})();
