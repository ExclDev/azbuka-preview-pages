/* ═══ Статьи раздела /stati/: оглавление, чек-лист, таблица сравнения, калькулятор ═══
   Принятый макет: brand/maket-stati-2026-11-17/st.js. Без GSAP и без обработчика scroll: подсветка раздела идёт через IntersectionObserver.
   Всё, кроме подсветки и состояния «свёрнуто», работает и без этого скрипта: текст, вопросы (details) и чек-лист (checkbox) — обычная разметка. */
(function () {
  /* ═══ Оглавление: подсветка текущего раздела; до 1023 px свёрнуто в плашку «Содержание» ═══ */
  var toc = document.querySelector('.sa-toc-d');
  var mq = matchMedia('(max-width: 1023px)');
  function syncToc() { if (toc) toc.open = !mq.matches; }
  syncToc();
  if (mq.addEventListener) mq.addEventListener('change', syncToc);
  var links = [].slice.call(document.querySelectorAll('.sa-toc a'));
  var heads = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function setOn(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  /* Полоса наблюдения — верхние 30 % окна: заголовок входит в неё, когда поднялся выше 30 %, и выходит, когда ушёл вверх за экран.
     На каждое пересечение берём последний заголовок, который выше линии 30 %. */
  if (links.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function () {
      var cur = heads[0], line = innerHeight * 0.3 + 1;
      heads.forEach(function (h) { if (h && h.getBoundingClientRect().top <= line) cur = h; });
      if (cur) setOn(cur.id);
    }, { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] });
    heads.forEach(function (h) { if (h) io.observe(h); });
  }
  links.forEach(function (a) { a.addEventListener('click', function () { if (mq.matches && toc) toc.open = false; }); });

  /* ═══ Чек-лист: счётчики и отметки в браузере ═══ */
  var KEY = 'azbuka-stati-priemka-v1';
  var boxes = [].slice.call(document.querySelectorAll('.ck input[type=checkbox]'));
  if (boxes.length) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    boxes.forEach(function (b) { b.checked = !!saved[b.dataset.k]; });
    var all = document.getElementById('ckAll'), done = document.getElementById('ckDone');
    var count = function () {
      var n = 0;
      boxes.forEach(function (b) { if (b.checked) n++; });
      done.textContent = n; all.textContent = boxes.length;
      [].forEach.call(document.querySelectorAll('.ck-g'), function (g) {
        var c = g.querySelectorAll('input:checked').length, total = g.querySelectorAll('input').length, nb = g.querySelectorAll('.ck-gn b');
        nb[0].textContent = c; nb[1].textContent = total;
        g.classList.toggle('is-full', c === total);
      });
    };
    var save = function () {
      var o = {};
      boxes.forEach(function (b) { if (b.checked) o[b.dataset.k] = 1; });
      try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    };
    boxes.forEach(function (b) { b.addEventListener('change', function () { count(); save(); }); });
    document.getElementById('ckReset').addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); count(); save(); });
    document.getElementById('ckPrint').addEventListener('click', function () { print(); });
    count();
  }

  /* ═══ Таблица сравнения: на телефоне (до 767 px) переключатель колонок вместо трёх сразу; по умолчанию «Предчистовая» ═══ */
  [].forEach.call(document.querySelectorAll('.sa-table'), function (wrap) {
    var head = wrap.querySelectorAll('thead th');
    if (head.length < 4) return;
    wrap.classList.add('sa-cmp');
    [].forEach.call(wrap.querySelectorAll('tr'), function (tr) {
      [].forEach.call(tr.children, function (c, i) { c.setAttribute('data-c', i); });
    });
    var tabs = document.createElement('div');
    tabs.className = 'sa-cmp-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Какую отделку показать');
    var def = 1;
    var show = function (i) {
      wrap.setAttribute('data-show', i);
      [].forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', b.dataset.c == i ? 'true' : 'false'); });
    };
    [].forEach.call(head, function (h, i) {
      if (!i) return;
      if (/предчист/i.test(h.textContent)) def = i;
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = h.textContent; b.dataset.c = i;
      b.addEventListener('click', function () { show(i); });
      tabs.appendChild(b);
    });
    wrap.parentNode.insertBefore(tabs, wrap);
    show(def);
  });

  /* ═══ Калькулятор проекта: цены приходят из данных городов (data-prices: город → [обычная, при заказе ремонта]) ═══ */
  var calc = document.getElementById('calc');
  if (calc) {
    var P = {};
    try { P = JSON.parse(calc.getAttribute('data-prices') || '{}'); } catch (e) { P = {}; }
    var area = document.getElementById('calcArea'), range = document.getElementById('calcRange');
    var sale = document.getElementById('calcSale'), full = document.getElementById('calcFull');
    var rub = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/[   ]/g, ' ') + ' ₽'; };
    var upd = function (from) {
      var a = parseFloat(from.value);
      if (from === range) area.value = a; else if (a >= 20 && a <= 200) range.value = a;
      var c = calc.querySelector('input[name=calcCity]:checked').value;
      if (!(a > 0) || !P[c]) { sale.textContent = '—'; full.textContent = '—'; return; }
      sale.textContent = rub(a * P[c][1]); full.textContent = rub(a * P[c][0]);
    };
    area.addEventListener('input', function () { upd(area); });
    range.addEventListener('input', function () { upd(range); });
    [].forEach.call(calc.querySelectorAll('input[name=calcCity]'), function (r) { r.addEventListener('change', function () { upd(area); }); });
    upd(area);
  }
})();
