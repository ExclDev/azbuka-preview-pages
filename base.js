/* ═══ base.js: общий код всех страниц (меню, попапы, заявки, виджеты, cookie). Собран из бывшего inline/script-app, script-cookie ═══ */
/* Первая отрисовка уже была? Скрипты движения (service.js, motion.js, home.js) прячут текст первого экрана и выводят его заново только
   если успели раньше неё. Если нет (медленная сеть), текст и кнопки остаются на месте. */
window.azPainted = function () {
  try { return performance.getEntriesByName('first-contentful-paint').length > 0; } catch (e) { return false; }
};
const burger     = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
/* Пока меню открыто, остальная страница (кроме шапки с бургером и самого меню) недоступна для фокуса и скринридера: inert */
function setPageInert(on) {
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (el === mobileMenu || el.id === 'cookieBanner' || el.classList.contains('header') || /^(SCRIPT|STYLE|NOSCRIPT|LINK)$/.test(el.tagName)) return;
    if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  });
}
burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', String(isOpen));
  document.documentElement.classList.toggle('scroll-locked', isOpen);
  document.querySelector('.header').classList.toggle('nvx-solid', isOpen);
  setPageInert(isOpen);
});
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('scroll-locked');
  document.querySelector('.header').classList.remove('nvx-solid');
  setPageInert(false);
}
/* Esc закрывает меню и возвращает фокус на бургер; Tab ходит по кругу: бургер → пункты меню → бургер */
document.addEventListener('keydown', (e) => {
  if (!mobileMenu.classList.contains('open')) return;
  if (e.key === 'Escape') { closeMobileMenu(); burger.focus(); return; }
  if (e.key !== 'Tab') return;
  const cookieBtn = document.getElementById('cookieAccept');
  const items = [burger].concat(Array.prototype.filter.call(
    mobileMenu.querySelectorAll('a[href], button:not([disabled])'),
    (n) => n.offsetParent !== null || getComputedStyle(n).position === 'fixed'
  ));
  if (cookieBtn && cookieBtn.offsetParent !== null) items.push(cookieBtn, ...document.querySelectorAll('#cookieBanner a[href]'));
  const i = items.indexOf(document.activeElement);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
  else if (!e.shiftKey && (i === items.length - 1 || i === -1)) { e.preventDefault(); items[0].focus(); }
});

/* ═══ Навигация: панели шапки и группы мобильного меню (12.11.2026) ═══
   Панель открывается наведением (только hover:hover), кликом и с клавиатуры; между пунктами перетекает: размер берётся из содержимого
   панели, сдвиг по X к пункту. Закрытие: уход курсора с шапки (150 мс), Esc (фокус возвращается на пункт), клик по затемнению,
   уход фокуса из шапки. Под prefers-reduced-motion панель меняется сразу (класс no-morph). */
