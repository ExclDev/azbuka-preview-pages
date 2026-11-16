/* Страница «Электромонтажные работы» (Новосибирск и Томск): звук ролика основателя на первом экране «Показал и снял» и пауза роликов вне экрана.
   Перенесено из макетов brand/maket-elektro-{nsk,tomsk}-2026-11-16 (el.js). Подключает layouts/service.njk, когда задан hero.show или sheet.
   Движение первого экрана (наезд крупных планов, прогресс-полоса) задано CSS на шкале --eb и скрипта не требует. Лист точек меняется по нажатию (ниже). */
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══ Лист точек «Каждую трассу снимаем»: выбор кадра нажатием на миниатюру ═══
     Новый крупный кадр проявляется поверх прежнего (CSS-переход .3 с), прежний держится, пока новый не проявился: провала в фон нет.
     Рамка (.is-on) и aria-pressed переходят на миниатюру, подпись «N / всего · текст» меняется. Стрелки влево и вправо листают и переносят фокус. */
  function initSheet() {
    var body = document.querySelector('.ca-body'); if (!body) return;
    var figs = [].slice.call(body.querySelectorAll('.ca-view figure')), thumbs = [].slice.call(body.querySelectorAll('.ca-t')),
        cap = body.querySelector('.ca-cap'), capB = cap.querySelector('b'), capS = cap.querySelector('span'), n = figs.length, cur = 0, timer = 0;
    var texts = figs.map(function (f) { return f.querySelector('img').getAttribute('alt'); });
    function show(i, focus) {
      if (i < 0 || i >= n) return;
      if (i !== cur) {
        var o = figs[cur], nw = figs[i];
        clearTimeout(timer);
        figs.forEach(function (f) { if (f !== o && f !== nw) { f.classList.remove('is-on', 'is-top'); f.setAttribute('aria-hidden', 'true'); } });
        o.classList.remove('is-top'); o.setAttribute('aria-hidden', 'true');
        nw.classList.add('is-on', 'is-top'); nw.removeAttribute('aria-hidden');
        timer = setTimeout(function () { if (o !== figs[cur]) o.classList.remove('is-on'); }, still ? 0 : 340);
        thumbs[cur].classList.remove('is-on'); thumbs[cur].setAttribute('aria-pressed', 'false');
        thumbs[i].classList.add('is-on'); thumbs[i].setAttribute('aria-pressed', 'true');
        cur = i; capB.textContent = String(i + 1); capS.textContent = texts[i];
      }
      if (focus) thumbs[i].focus();
    }
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(Math.min(n - 1, i + 1), true); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(Math.max(0, i - 1), true); }
      });
    });
    /* крупные кадры подгружаются заранее, чтобы при первом нажатии не было вспышки пустого фона */
    if ('IntersectionObserver' in window) {
      var io0 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { figs.forEach(function (f) { f.querySelector('img').loading = 'eager'; }); io0.disconnect(); } }, { rootMargin: '600px 0px' });
      io0.observe(body);
    }
  }
  initSheet();

  /* ═══ Звук: только по нажатию. Ролик идёт сначала один раз со звуком, по окончании снова беззвучная петля; при уходе с экрана звук выключается ═══ */
  var v = document.getElementById('ebVid'), b = document.getElementById('ebSnd'), tm = document.getElementById('ebT');
  function fmt(x) { x = Math.floor(x || 0); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); }
  function setSnd(on, noPlay) {
    v.muted = !on; v.loop = !on;
    if (on) { v.currentTime = 0; v.play().catch(function () {}); }
    else if (!noPlay && shown && !still) v.play().catch(function () {});
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('span').textContent = on ? 'Выключить звук' : 'Включить звук';
  }
  var shown = false;
  if (v && b) {
    b.addEventListener('click', function () { setSnd(v.muted); });
    v.addEventListener('ended', function () { setSnd(false); });
    v.addEventListener('timeupdate', function () { if (tm) tm.textContent = fmt(v.currentTime); });
  }

  /* ═══ Ролики первого экрана играют только на экране (при reduced-motion — стоят обложкой, звук по нажатию всё равно работает) ═══ */
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target, isMain = el === v;
      if (isMain) shown = e.isIntersecting;
      if (e.isIntersecting) { if (!still) el.play().catch(function () {}); }
      else { if (isMain && !v.muted) setSnd(false, true); el.pause(); }
    });
  }, { threshold: .15 });
  [].forEach.call(document.querySelectorAll('#top video'), function (el) { io.observe(el); });
})();
