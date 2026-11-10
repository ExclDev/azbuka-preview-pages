/* «Берём заботы на себя»: слова лида, веер карточек, свет за курсором */
(function () {
  'use strict';
  var sec = document.querySelector('.remote');
  if (!sec) return;
  var lead = sec.querySelector('.remote-lead');
  var cards = [].slice.call(sec.querySelectorAll('.remote-card'));
  var hasG = !!(window.gsap && window.ScrollTrigger);
  var on = { a: true, b: true, c: true };

  /* А: слова лида */
  var words = [];
  if (lead) {
    lead.innerHTML = lead.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="rw">' + w + '</span>';
    }).join(' ');
    words = [].slice.call(lead.querySelectorAll('.rw'));
    if (hasG) {
      ScrollTrigger.create({
        trigger: lead, start: 'top 85%', end: 'bottom 50%', scrub: true,
        onUpdate: function (self) {
          if (!on.a) return;
          var n = words.length, p = self.progress * (n + 4);
          words.forEach(function (w, i) { w.style.opacity = Math.max(0.15, Math.min(1, (p - i) / 4)); });
        }
      });
    }
  }

  /* Б: веер карточек */
  /* Порог 960 совпадает с @media (max-width: 960px) в index.html, где сетка становится одной колонкой:
     в колонке веер сдвигал карточки на всю ширину экрана. */
  var FX = [105, 0, -105], FR = [-7, 0, 7], FY = [30, 0, 30];
  if (hasG && cards.length === 3) {
    ScrollTrigger.create({
      trigger: sec.querySelector('.remote-grid'), start: 'top 100%', end: 'top 62%', scrub: 0.6,
      onUpdate: function (self) {
        var q = on.b && window.innerWidth > 960 ? 1 - self.progress : 0;
        cards.forEach(function (c, i) {
          gsap.set(c, { xPercent: FX[i] * q, rotation: FR[i] * q, yPercent: FY[i] * q * 0.4 });
        });
      }
    });
  }

  /* В: свет за курсором и прорисовка иконки */
  cards.forEach(function (c) {
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    c.addEventListener('mouseenter', function () {
      if (!on.c) return;
      c.classList.remove('rv-draw'); void c.offsetWidth; c.classList.add('rv-draw');
    });
  });
  if (hasG) {
    ScrollTrigger.batch(cards, {
      start: 'top 85%',
      onEnter: function (b) { if (on.c) b.forEach(function (c, i) { setTimeout(function () { c.classList.add('rv-draw'); }, i * 150); }); }
    });
  }

  sec.classList.add('rv-words', 'rv-fan', 'rv-glow');
  if (hasG) ScrollTrigger.refresh();
})();