(function () {
  var panel = document.getElementById('nvxPanel'), dim = document.getElementById('nvxDim');
  var header = document.querySelector('.header');
  var tops = [].slice.call(document.querySelectorAll('.nvx-top[data-pane]'));
  var panes = panel ? [].slice.call(panel.querySelectorAll('.nvx-pane')) : [];
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var hoverMq = matchMedia('(hover: hover)');
  var cur = '', closeT = 0;

  function paneOf(name) { return panes.filter(function (p) { return p.dataset.pane === name; })[0]; }
  function btnOf(name) { return tops.filter(function (b) { return b.dataset.pane === name; })[0]; }
  function place(btn, pane) {
    var hr = header.getBoundingClientRect(), br = btn.getBoundingClientRect();
    var w = pane.offsetWidth, h = pane.offsetHeight;
    var x = Math.max(16, Math.min(br.left - hr.left - 14, innerWidth - w - 16));
    panel.style.width = w + 'px'; panel.style.height = h + 'px';
    panel.style.setProperty('--nvx-x', x + 'px');
    document.documentElement.style.setProperty('--nvx-top', hr.bottom + 'px');
  }
  function open(name) {
    clearTimeout(closeT);
    var btn = btnOf(name), pane = paneOf(name);
    if (!btn || !pane) return;
    var wasOpen = !!cur;
    panel.classList.toggle('no-morph', !wasOpen || reduceMq.matches);
    place(btn, pane);
    panes.forEach(function (p) { p.classList.toggle('is-on', p === pane); });
    tops.forEach(function (b) { var on = b === btn; b.classList.toggle('is-on', on); b.setAttribute('aria-expanded', String(on)); });
    panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
    dim.classList.add('is-open');
    header.classList.add('nvx-solid');
    cur = name;
    if (!wasOpen) requestAnimationFrame(function () { panel.classList.remove('no-morph'); });
  }
  function close() {
    clearTimeout(closeT);
    if (!cur) return;
    panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true');
    dim.classList.remove('is-open');
    header.classList.remove('nvx-solid');
    tops.forEach(function (b) { b.classList.remove('is-on'); b.setAttribute('aria-expanded', 'false'); });
    cur = '';
  }
  function later() { clearTimeout(closeT); closeT = setTimeout(close, 150); }
  function links(pane) { return [].slice.call(pane.querySelectorAll('a[href]')); }

  if (panel && header && tops.length) {
    tops.forEach(function (b) {
      b.addEventListener('click', function () { cur === b.dataset.pane ? close() : open(b.dataset.pane); });
      b.addEventListener('mouseenter', function () { if (hoverMq.matches) open(b.dataset.pane); });
      /* Tab с открытого пункта идёт в ссылки панели: панель лежит в DOM после всей шапки */
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab' || e.shiftKey || cur !== b.dataset.pane) return;
        var l = links(paneOf(cur));
        if (l.length) { e.preventDefault(); l[0].focus(); }
      });
    });
    [].forEach.call(document.querySelectorAll('.header-nav .nvx-top:not([data-pane])'), function (a) {
      a.addEventListener('mouseenter', function () { if (hoverMq.matches) later(); });
    });
    panes.forEach(function (p) {
      p.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var l = links(p), i = l.indexOf(document.activeElement);
        if (e.shiftKey && i === 0) { e.preventDefault(); btnOf(p.dataset.pane).focus(); }
        else if (!e.shiftKey && i === l.length - 1) {
          /* из последней ссылки панели фокус идёт к следующему пункту строки меню */
          var b = btnOf(p.dataset.pane), next = b.nextElementSibling;
          while (next && next.getAttribute('aria-disabled') === 'true') next = next.nextElementSibling;
          close();
          if (next) { e.preventDefault(); next.focus(); }
        }
      });
      p.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href]')) close(); });
    });
    header.addEventListener('mouseleave', function () { if (hoverMq.matches) later(); });
    header.addEventListener('mouseenter', function () { clearTimeout(closeT); });
    dim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cur) { var b = btnOf(cur); close(); if (b) b.focus(); }
    });
    header.addEventListener('focusout', function (e) { if (cur && e.relatedTarget && !header.contains(e.relatedTarget)) close(); });
    addEventListener('resize', function () { if (cur) { if (innerWidth < 1366) close(); else open(cur); } });
    addEventListener('scroll', function () {
      if (cur) document.documentElement.style.setProperty('--nvx-top', header.getBoundingClientRect().bottom + 'px');
    }, { passive: true });
  }

  /* мобильное меню: группы раскрываются аккордеоном, открыта одна */
  [].forEach.call(document.querySelectorAll('.mm-row[data-acc]'), function (b) {
    b.addEventListener('click', function () {
      var on = !b.classList.contains('is-on');
      [].forEach.call(document.querySelectorAll('.mm-row[data-acc]'), function (x) {
        var me = x === b && on;
        x.classList.toggle('is-on', me); x.setAttribute('aria-expanded', String(me));
        var body = document.querySelector('[data-acc-body="' + x.dataset.acc + '"]');
        if (body) body.classList.toggle('is-on', me);
      });
    });
  });
})();

