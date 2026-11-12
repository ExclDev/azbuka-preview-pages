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
  /* Движение строки — Web Animations (transform на компоситоре), а не requestAnimationFrame с записью стиля каждый кадр.
     Скорость прежняя: 0,6 px за кадр при 60 Гц = 36 px/с. Строка стоит, пока блок вне экрана и при prefers-reduced-motion.
     Ускорение от скорости прокрутки (прежний boost) сохранено через playbackRate, пока оно не затухнет. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BAND_SPEED = 0.6, PX_PER_S = BAND_SPEED * 60;
  var bandAnim = null, bandLive = false, boost = 0, boosting = false;
  function startBand() {
    if (reduceMotion || !bin.animate) return;
    var half = bin.scrollWidth / 2;
    if (!half) return;
    var prev = 0;
    if (bandAnim) {
      var d = bandAnim.effect.getTiming().duration;
      prev = ((bandAnim.currentTime || 0) % d) / d;
      bandAnim.cancel();
    }
    var dur = half / PX_PER_S * 1000;
    bandAnim = bin.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (-half) + 'px,0,0)' }],
      { duration: dur, iterations: Infinity, easing: 'linear' }
    );
    bandAnim.currentTime = prev * dur;
    if (!bandLive) bandAnim.pause();
  }
  function boostLoop() {
    boost *= 0.92;
    if (!bandAnim || boost < 0.02) {
      boost = 0; boosting = false;
      if (bandAnim) bandAnim.updatePlaybackRate(1);
      return;
    }
    bandAnim.updatePlaybackRate(1 + boost / BAND_SPEED);
    requestAnimationFrame(boostLoop);
  }
  if (!reduceMotion) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        bandLive = en[0].isIntersecting;
        if (!bandAnim) return;
        if (bandLive) bandAnim.play(); else bandAnim.pause();
      }, { rootMargin: '80px 0px' }).observe(sec);
    } else { bandLive = true; }
    if (window.ResizeObserver) new ResizeObserver(startBand).observe(bin);
    startBand();
    if (hasG) ScrollTrigger.create({ trigger: sec, onUpdate: function (self) {
      boost = Math.min(12, Math.abs(self.getVelocity()) / 300);
      if (!boosting && bandAnim && bandLive) { boosting = true; requestAnimationFrame(boostLoop); }
    } });
  }

  /* обновить тексты при смене города */
  new MutationObserver(function () { if (!busy) { fillBand(); startBand(); } }).observe(priceEl || sec, { childList: true, characterData: true, subtree: true });

  sec.classList.add('sv-price', 'sv-marq', 'sv-frame');
  if (hasG) ScrollTrigger.refresh();
})();
