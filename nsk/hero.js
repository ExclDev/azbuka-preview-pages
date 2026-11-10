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
  var sx = 0, paused = false, visible = true;
  strip.addEventListener('mouseenter', function () { paused = true; });
  strip.addEventListener('mouseleave', function () { paused = false; });
  strip.addEventListener('focusin', function () { paused = true; });
  strip.addEventListener('focusout', function () { paused = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(strip);
  (function run() {
    if (!paused && visible && !reduce) {
      sx -= 0.5;
      var half = sin.scrollWidth / 2;
      if (half && -sx > half) sx += half;
      sin.style.transform = 'translate3d(' + sx + 'px,0,0)';
    }
    requestAnimationFrame(run);
  })();
})();
