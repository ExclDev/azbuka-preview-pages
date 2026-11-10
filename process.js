/* «Порядок работы»: засечки активной карточки, результат шага, финиш таймлайна */
(function () {
  'use strict';
  var sec = document.querySelector('.process');
  var aside = document.querySelector('.process-aside-inner');
  var wrap = document.querySelector('.process-steps');
  var steps = [].slice.call(document.querySelectorAll('.process-step'));
  if (!sec || !aside || !wrap || !steps.length) return;

  /* А: уголки-засечки на карточках */
  steps.forEach(function (st) {
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
      var m = document.createElement('i');
      m.className = 'pv-mark ' + c;
      m.setAttribute('aria-hidden', 'true');
      st.appendChild(m);
    });
  });

  /* В: что остаётся у клиента после шага: слева для активного шага, на узких экранах в карточке */
  var box = document.createElement('div');
  box.className = 'step-result';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<p class="step-result-label">На руках после шага</p><p class="step-result-value"></p>';
  aside.appendChild(box);
  var boxValue = box.querySelector('.step-result-value');
  steps.forEach(function (st) {
    var inline = document.createElement('p');
    inline.className = 'step-result-inline';
    inline.textContent = 'На руках: ' + st.getAttribute('data-result');
    st.appendChild(inline);
    /* шаг по необходимости: пунктирный отрезок линии */
    if (st.querySelector('.process-step-badge')) {
      st.classList.add('is-optional');
      var dash = document.createElement('i');
      dash.className = 'line-dash';
      dash.setAttribute('aria-hidden', 'true');
      st.appendChild(dash);
    }
  });

  /* Г: финиш таймлайна — тексты уже есть на сайте (плашка и кнопка первого экрана) */
  var fin = document.createElement('div');
  fin.className = 'pv-finish';
  fin.innerHTML =
    '<span class="pv-fin-dot" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
    '<p>Бесплатная смета <span>за 24 часа</span></p>' +
    '<button class="btn btn-red" type="button" onclick="openPopup(\'Порядок работы — Получить бесплатную смету\')">Получить бесплатную смету</button>';
  wrap.appendChild(fin);

  /* реакция на смену активного шага (класс is-on ставит motion.js) */
  var cur = -1;
  function onStep() {
    var n = steps.findIndex(function (s) { return s.classList.contains('is-on'); });
    if (n < 0 || n === cur) return;
    cur = n;
    boxValue.textContent = steps[n].getAttribute('data-result');
    boxValue.classList.remove('is-new');
    void boxValue.offsetWidth;
    boxValue.classList.add('is-new');
  }
  var mo = new MutationObserver(onStep);
  steps.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
  onStep();

  sec.classList.add('pv-grid', 'pv-fin');
  if (window.ScrollTrigger) ScrollTrigger.refresh();
  onStep();
})();