(function () {
  function getOffset() {
    var header = document.querySelector('.header');
    var cityBar = document.getElementById('cityBar');
    var h = 0;
    if (header)  h += header.offsetHeight;
    if (cityBar && !cityBar.classList.contains('hidden') &&
        getComputedStyle(cityBar).display !== 'none') {
      h += cityBar.offsetHeight;
    }
    return h + 12; 
  }
  function scrollToAnchor(hash) {
    var target = document.querySelector(hash);
    if (!target) return false;
    if (hash === '#works') {
      var sec = document.querySelector('.consult');
      if (sec) target = sec;
    }
    // «Ванная под ключ»: отзывы и вопросы выезжают справа налево в прилипшем слое, сами панели при прокрутке стоят на месте, поэтому ведём не к ним, а к моменту шкалы выезда
    // (.vn-tl2), когда нужная панель полностью видна: «Отзывы» 28–55 % шкалы (берём 41 %), «Вопросы» 83–100 % (берём 92 %). Режим выезда виден по опорному элементу: без view() и на узких экранах он скрыт.
    var tl2 = (hash === '#reviews' || hash === '#faq') ? document.querySelector('.vn-tl2') : null;
    if (tl2 && getComputedStyle(tl2).display !== 'none') {
      var p = hash === '#reviews' ? 0.41 : 0.92;
      window.scrollTo({ top: tl2.getBoundingClientRect().top + window.pageYOffset + p * (tl2.offsetHeight - window.innerHeight), behavior: 'smooth' });
      return true;
    }
    // секции стопки «Приёмки» на компьютере прилипают под шапку: отступ берётся из scroll-margin-top (--header-h), без запаса +12 px
    var stack = target.closest && target.closest('.pk-stack, .pk-stack2, .dp-stack, .vn') && window.matchMedia('(min-width: 1101px) and (min-height: 700px) and (max-height: 1500px)').matches;
    var margin = stack ? parseFloat(getComputedStyle(target).scrollMarginTop) : 0;
    var top = target.getBoundingClientRect().top + window.pageYOffset - (margin > 0 ? margin : getOffset());
    window.scrollTo({ top: top, behavior: 'smooth' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute('href');
    if (hash === '#' || hash.length < 2) return;
    if (document.querySelector(hash)) {
      e.preventDefault();
      scrollToAnchor(hash);
      if (typeof closeMobileMenu === 'function') closeMobileMenu();
    }
  });
})();
const scrollUpBtn = document.getElementById('scrollUpBtn');
const floatCta    = document.querySelector('.float-cta');
const qwWidgetEl  = document.getElementById('quickWidget');
function qwBaseBottom() {
  const w = window.innerWidth;
  if (w <= 480) return 80;
  if (w <= 768) return 140;
  return 220;
}
/* Плавающие кнопки поднимаются над подвалом. Раньше положение подвала читалось на каждую прокрутку (getBoundingClientRect → принудительный layout).
   Теперь высоту видимой части подвала отдаёт IntersectionObserver: пока подвал входит снизу, она равна прежнему «overlap».
   Порогов 200, поэтому шаг сдвига — доли процента высоты подвала; сам обработчик геометрию не читает. */
let footerOverlap = 0;
function applyFloatPosition() {
  if (!floatCta) return;
  const baseGap = window.innerWidth <= 768 ? 20 : 30;
  // --cookie-h: высота баннера cookie, пока он на экране (ставит блок cookie ниже); кнопки стоят над ним
  floatCta.style.bottom = 'calc(' + (footerOverlap > 0 ? baseGap + footerOverlap + 8 : baseGap) + 'px + var(--cookie-h, 0px))';
  if (qwWidgetEl) {
    qwWidgetEl.style.bottom = footerOverlap > 0 ? 'calc(' + (qwBaseBottom() + footerOverlap + 8) + 'px + var(--cookie-h, 0px))' : '';
  }
}
(function () {
  const footer = document.querySelector('.footer');
  if (!floatCta || !footer) return;
  if (!('IntersectionObserver' in window)) { applyFloatPosition(); return; }
  const thresholds = [];
  for (let i = 0; i <= 200; i++) thresholds.push(i / 200);
  new IntersectionObserver(function (entries) {
    const e = entries[entries.length - 1];
    const h = e.isIntersecting ? e.intersectionRect.height : 0;
    if (Math.abs(h - footerOverlap) < 0.5 && (h > 0) === (footerOverlap > 0)) return;
    footerOverlap = h;
    applyFloatPosition();
  }, { threshold: thresholds }).observe(footer);
})();
const siteHeader = document.querySelector('.header');
function updateHeaderBg() {
  if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 10);
}
updateHeaderBg();
window.addEventListener('scroll', () => {
  updateHeaderBg();
  if (window.scrollY > 400) {
    scrollUpBtn.classList.add('visible');
  } else {
    scrollUpBtn.classList.remove('visible');
  }
}, { passive: true });
window.addEventListener('resize', applyFloatPosition, { passive: true });
const overlay = document.getElementById('overlay');
/* Фокус после закрытия окна возвращается на кнопку, которая его открыла.
   Кнопку запоминаем при открытии; если её уже нет на странице, фокус просто остаётся где был. */
