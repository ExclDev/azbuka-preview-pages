/* Страница «Капитальный ремонт», Новосибирск: история с объекта (первый экран) и кольца «Что меняем». Перенесено из макета brand/maket-kap-nsk-2026-11-14 (ks.js).
   Подключается layouts/service.njk, когда страница задаёт hero.stories или systems. Движения при prefers-reduced-motion нет: история стоит на паузе, кольца не играют. */
(function () {
  /* ═══ История с объекта: автолистание, касание слева/справа, кольца этапов, пауза ═══ */
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var story = document.getElementById('ksStory');
  if (!story) return;
  var vids = [].slice.call(story.querySelectorAll('video'));
  var bars = story.querySelectorAll('.ks-seg b');
  var cap = story.querySelector('.ks-cap');
  var rings = [].slice.call(document.querySelectorAll('.ks-r'));
  // главы берутся из колец справа (data-t, data-d): тексты лежат в данных страницы, а не в скрипте
  var CH = rings.map(function (r) { return [r.getAttribute('data-t'), r.getAttribute('data-d')]; });
  var N = CH.length, DUR = 3800, cur = 0, t0 = 0, paused = still, visible = false, held = 0;

  function go(n) {
    cur = (n + N) % N; t0 = performance.now(); held = 0;
    vids.forEach(function (v, k) {
      v.classList.toggle('on', k === cur);
      if (k === cur) { v.preload = 'auto'; if (!paused && visible) v.play().catch(function () {}); }
      else v.pause();
    });
    if (vids[cur + 1]) vids[cur + 1].preload = 'auto';
    rings.forEach(function (r, k) { r.classList.toggle('on', k === cur); r.classList.toggle('seen', k < cur); r.setAttribute('aria-pressed', k === cur ? 'true' : 'false'); });
    cap.textContent = '';
    [['b', CH[cur][0]], ['span', CH[cur][1]], ['i', (cur + 1) + ' из ' + N]].forEach(function (x) {
      var el = document.createElement(x[0]); el.textContent = x[1]; if (x[0] === 'i') el.className = 'ks-k'; cap.appendChild(el);
    });
    for (var k = 0; k < bars.length; k++) bars[k].style.width = k < cur ? '100%' : '0';
  }
  function setPause(p) {
    paused = p; story.classList.toggle('paused', p);
    story.querySelector('.ks-pause').setAttribute('aria-label', p ? 'Продолжить' : 'Пауза');
    if (p) { held = performance.now() - t0; vids[cur].pause(); }
    else { t0 = performance.now() - held; if (visible) vids[cur].play().catch(function () {}); }
  }
  var taps = story.querySelectorAll('.ks-tap button');
  taps[0].addEventListener('click', function () { go(cur - 1); });
  taps[1].addEventListener('click', function () { go(cur + 1); });
  story.querySelector('.ks-pause').addEventListener('click', function () { setPause(!paused); });
  story.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); });
  rings.forEach(function (r, k) { r.addEventListener('click', function () { go(k); }); });

  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible && !paused) { t0 = performance.now() - held; vids[cur].play().catch(function () {}); }
    else { if (!paused) held = performance.now() - t0; vids[cur].pause(); }
  }, { threshold: .25 }).observe(story);

  (function loop(now) {
    if (!paused && visible) {
      var p = (now - t0) / DUR;
      if (p >= 1) go(cur + 1); else bars[cur].style.width = (p * 100) + '%';
    }
    requestAnimationFrame(loop);
  })(performance.now());
  if (still) story.classList.add('paused');
  go(0);

  /* ═══ «Что меняем»: кольца играют в зоне видимости, «Смотреть в истории» открывает главу наверху ═══ */
  document.querySelectorAll('.ky-ring video').forEach(function (v) {
    if (still) return;
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) { v.preload = 'auto'; v.play().catch(function () {}); } else v.pause(); }, { threshold: .4 }).observe(v);
  });
  document.querySelectorAll('[data-ch]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ch = Number(b.dataset.ch);
      go(ch);
      document.getElementById('top').scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      story.focus({ preventScroll: true });
    });
  });
  story.tabIndex = -1;
})();
