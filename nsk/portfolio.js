/* portfolio.js: страница объекта портфолио. Стена кадров (раскладка по колонкам, фильтр по комнатам), ленивые ролики, просмотр во весь экран.
   Без GSAP и service.js. Звук ни у одного ролика не проверен: во всех файлах звуковой дорожки нет, везде muted. */
(() => {
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  /* WebM VP9 — только где браузер играет его уверенно (Chrome, Android, Firefox); Safari, iPhone и iPad до iOS 17.4 получают MP4 */
  const webm = document.createElement('video').canPlayType('video/webm; codecs="vp9"') === 'probably';
  const pick = (mp4, wm) => (webm && wm) ? wm : mp4;
  /* режим экономии трафика или 2G: ролики стоят на обложках, колонны не едут, видео запускается только в просмотре. «3g» не берём: Chrome ставит его и на нормальной связи */
  const nc = navigator.connection, lite = !!(nc && (nc.saveData || /2g$/.test(nc.effectiveType || '')));
  if (lite) document.documentElement.classList.add('gl-lite');

  /* ролики: src ставим при подходе к экрану (200 px), вне экрана пауза; при экономии и сниженной анимации — только обложки */
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (lite || rm.matches) return;
      if (!v.getAttribute('src') && v.dataset.src) v.src = pick(v.dataset.src, v.dataset.webm);
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: '200px 0px' });
  document.querySelectorAll('video[data-src]').forEach(v => io.observe(v));

  /* стена: кадры в порядке списка кладём в самую короткую колонку */
  const wall = document.getElementById('glWall');
  const tiles = [...wall.querySelectorAll('.gl-t')];
  const ratio = t => t.classList.contains('gl-l') ? 3 / 4 : 4 / 3;   /* высота / ширина */
  let cols = 0;
  const layout = force => {
    const w = innerWidth, n = w >= 1200 ? 4 : w >= 760 ? 3 : 2;
    if (n === cols && !force) return;
    cols = n;
    const cs = Array.from({ length: n }, () => { const c = document.createElement('div'); c.className = 'gl-col'; return c; });
    const h = new Array(n).fill(0);
    tiles.filter(t => !t.hidden).forEach(t => {
      let k = 0; h.forEach((v, i) => { if (v < h[k] - .01) k = i; });
      cs[k].appendChild(t); h[k] += ratio(t) + .04;
    });
    tiles.filter(t => t.hidden).forEach(t => cs[0].appendChild(t));
    wall.replaceChildren(...cs);
  };
  layout(true);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => layout(false), 120); });

  /* фильтр по комнатам: перестройка через View Transitions, где они есть и анимация не отключена */
  const chips = [...document.querySelectorAll('.gl-chip')];
  chips.forEach(c => c.addEventListener('click', () => {
    const f = c.dataset.f;
    const run = () => {
      chips.forEach(x => { const on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      tiles.forEach(t => { t.hidden = f !== 'all' && t.dataset.room !== f; });
      layout(true);
    };
    if (document.startViewTransition && !rm.matches) {
      tiles.forEach((t, i) => { t.style.viewTransitionName = 'gl' + i; });
      document.startViewTransition(run).finished.finally(() => tiles.forEach(t => { t.style.viewTransitionName = ''; }));
    } else run();
  }));

  /* просмотр во весь экран */
  const lb = document.getElementById('glLb'), stage = document.getElementById('glStage'), thumbs = document.getElementById('glThumbs');
  const T = document.getElementById('glT'), N = document.getElementById('glN'), C = document.getElementById('glC');
  const closeBtn = lb.querySelector('.gl-lb-close');
  let list = [], idx = 0, back = null;
  const thumbSrc = el => { const m = el.querySelector('img'); if (m) return m.currentSrc || m.src; return el.dataset.poster; };
  const show = i => {
    idx = (i + list.length) % list.length;
    const el = list[idx], d = el.dataset;
    if (d.kind === 'v') {
      /* ролик грузится только тут, по нажатию на карточку; с элементами управления, при сниженной анимации без автозапуска */
      const v = document.createElement('video');
      Object.assign(v, { src: pick(d.full, d.fullWebm), muted: true, loop: true, playsInline: true, controls: true, autoplay: !rm.matches, poster: d.poster });
      v.setAttribute('aria-label', d.title + ': ' + d.note);
      stage.replaceChildren(v);
    } else {
      const img = new Image(); img.src = d.full; img.alt = d.title + ': ' + d.note; stage.replaceChildren(img);
      const nx = list[(idx + 1) % list.length]; if (nx && nx.dataset.kind !== 'v') new Image().src = nx.dataset.full;   /* следующий кадр подгружаем заранее */
    }
    T.textContent = d.title; N.textContent = d.note; C.textContent = (idx + 1) + ' / ' + list.length;
    [...thumbs.children].forEach((b, k) => { b.classList.toggle('on', k === idx); b.setAttribute('aria-current', k === idx ? 'true' : 'false'); if (k === idx) b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  };
  const open = (items, i, from) => {
    list = items; back = from;
    thumbs.replaceChildren(...items.map((el, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Кадр ' + (k + 1) + ': ' + el.dataset.title);
      const im = new Image(); im.src = thumbSrc(el); im.alt = ''; b.appendChild(im); b.addEventListener('click', () => show(k)); return b;
    }));
    lb.hidden = false; requestAnimationFrame(() => lb.classList.add('open'));
    document.documentElement.classList.add('scroll-locked');
    show(i); closeBtn.focus();
  };
  const close = () => {
    lb.classList.remove('open'); lb.hidden = true; stage.replaceChildren();
    document.documentElement.classList.remove('scroll-locked');
    if (back) back.focus({ preventScroll: true });
  };
  wall.addEventListener('click', e => {
    const t = e.target.closest('.gl-t'); if (!t) return;
    const vis = tiles.filter(x => !x.hidden); open(vis, vis.indexOf(t), t);
  });
  const reels = [...document.querySelectorAll('.gl-reel')];
  reels.forEach((r, i) => r.addEventListener('click', () => open(reels, i, r)));
  closeBtn.addEventListener('click', close);
  lb.querySelector('.prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && e.target.tagName !== 'VIDEO') show(idx - 1);
    else if (e.key === 'ArrowRight' && e.target.tagName !== 'VIDEO') show(idx + 1);
    else if (e.key === 'Tab') {   /* фокус держим внутри просмотра */
      const f = [...lb.querySelectorAll('button,video[controls]')]; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      else if (!lb.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
    }
  });
  /* свайп на телефоне */
  let sx = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 48) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
})();
