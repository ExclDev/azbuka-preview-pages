/* «Дизайн проект»: шторка чертёж → интерьер, галочки списка, акцент плашки */
(function () {
  'use strict';
  var sec = document.querySelector('.tech');
  if (!sec) return;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  var on = { a: true, b: true, c: true, d: true };

  /* А: слой-«чертёж» поверх фото и линия шторки */
  var box = sec.querySelector('.tech-img');
  var img = box && box.querySelector('img');
  if (box && img) {
    var sk = document.createElement('img');
    sk.className = 'tx-sketch'; sk.src = img.getAttribute('src'); sk.alt = ''; sk.setAttribute('aria-hidden', 'true');
    var ln = document.createElement('i');
    ln.className = 'tx-line'; ln.setAttribute('aria-hidden', 'true');
    box.appendChild(sk); box.appendChild(ln);
    if (hasG) {
      ScrollTrigger.create({
        trigger: box, start: 'top 75%', end: 'bottom 45%', scrub: 0.5,
        onUpdate: function (self) { box.style.setProperty('--tx', (self.progress * 100).toFixed(2) + '%'); }
      });
    }
  }

  /* Б: галочки в списке */
  var lis = [].slice.call(sec.querySelectorAll('.tech-features li'));
  lis.forEach(function (li) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 20 20'); s.setAttribute('class', 'tx-chk'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    li.insertBefore(s, li.firstChild);
  });
  function playList() {
    lis.forEach(function (li, i) {
      li.classList.remove('tx-on');
      setTimeout(function () { li.classList.add('tx-on'); }, 200 + i * 180);
    });
  }
  /* В: плашка */
  var alertBox = sec.querySelector('.tech-alert');
  function playAlert() {
    if (!alertBox) return;
    alertBox.classList.remove('tx-on'); void alertBox.offsetWidth; alertBox.classList.add('tx-on');
  }
  if (hasG) {
    ScrollTrigger.create({ trigger: sec.querySelector('.tech-features'), start: 'top 85%', onEnter: function () { if (on.b) playList(); } });
    ScrollTrigger.create({ trigger: alertBox, start: 'top 85%', onEnter: function () { if (on.c) playAlert(); } });
  }

  document.documentElement.classList.add('tx-wipe', 'tx-list', 'tx-alert', 'tx-title');
  if (hasG) ScrollTrigger.refresh();
})();