function restoreFocus(el) {
  if (el && el.focus && document.contains(el)) el.focus({ preventScroll: true });
}
let popupOpener = null;

/* Форма записи: тот же попап и та же форма popupFormInner, меняются заголовок, подпись и набор полей.
   booking = { title, note, date, complex } приходит со страницы (window.AZ_PAGE.booking, front matter).
   Без booking попап обычный: «Оставить заявку», площадь и вид ремонта. */
/* Обычный режим: заголовок и подпись выбираются по фрагменту строки-триггера (сами строки уходят в CRM
   в поле «кнопка» и не меняются). Нет совпадения — вариант по умолчанию. */
const POPUP_TEXTS = [
  { match: 'Получить бесплатную смету', title: 'Посчитаем смету бесплатно', note: 'Приедем на замер и за 24 часа пришлём предварительную смету.' },
  { match: 'Получить смету за 24 часа', title: 'Смета за 24 часа', note: 'Приедем на замер и через 24 часа после него пришлём предварительную смету. Бесплатно.' },
  { match: 'Заказать замер ванной', title: 'Замер ванной', note: 'Приедем, посмотрим трубы и расскажем, из чего сложится цена.' },
  { match: 'Обсудить проект', title: 'Обсудим ваш проект', note: 'Расскажем, что входит в технический проект, и договоримся о замере.' },
  { match: 'Заказать по акции', title: 'Технический проект за полцены', note: 'Скидка 50% действует, если ремонт делаем мы.' },
  { match: 'Обратный звонок', title: 'Перезвоним вам', note: 'Оставьте номер, перезвоним в рабочее время.' }
];
const POPUP_TEXT_DEFAULT = { title: 'Оставить заявку', note: 'Расскажем, из чего сложится цена, и договоримся о замере.' };
function popupTextFor(trigger) {
  const t = String(trigger || '');
  return POPUP_TEXTS.find(x => t.indexOf(x.match) !== -1) || POPUP_TEXT_DEFAULT;
}
function setPopupMode(booking, trigger) {
  const form = document.getElementById('popupFormInner');
  const on = !!booking;
  const txt = on ? { title: booking.title || 'Запись', note: booking.note || '' } : popupTextFor(trigger);
  form.dataset.mode = on ? 'booking' : '';
  form.dataset.title = on ? txt.title : '';
  document.getElementById('popup-heading').textContent = txt.title;
  const note = document.getElementById('popupNote');
  note.textContent = txt.note;
  note.hidden = !txt.note;
  document.getElementById('popupSubmit').textContent = on ? 'Записаться' : 'Отправить заявку';
  const show = { 'full': !on, 'booking-date': on && !!booking.date, 'booking-complex': on && !!booking.complex };
  form.querySelectorAll('[data-lead]').forEach(el => {
    el.hidden = !show[el.dataset.lead];
    if (el.hidden) el.querySelectorAll('input, select').forEach(i => { i.value = ''; });
  });
  const dateEl = document.getElementById('p-date');
  if (dateEl) {
    const d = new Date();
    dateEl.min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
}
function openPopup(trigger, booking) {
  popupOpener = document.activeElement;
  setPopupMode(booking, trigger);
  overlay.classList.add('open');
  document.documentElement.classList.add('scroll-locked');
  document.getElementById('popupFormBox').style.display = '';
  document.getElementById('popupSuccess').style.display  = 'none';
  document.getElementById('popupFormBox').focus({ preventScroll: true });
  // Попап открывают шесть разных кнопок, и менеджеру важно, какая именно:
  // «Заказать по акции» и «Обратный звонок» — разные сценарии разговора.
  window.AZ_LEAD.trigger = trigger || 'Всплывающее окно';
  window.AZ_LEAD.markOpened(document.getElementById('popupFormInner'));
  window.AZ_LEAD.clearError(document.getElementById('popupFormInner'));
}
function closePopup() {
  const was = overlay.classList.contains('open');
  overlay.classList.remove('open');
  document.documentElement.classList.remove('scroll-locked');
  if (was) restoreFocus(popupOpener);
}
/* Кнопки «Записаться…» на страницах услуг. Источник тот же, что у openPopup. */
function openBooking(trigger, booking) { openPopup(trigger, booking || { title: 'Запись', note: 'Перезвоним и договоримся о времени' }); }
overlay.addEventListener('click', e => { if (e.target === overlay) closePopup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePopup(); closeDevPopup(); } });
function openDevPopup() {
  document.getElementById('devOverlay').classList.add('open');
  document.documentElement.classList.add('scroll-locked');
}
function closeDevPopup() {
  document.getElementById('devOverlay').classList.remove('open');
  document.documentElement.classList.remove('scroll-locked');
}
document.getElementById('devOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('devOverlay')) closeDevPopup();
});
/* ══════════════════════════════════════════════════════════
   ОТПРАВКА ЗАЯВОК
   Раньше формы ничего не отправляли и всегда показывали «Заявка принята!».
   Теперь данные уходят на /api/lead.php, а экран успеха показывается
   только после подтверждения от сервера.
   ══════════════════════════════════════════════════════════ */
