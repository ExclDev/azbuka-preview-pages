/* ═══ base.js: общий код всех страниц (меню, попапы, заявки, квиз, виджеты, cookie). Собран из бывшего inline/script-app, script-cookie ═══ */
const burger     = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', String(isOpen));
  document.documentElement.classList.toggle('scroll-locked', isOpen);
});
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('scroll-locked');
}
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
    var top = target.getBoundingClientRect().top + window.pageYOffset - getOffset();
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
function updateFloatPosition() {
  if (!floatCta) return;
  const footer  = document.querySelector('.footer');
  const baseGap = window.innerWidth <= 768 ? 20 : 30;
  const overlap = footer ? window.innerHeight - footer.getBoundingClientRect().top : 0;
  floatCta.style.bottom = (overlap > 0 ? baseGap + overlap + 8 : baseGap) + 'px';
  if (qwWidgetEl) {
    qwWidgetEl.style.bottom = overlap > 0 ? (qwBaseBottom() + overlap + 8) + 'px' : '';
  }
}
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
  updateFloatPosition();
}, { passive: true });
window.addEventListener('resize', updateFloatPosition, { passive: true });
const overlay = document.getElementById('overlay');
function openPopup(trigger) {
  overlay.classList.add('open');
  document.documentElement.classList.add('scroll-locked');
  document.getElementById('popupFormBox').style.display = '';
  document.getElementById('popupSuccess').style.display  = 'none';
  // Попап открывают шесть разных кнопок, и менеджеру важно, какая именно:
  // «Заказать по акции» и «Обратный звонок» — разные сценарии разговора.
  window.AZ_LEAD.trigger = trigger || 'Всплывающее окно';
  window.AZ_LEAD.markOpened(document.getElementById('popupFormInner'));
  window.AZ_LEAD.clearError(document.getElementById('popupFormInner'));
}
function closePopup() {
  overlay.classList.remove('open');
  document.documentElement.classList.remove('scroll-locked');
}
overlay.addEventListener('click', e => { if (e.target === overlay) closePopup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePopup(); closeDevPopup(); closeQuizModal(); } });
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

  // Какая кнопка открыла попап или калькулятор.
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
  }
  function showError(formEl, text) {
    const box = errorBox(formEl);
    const phone = (window.AZ_CITY && window.AZ_CITY.phone) || '';
    const href  = (window.AZ_CITY && window.AZ_CITY.phoneHref) || '';
    if (!box) { alert(text); return; }
    box.innerHTML = text + (phone ? ' Позвоните нам: <a href="' + href + '">' + phone + '</a>' : '');
    box.hidden = false;
  }

  function highlight(el) {
    if (!el) return;
    el.focus();
    el.style.borderColor = '#e8201a';
    setTimeout(() => { el.style.borderColor = ''; }, 2000);
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
      button: state.trigger || ''
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

  return { state, send, phoneValid, highlight, markOpened, clearError, showError,
           get trigger() { return state.trigger; },
           set trigger(v) { state.trigger = v; } };
})();

