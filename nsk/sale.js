/* «Акция»: пересчёт цены, бегущая строка, живая рамка */
(function () {
  'use strict';
  var sec = document.querySelector('.sale');
  if (!sec) return;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  var on = { a: true, b: true, c: false, d: true };
  var priceEl = sec.querySelector('[data-sale-price]');
  var oldEl = sec.querySelector('[data-sale-price-old]');
  var titleEl = sec.querySelector('#sale-title');

  function num(t) { return parseInt(String(t).replace(/[^\d]/g, ''), 10) || 0; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  /* А: зачёркивание старой цены и отсчёт новой (значения берутся из текущего города) */
  var busy = false;
  function playPrice() {
    if (!hasG || !priceEl || !oldEl || busy) return;
    var finalText = priceEl.textContent;
    var from = num(oldEl.textContent), to = num(finalText);
    if (!from || !to) return;
    var tail = finalText.replace(/^[\d\s ]+/, '');
    busy = true;
    var o = { v: from };
    gsap.timeline({ onComplete: function () { priceEl.textContent = finalText; busy = false; } })
      .fromTo(oldEl, { '--sx': 0 }, { '--sx': 1, duration: .7, ease: 'power3.inOut' }, 0)
      .to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: function () {
        priceEl.textContent = fmt(Math.round(o.v / 10) * 10) + ' ' + tail.trim();
      } }, .4)
      .fromTo(priceEl, { scale: 1 }, { scale: 1.12, duration: .25, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '0% 60%' }, 1.75);
  }
  if (hasG && priceEl) {
    ScrollTrigger.create({ trigger: priceEl, start: 'top 85%', onEnter: function () { if (on.a) playPrice(); } });
  }

  /* Б: бегущая строка — тексты берутся из блока (заголовок акции и цена) */
  var band = document.createElement('div');
  band.className = 'sv-band';
  band.setAttribute('aria-hidden', 'true');
  var bin = document.createElement('div');
  bin.className = 'sv-band-in';
  band.appendChild(bin);
  sec.insertBefore(band, sec.firstChild);
  function fillBand() {
    var t = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
    var p = priceEl ? priceEl.textContent.trim() : '';
    var unit = '<span>' + t + '</span><span class="f">' + p + '</span>';
    var html = ''; for (var i = 0; i < 6; i++) html += unit;
    bin.innerHTML = html;
  }
  fillBand();
  var bx = 0, speed = 0.6, boost = 0;
  function tick() {
    if (on.b) {
      bx -= speed + boost; boost *= 0.92;
      var half = bin.scrollWidth / 2;
      if (half && -bx > half) bx += half;
      bin.style.transform = 'translate3d(' + bx + 'px,0,0)';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  if (hasG) ScrollTrigger.create({ trigger: sec, onUpdate: function (self) { boost = Math.min(12, Math.abs(self.getVelocity()) / 300); } });

  /* обновить тексты при смене города */
  new MutationObserver(function () { if (!busy) fillBand(); }).observe(priceEl || sec, { childList: true, characterData: true, subtree: true });

  sec.classList.add('sv-price', 'sv-marq', 'sv-frame');
  if (hasG) ScrollTrigger.refresh();
})();
