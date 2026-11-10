/* Блок консультации — вариант Г: фото фоном, форма в карточке, шкала заполнения */
(function () {
  'use strict';
  var inner = document.querySelector('.consult-inner');
  var formBox = document.querySelector('.consult-form');
  var form = document.getElementById('mainForm');
  if (!inner || !formBox || !form) return;
  var hasG = !!(window.gsap && window.ScrollTrigger);

  /* фото фоном (А, Г) — готовый интерьер из портфолио */
  var bg = document.createElement('div');
  bg.className = 'ed-cbg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = '<img src="images/portfolio/portfolio-02.webp" alt="" loading="lazy" />';
  inner.insertBefore(bg, inner.firstChild);

  /* карточка формы (А, Г): подзаголовок + форма */
  var card = document.createElement('div');
  card.className = 'ed-ccard';
  var sub = formBox.querySelector('.form-subtitle');
  formBox.insertBefore(card, sub || form);
  if (sub) card.appendChild(sub);
  card.appendChild(form);

  /* шкала заполнения (Б, Г) */
  var prog = document.createElement('div');
  prog.className = 'ed-cprog';
  prog.setAttribute('aria-hidden', 'true');
  prog.innerHTML = '<i></i>';
  var submit = form.querySelector('.form-submit');
  form.insertBefore(prog, submit);
  var fields = [].slice.call(form.querySelectorAll('.form-field'));
  function check() {
    var done = 0, nameOk = false, phoneOk = false;
    fields.forEach(function (f) {
      var el = f.querySelector('input, select');
      if (!el) return;
      var v = (el.value || '').trim();
      var ok = el.id === 'f-phone' ? v.replace(/\D/g, '').length >= 11 : v !== '';
      f.classList.toggle('is-done', ok);
      if (ok) done++;
      if (el.id === 'f-name') nameOk = ok;
      if (el.id === 'f-phone') phoneOk = ok;
    });
    prog.firstChild.style.transform = 'scaleX(' + (done / fields.length) + ')';
    inner.classList.toggle('is-ready', nameOk && phoneOk);
  }
  form.addEventListener('input', check);
  form.addEventListener('change', check);
  check();

  /* движение */
  if (hasG) {
    gsap.fromTo(bg.firstChild, { scale: 1.18 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: inner, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }
  function playIn(v) {
    if (!hasG) return;
    if (v === 'a' || v === 'd') {
      gsap.fromTo(card, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' });
      gsap.fromTo(card.querySelectorAll('.form-field, .form-submit'), { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .06, delay: .2, clearProps: 'opacity,transform' });
    }
    if (v === 'b') {
      gsap.fromTo(prog, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: .9, ease: 'expo.out' });
    }
    if (v === 'c') {
      gsap.fromTo(formBox.querySelectorAll('.consult-form-title .mo-in'), { yPercent: 110 },
        { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .12 });
      gsap.fromTo(form.querySelectorAll('.form-field, .form-submit'), { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .08, delay: .3 });
    }
  }

  inner.classList.add('v-photo', 'v-prog');
  if (hasG) {
    ScrollTrigger.create({
      trigger: inner, start: 'top 75%', once: true,
      onEnter: function () { playIn('d'); }
    });
  }
})();