window.AZ_LEAD = (function () {
  const ENDPOINT = '/api/lead.php';

  // Какая кнопка открыла попап.
  const state = { trigger: '' };

  // Метки рекламной кампании берём при первом заходе и держим на вкладке:
  // человек может побродить по якорям, и query-строка потеряется.
  const UTM_KEY = 'az_utm';
  function captureUtm() {
    try {
      const q = new URLSearchParams(location.search);
      const found = {};
      ['source', 'medium', 'campaign', 'content', 'term'].forEach(k => {
        const v = q.get('utm_' + k);
        if (v) found['utm_' + k] = v.slice(0, 200);
      });
      if (Object.keys(found).length) {
        sessionStorage.setItem(UTM_KEY, JSON.stringify(found));
      }
    } catch (e) { /* приватный режим — меток просто не будет */ }
  }
  function readUtm() {
    try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  captureUtm();

  /* Телефон. Маска всегда подставляет «+7 », поэтому проверка на непустую
     строку пропускала пустой номер. Считаем именно цифры. */
  function phoneDigits(value) {
    let d = (value || '').replace(/\D/g, '');
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    if (d.length === 10) d = '7' + d;
    return d;
  }
  function phoneValid(value) {
    const d = phoneDigits(value);
    return d.length === 11 && d[0] === '7' && '3489'.indexOf(d[1]) !== -1;
  }

  function markOpened(formEl) {
    if (formEl) formEl.dataset.openedAt = String(Date.now());
  }
  function elapsed(formEl) {
    const t0 = Number(formEl && formEl.dataset.openedAt);
    return t0 ? Math.round((Date.now() - t0) / 1000) : 0;
  }

  function errorBox(formEl) { return formEl.querySelector('.form-error'); }
  function clearError(formEl) {
    const box = formEl && errorBox(formEl);
    if (box) { box.hidden = true; box.textContent = ''; }
    if (formEl) formEl.querySelectorAll('.form-input[aria-invalid]').forEach(clearField);
    clearConsent(formEl);
  }

  /* Ошибка поля: красная рамка (aria-invalid) и подпись под полем, как у галочки согласия.
     Подпись лежит в разметке рядом с полем (id поля + «-err», role="alert", hidden), поле ссылается на неё
     через aria-describedby. Рамка и подпись держатся, пока человек не начнёт вводить. */
  function fieldErrorEl(el) { return el && el.id ? document.getElementById(el.id + '-err') : null; }
  function clearField(el) {
    if (!el) return;
    el.removeAttribute('aria-invalid');
    const err = fieldErrorEl(el);
    if (err) err.hidden = true;
  }
  function markField(el) {
    if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    const err = fieldErrorEl(el);
    if (err) err.hidden = false;
  }
  document.addEventListener('input', e => {
    if (e.target.classList && e.target.classList.contains('form-input') && e.target.hasAttribute('aria-invalid')) clearField(e.target);
  });

  /* Согласие на обработку ПДн. Галочка по умолчанию снята, без неё заявка не уходит.
     Ошибка стоит у самой галочки и пропадает, как только её отметили. */
  function clearConsent(formEl) {
    const el = formEl && formEl.querySelector('.consent-input');
    if (!el) return;
    el.removeAttribute('aria-invalid');
    const err = formEl.querySelector('.consent-error');
    if (err) err.hidden = true;
  }
  function consentOk(formEl) {
    const el = formEl.querySelector('.consent-input');
    if (!el) return true;
    if (el.checked) { clearConsent(formEl); return true; }
    el.setAttribute('aria-invalid', 'true');
    const err = formEl.querySelector('.consent-error');
    if (err) err.hidden = false;
    el.focus();
    return false;
  }
  document.addEventListener('change', e => {
    if (e.target.classList && e.target.classList.contains('consent-input') && e.target.checked) clearConsent(e.target.form);
  });
  function showError(formEl, text) {
    const box = errorBox(formEl);
    const phone = (window.AZ_CITY && window.AZ_CITY.phone) || '';
    const href  = (window.AZ_CITY && window.AZ_CITY.phoneHref) || '';
    if (!box) { alert(text); return; }
    box.innerHTML = text + (phone ? ' Позвоните нам: <a href="' + href + '">' + phone + '</a>' : '');
    box.hidden = false;
  }

  /* Помечает все неверные поля, фокус уходит на первое из них */
  function highlight(els) {
    const list = [].concat(els).filter(Boolean);
    list.forEach(markField);
    if (list[0]) list[0].focus();
  }

  /* Город задаёт сайт, на котором оставили заявку: у каждого города свой
     сайт. Источник всегда «site». */
  function cityPayload() {
    const c = window.AZ_CITY || {};
    return {
      city: c.name || 'Не определён',
      city_source: 'site'
    };
  }

  /* Цель Метрики на успешную отправку. Счётчик есть не на каждом сайте:
     на сайте без счётчика YM_COUNTER_ID не объявлен и вызова не будет. */
  function reachGoal(goal) {
    if (!goal) return;
    try {
      if (typeof ym === 'function' && typeof YM_COUNTER_ID !== 'undefined' && YM_COUNTER_ID) {
        ym(YM_COUNTER_ID, 'reachGoal', goal);
      }
    } catch (e) { /* метрика не должна ломать отправку */ }
  }

  async function send(formEl, payload, onSuccess, goal) {
    const btn = formEl.querySelector('[type="submit"]');
    const btnText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }
    clearError(formEl);

    const body = Object.assign({
      company: (formEl.querySelector('[name="company"]') || {}).value || '',
      elapsed: elapsed(formEl),
      page: location.pathname,
      url: location.href,
      button: state.trigger || '',
      // Отметка о согласии: сюда доходит только отправка с отмеченной галочкой
      consent: !!(formEl.querySelector('.consent-input') || {}).checked
    }, cityPayload(), readUtm(), payload);

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      const data = await r.json().catch(() => ({}));
      if (r.ok && data && data.ok) {
        reachGoal(goal);
        onSuccess();
        formEl.reset();
        return;
      }
      if (data && data.error === 'phone')      showError(formEl, 'Проверьте номер телефона.');
      else if (data && data.error === 'name')  showError(formEl, 'Укажите, как к вам обращаться.');
      else if (data && data.error === 'rate')  showError(formEl, 'Слишком много заявок подряд. Попробуйте позже.');
      else showError(formEl, 'Не удалось отправить заявку.');
    } catch (e) {
      showError(formEl, 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btnText; }
    }
  }

  return { state, send, phoneValid, consentOk, highlight, markOpened, clearError, showError,
           get trigger() { return state.trigger; },
           set trigger(v) { state.trigger = v; } };
})();