function handleFormSubmit(e, formEl) {
  e.preventDefault();
  const nameEl  = formEl.querySelector('[autocomplete="given-name"], [name="name"]');
  const phoneEl = formEl.querySelector('[type="tel"]');
  if (!nameEl || !nameEl.value.trim()) { AZ_LEAD.highlight(nameEl); return; }
  if (!phoneEl || !AZ_LEAD.phoneValid(phoneEl.value)) { AZ_LEAD.highlight(phoneEl); return; }

  const typeEl = formEl.querySelector('[name="repair_type"]');
  AZ_LEAD.send(formEl, {
    form: formEl.id === 'mainForm' ? 'Консультация' : 'Всплывающее окно',
    name: nameEl.value.trim(),
    phone: phoneEl.value.trim(),
    area: (formEl.querySelector('[name="area"]') || {}).value || '',
    // Пустое значение — человек не открывал список. Так и передаём,
    // иначе в CRM у всех был бы «Косметический» по умолчанию.
    repair: (typeEl && typeEl.value) ? typeEl.value : 'Не выбрано'
  }, function () {
    if (!overlay.classList.contains('open')) openPopup(AZ_LEAD.trigger);
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
  widget.addEventListener('click', function () {
    if (!widget.classList.contains('qw-expanded')) {
      clearTimeout(closeTimer);
      widget.classList.remove('qw-closing');
      widget.classList.add('qw-expanded');
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
  if (window.matchMedia('(max-width: 768px)').matches) return;
  var hint   = document.getElementById('qwHint');
  var widget = document.getElementById('quickWidget');
  var calc   = widget && widget.querySelector('.qw-btn-calc');
  if (!hint || !widget || !calc) return;
  if (sessionStorage.getItem('qwHintShown')) return;
  var done = false, armed = false;
  function place() {
    var r = calc.getBoundingClientRect();
    hint.style.top   = (r.top + r.height / 2) + 'px';
    hint.style.right = (window.innerWidth - r.left + 12) + 'px';
  }
  function isShown() { return hint.classList.contains('qw-hint--show'); }
  function hide() {
    hint.classList.remove('qw-hint--show');
    widget.classList.remove('qw-attention'); 
  }
  function show() {
    if (done) return;
    if (!widget.classList.contains('qw-visible')) { armed = true; return; }
    done = true; armed = false;
    sessionStorage.setItem('qwHintShown', '1');
    place();
    hint.classList.add('qw-hint--show');
    widget.classList.add('qw-attention'); 
    setTimeout(hide, 5000);
  }
  setTimeout(show, 3000);
  window.addEventListener('scroll', function () {
    if (armed) show();
    if (isShown()) place();
  }, { passive: true });
  window.addEventListener('resize', function () { if (isShown()) place(); });
  widget.addEventListener('mouseenter', hide, { once: true });
  widget.addEventListener('click', hide, { once: true });
  hint.addEventListener('click', function () {
    hide();
    if (window.openQuizModal) window.openQuizModal('Подсказка — Рассчитать стоимость');
  });
})();
(function () {
  var TOTAL = 5;
  var step  = 1;
  var ans   = {};
  function openQuizModal(trigger) {
    document.getElementById('quiz-modal').classList.add('open');
    document.documentElement.classList.add('scroll-locked');
    window.AZ_LEAD.trigger = trigger || 'Калькулятор ремонта';
    resetQuiz();
    window.AZ_LEAD.markOpened(document.getElementById('quizContactForm'));
    window.AZ_LEAD.clearError(document.getElementById('quizContactForm'));
  }
  window.openQuizModal = openQuizModal;
  function closeQuizModal() {
    var el = document.getElementById('quiz-modal');
    if (el) el.classList.remove('open');
    document.documentElement.classList.remove('scroll-locked');
  }
  window.closeQuizModal = closeQuizModal;
  function resetQuiz() {
    step = 1;
    for (var k in ans) delete ans[k];
    document.querySelectorAll('.quiz-card').forEach(function (c) { c.classList.remove('selected'); });
    var nameEl  = document.getElementById('quiz-name');
    var phoneEl = document.getElementById('quiz-phone');
    if (nameEl)  nameEl.value  = '';
    if (phoneEl) phoneEl.value = '';
    showQuizPanel(true);
    showStep(1);
  }
  function showQuizPanel(visible) {
    var show   = visible ? '' : 'none';
    var hide   = visible ? 'none' : '';
    document.querySelector('#quiz-modal .quiz-progress').style.display = show;
    document.querySelector('#quiz-modal .quiz-header').style.display   = show;
    document.querySelector('#quiz-modal .quiz-body').style.display     = show;
    document.querySelector('#quiz-modal .quiz-nav').style.display      = show;
    document.getElementById('quizSuccess').style.display               = hide;
  }
  function showStep(n) {
    document.querySelectorAll('.quiz-step').forEach(function (s) { s.classList.remove('active'); });
    var el = document.getElementById('quizStep' + n);
    if (el) el.classList.add('active');
    document.getElementById('quizProgressBar').style.width = (n / TOTAL * 100) + '%';
    document.getElementById('quizStepLabel').textContent   = 'Вопрос ' + n + ' из ' + TOTAL;
    document.getElementById('quizBackBtn').style.visibility = n > 1 ? 'visible' : 'hidden';
  }
  window.quizSelect = function (btn, key, value) {
    btn.closest('.quiz-cards').querySelectorAll('.quiz-card').forEach(function (c) { c.classList.remove('selected'); });
    btn.classList.add('selected');
    ans[key] = value;
    setTimeout(function () {
      step++;
      showStep(step);
    }, 400);
  };
  window.quizBack = function () {
    if (step > 1) { step--; showStep(step); }
  };
  document.getElementById('quizContactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var formEl  = e.target;
    var nameEl  = document.getElementById('quiz-name');
    var phoneEl = document.getElementById('quiz-phone');
    if (!nameEl.value.trim())                     { window.AZ_LEAD.highlight(nameEl);  return; }
    if (!window.AZ_LEAD.phoneValid(phoneEl.value)) { window.AZ_LEAD.highlight(phoneEl); return; }
    ans.name  = nameEl.value.trim();
    ans.phone = phoneEl.value.trim();
    // Ответы на пять вопросов живут в `ans` и до этого момента никуда не
    // уходили. Теперь уезжают вместе с контактами.
    window.AZ_LEAD.send(formEl, {
      form: 'Калькулятор',
      name: ans.name,
      phone: ans.phone,
      object_type: ans.type   || '',
      repair:      ans.repair || '',
      area_range:  ans.area   || '',
      start_when:  ans.when   || ''
    }, function () {
      showQuizPanel(false);
    }, 'lead_quiz');
  });
  document.getElementById('quiz-modal').addEventListener('click', function (e) {
    if (e.target === this) closeQuizModal();
  });
})();
(function () {
  if (!localStorage.getItem('cookieAccepted')) {
    document.getElementById('cookieBanner').classList.remove('cookie-banner--hidden');
  }
  document.getElementById('cookieAccept').addEventListener('click', function () {
    localStorage.setItem('cookieAccepted', '1');
    document.getElementById('cookieBanner').classList.add('cookie-banner--hidden');
  });
})();