function handleFormSubmit(e, formEl) {
  e.preventDefault();
  const nameEl  = formEl.querySelector('[autocomplete="given-name"], [name="name"]');
  const phoneEl = formEl.querySelector('[type="tel"]');
  const bad = [];
  if (!nameEl || !nameEl.value.trim()) bad.push(nameEl);
  if (!phoneEl || !AZ_LEAD.phoneValid(phoneEl.value)) bad.push(phoneEl);
  if (bad.length) { AZ_LEAD.highlight(bad); return; }
  if (!AZ_LEAD.consentOk(formEl)) return;

  const val = n => ((formEl.querySelector('[name="' + n + '"]') || {}).value || '').trim();
  const payload = formEl.dataset.mode === 'booking'
    // Запись: без площади и вида ремонта. Дата осмотра и ЖК идут отдельными полями, lead.php кладёт их в комментарий лида.
    ? { form: formEl.dataset.title || 'Запись', name: nameEl.value.trim(), phone: phoneEl.value.trim(),
        inspection_date: val('inspection_date'), complex: val('complex') }
    : {
        form: formEl.id === 'mainForm' ? 'Консультация' : 'Всплывающее окно',
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        // Выбора вида ремонта в формах больше нет (12.11.2026): ключ repair не отправляем, lead.php пропускает пустые значения
        area: (formEl.querySelector('[name="area"]') || {}).value || ''
      };
  AZ_LEAD.send(formEl, payload, function () {
    if (!overlay.classList.contains('open')) openPopup(AZ_LEAD.trigger);
    const isBooking = formEl.dataset.mode === 'booking';
    document.getElementById('popupSuccessText').textContent = isBooking
      ? 'Перезвоним в рабочее время и договоримся о дате.'
      : 'Перезвоним в рабочее время и договоримся о замере. Предварительную смету пришлём за 24 часа после него.';
    const city = window.AZ_CITY || {};
    const callEl = document.getElementById('popupSuccessCall');
    if (callEl) {
      callEl.hidden = !city.phone;
      const a = callEl.querySelector('a');
      if (a && city.phone) { a.textContent = city.phone; a.href = city.phoneHref || ('tel:' + city.phone.replace(/[^\d+]/g, '')); }
    }
    document.getElementById('popupFormBox').style.display = 'none';
    document.getElementById('popupSuccess').style.display = '';
  }, formEl.id === 'mainForm' ? 'lead_form' : 'lead_popup');
}
document.getElementById('popupFormInner').addEventListener('submit', e => handleFormSubmit(e, e.target));
document.querySelectorAll('[type="tel"]').forEach(el => {
  el.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    if (v.startsWith('7') || v.startsWith('8')) v = v.slice(1);
    let res = '+7 ';
    if (v.length > 0) res += '(' + v.slice(0, 3);
    if (v.length >= 3) res += ') ' + v.slice(3, 6);
    if (v.length >= 6) res += '-' + v.slice(6, 8);
    if (v.length >= 8) res += '-' + v.slice(8, 10);
    this.value = res;
  });
});
const animObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animObserver.unobserve(entry.target); 
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.anim').forEach(el => animObserver.observe(el));
function openVideo(id) {
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return;
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Закрыть видео');
  closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;font-size:32px;color:#fff;background:none;border:none;cursor:pointer;line-height:1;';
  closeBtn.addEventListener('click', () => backdrop.remove());
  const iframe = document.createElement('iframe');
  iframe.src   = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
  iframe.width  = '840';
  iframe.height = '472';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.style.cssText = 'max-width:90vw;max-height:50vh;';
  iframe.title = 'Видео о компании Азбука Ремонта';
  backdrop.appendChild(closeBtn);
  backdrop.appendChild(iframe);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  function escHandler(e) {
    if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', escHandler); }
  }
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(backdrop);
}
(function () {
  var widget = document.getElementById('quickWidget');
  if (!widget) return;
  var closeTimer = null;
  function collapse() {
    if (!widget.classList.contains('qw-expanded')) return;
    clearTimeout(closeTimer);
    widget.classList.add('qw-closing');
    widget.classList.remove('qw-expanded');
    setExpanded(false);
    closeTimer = setTimeout(function () {
      widget.classList.remove('qw-closing');
    }, 320);
  }
  function updateVisibility() {
    var shouldShow = window.pageYOffset > 300;
    if (shouldShow) {
      collapse();
      widget.classList.add('qw-visible');
    } else {
      collapse();
      widget.classList.remove('qw-visible');
    }
  }
  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
  var toggle = document.getElementById('qwToggle');
  function setExpanded(on) { if (toggle) toggle.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  widget.addEventListener('click', function (ev) {
    if (!widget.classList.contains('qw-expanded')) {
      clearTimeout(closeTimer);
      widget.classList.remove('qw-closing');
      widget.classList.add('qw-expanded');
      setExpanded(true);
    } else if (toggle && toggle.contains(ev.target)) {
      collapse();
    }
  });
  document.getElementById('qwClose').addEventListener('click', function (e) {
    e.stopPropagation();
    collapse();
  });
  document.addEventListener('click', function (e) {
    if (widget.classList.contains('qw-expanded') && !widget.contains(e.target)) {
      collapse();
    }
  });
})();
(function () {
  var banner = document.getElementById('cookieBanner');
  /* Выбор по cookie хранится в localStorage['cookieAccepted']: accepted | declined. Прежнее значение '1' — согласие.
     Метрика грузится только после «Принять» (window.azMetrikaLoad из inline/metrika.njk, на сайте без счётчика его нет). */
  function read() { try { return localStorage.getItem('cookieAccepted'); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem('cookieAccepted', v); } catch (e) { /* приватный режим: выбор не запомнится */ } }
  /* высота баннера в --cookie-h: нижняя панель мобильного меню и плавающие кнопки поднимаются над ним */
  function syncCookieH() {
    var h = banner.classList.contains('cookie-banner--hidden') ? 0 : banner.offsetHeight;
    document.documentElement.style.setProperty('--cookie-h', h + 'px');
  }
  function close() { banner.classList.add('cookie-banner--hidden'); syncCookieH(); }
  if (!read()) {
    banner.classList.remove('cookie-banner--hidden');
    syncCookieH();
    if (window.ResizeObserver) new ResizeObserver(syncCookieH).observe(banner);
    window.addEventListener('resize', syncCookieH);
  }
  document.getElementById('cookieAccept').addEventListener('click', function () {
    save('accepted');
    if (typeof window.azMetrikaLoad === 'function') window.azMetrikaLoad();
    close();
  });
  document.getElementById('cookieDecline').addEventListener('click', function () {
    save('declined');
    close();
  });
})();

/* ═══ Бесконечные анимации идут только пока элемент на экране ═══
   Свечение и блик кнопок, плашка акции, подсказка у карты, плашка «Рентгена», рамка карточки цены.
   Класс .is-live ставит IntersectionObserver; анимации в css висят на этом классе (и только при prefers-reduced-motion: no-preference).
   Без IntersectionObserver показываем всё как раньше, но сразу. */
(function () {
  var els = document.querySelectorAll('.btn-cta, .sale-badge, .map-reveal-btn, .xr-cap, .sv-frame .sale-right');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (el) { el.classList.add('is-live'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
  }, { rootMargin: '60px 0px' });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  /* карточка цены получает класс .sv-frame позже (sale.js): подхватываем её, когда он появится */
  window.addEventListener('load', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.sv-frame .sale-right'), function (el) { io.observe(el); });
  });
})();
