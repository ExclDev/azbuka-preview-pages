/* Страница «Сантехнические работы» (Новосибирск и Томск): первый экран «Ниша» / «Узел», карусель «Что скроется за плиткой», «Ночь. Протечка.».
   Перенесено из макетов brand/maket-santeh-nsk-2026-11-14 и maket-santeh-tomsk-2026-11-14 (st.js). Подключается layouts/service.njk, когда страница задаёт hero.niche, carousel, leak или worklist.
   Данные первого экрана лежат в атрибуте data-ni секции (из front matter), скрипт их не хранит.
   Правило прокрутки: на каждый кадр прокрутки атрибуты и стили не пишутся. Движение первого экрана ведут CSS-анимации на view-timeline секции, ключевые кадры считаются здесь по геометрии экрана
   при загрузке и смене размера. По прокрутке остаются только дешёвые действия (видео, кликабельность финальной кнопки); полный перерасчёт по прокрутке есть лишь в запасном пути без view(). */
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cssTl = !still && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  function clamp(x) { return Math.min(1, Math.max(0, x)); }
  function ease(x) { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function prog(sec) { var r = sec.getBoundingClientRect(), len = sec.offsetHeight - innerHeight; return len > 0 ? clamp(-r.top / len) : 0; }
  function visibleOf(el, cb, th) { new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { threshold: th || 0 }).observe(el); }

  /* ═══ 1. Первый экран «Ниша» / «Узел» ═══ */
  function initNiche() {
    var ni = document.getElementById('top');
    if (!ni || !ni.classList.contains('ni')) return;
    var pin = document.getElementById('niPin'), cam = document.getElementById('niCam'), img = document.getElementById('niImg'), vid = document.getElementById('niVid'),
        pins = [].slice.call(pin.querySelectorAll('.ni-pin-i')), side = document.getElementById('niSide'), sideLi = [].slice.call(side.querySelectorAll('li')), end = document.getElementById('niEnd');
    var cfg = {};
    try { cfg = JSON.parse(ni.getAttribute('data-ni') || '{}'); } catch (e) { return; }
    var NB = cfg.frame, P2 = cfg.point2, Z = cfg.zoom || {}, whole = cfg.layout === 'whole', FLIP = !!cfg.flip;
    var IW = +img.getAttribute('width'), IH = +img.getAttribute('height'), G = {};
    var hm = Z.hm || .8, hd = Z.hd || .66, wm = Z.wm || .86, wd = Z.wd || .4, floor = Z.floor || 0;

    /* геометрия: кадр, рамка узла (в пикселях экрана), масштаб первого приближения, точка второго */
    function lay() {
      var W = pin.clientWidth, H = pin.clientHeight;
      /* whole: на широком экране вертикальный кадр стоит целиком справа от плашки, на телефоне заполняет экран; fill: кадр заполняет экран всегда */
      var wide = whole && W >= 900 && W / H > IW / IH * 1.3, k = wide ? H / IH : Math.max(W / IW, H / IH), w = IW * k, h = IH * k;
      G = { W: W, H: H, w: w, h: h, x: wide ? Math.min(W - w - W * .04, W * .62 - w / 2) : (W - w) / 2, y: (H - h) / 2 };
      img.style.width = w + 'px'; img.style.height = h + 'px'; img.style.left = G.x + 'px'; img.style.top = G.y + 'px';
      var nh = NB.h * h, nw = NB.w * w;
      G.s1 = Math.max(floor, Math.min(H * (W < 900 ? hm : hd) / nh, (W < 900 ? W * wm : W * wd) / nw));
      G.cx = G.x + (NB.x0 + NB.w * .5) * w; G.cy = G.y + (NB.y0 + NB.h * .5) * h;
      G.kx = G.x + (NB.x0 + NB.w * P2.fx) * w; G.ky = G.y + (NB.y0 + NB.h * P2.fy) * h;
      G.side = W >= 900 ? -W * .12 : 0;
    }
    function at(fx, fy) { return [G.x + (NB.x0 + NB.w * fx) * G.w, G.y + (NB.y0 + NB.h * fy) * G.h]; }
    /* состояние первого экрана в точке прокрутки p (0…1) */
    function state(p) {
      var z1 = ease((p - .06) / .36), z2 = ease((p - .7) / .2);
      var s = 1 + (G.s1 - 1) * z1, ox = G.W / 2 + (G.cx - G.W / 2) * z1, oy = G.H / 2 + (G.cy - G.H / 2) * z1, tx = G.W / 2 + G.side * z1, ty = G.H / 2;
      if (z2 > 0) { s = G.s1 * (1 + 1.6 * z2); ox = G.cx + (G.kx - G.cx) * z2; oy = G.cy + (G.ky - G.cy) * z2; tx = G.W / 2 + G.side * (1 - z2); }
      /* кадр не отрывается от краёв экрана: по высоте всегда, по ширине, если кадр шире экрана */
      var top = (G.y - oy) * s + ty, bot = (G.y + G.h - oy) * s + ty;
      if (top > 0) ty -= top; else if (bot < G.H) ty += G.H - bot;
      if (G.w * s >= G.W) { var lft = (G.x - ox) * s + tx, rgt = (G.x + G.w - ox) * s + tx; if (lft > 0) tx -= lft; else if (rgt < G.W) tx += G.W - rgt; }
      var so = clamp((p - .4) / .06) * clamp(1 - (p - .7) / .06), on = Math.floor(clamp((p - .44) / .26) * (sideLi.length + .0001));
      return {
        cam: 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s.toFixed(4) + ') translate(' + (-ox).toFixed(1) + 'px,' + (-oy).toFixed(1) + 'px)',
        pins: pins.map(function (el) { var q = at(+el.dataset.fx, +el.dataset.fy); return { x: (q[0] - ox) * s + tx, y: (q[1] - oy) * s + ty, o: (el._i < on && so > .5) ? 1 : 0 }; }),
        po: clamp(1 - (p - .04) / .1), so: so, on: on, vo: clamp((p - .7) / .08), eo: clamp((p - .88) / .06), p: p
      };
    }
    pins.forEach(function (el, i) { el._i = i; });

    /* ключевые кадры CSS-анимаций: камера, метки, плашки, полоса прогресса, финальный слой */
    var kf = document.createElement('style'); document.head.appendChild(kf);
    function build() {
      var N = 80, a = { cam: [], po: [], so: [], vo: [], eo: [], bar: [] }, pk = pins.map(function () { return []; }), lk = sideLi.map(function () { return []; });
      for (var i = 0; i <= N; i++) {
        var p = i / N, st = state(p), q = (p * 100).toFixed(2) + '%';
        a.cam.push(q + '{transform:' + st.cam + '}');
        a.po.push(q + '{opacity:' + st.po.toFixed(3) + ';transform:translateY(' + ((1 - st.po) * 20).toFixed(1) + 'px)}');
        a.so.push(q + '{opacity:' + st.so.toFixed(3) + '}');
        a.vo.push(q + '{opacity:' + st.vo.toFixed(3) + '}');
        a.eo.push(q + '{opacity:' + st.eo.toFixed(3) + ';transform:translateY(' + ((1 - st.eo) * 20).toFixed(1) + 'px)}');
        a.bar.push(q + '{transform:scaleX(' + p.toFixed(3) + ')}');
        st.pins.forEach(function (m, k) {
          pk[k].push(q + '{transform:translate(' + m.x.toFixed(1) + 'px,' + m.y.toFixed(1) + 'px)' + (pins[k].classList.contains('l') && !(G.W < 900 && FLIP) ? ' translateX(-100%)' : '') + ';opacity:' + m.o + '}');
        });
        lk.forEach(function (l, k) { l.push(q + '{opacity:' + (k < st.on ? 1 : .35) + '}'); });
      }
      var r = '@keyframes niCam{' + a.cam.join('') + '}@keyframes niPo{' + a.po.join('') + '}@keyframes niSo{' + a.so.join('') + '}@keyframes niVo{' + a.vo.join('') + '}@keyframes niEo{' + a.eo.join('') + '}@keyframes niBar{' + a.bar.join('') + '}';
      pk.forEach(function (l, k) { r += '@keyframes niPin' + k + '{' + l.join('') + '}'; });
      lk.forEach(function (l, k) { r += '@keyframes niLi' + k + '{' + l.join('') + '}'; });
      var tl = 'linear both;animation-timeline:--ni;animation-range:contain 0% contain 100%}';
      r += '#top.ni-css{view-timeline-name:--ni}#top.ni-css .ni-cam{animation:niCam ' + tl + '#top.ni-css .ni-plate,#top.ni-css .ni-hint{animation:niPo ' + tl + '#top.ni-css .ni-hint{transform:none}' +
        '#top.ni-css .ni-side{opacity:1;animation:niSo ' + tl + '#top.ni-css .ni-vid{animation:niVo ' + tl + '#top.ni-css .ni-end{animation:niEo ' + tl + '#top.ni-css .ni-prog i{animation:niBar ' + tl +
        '#top.ni-css .ni-side{transform:translateY(-50%)}@media (max-width:899px){#top.ni-css .ni-side{transform:none}}#top.ni-css .ni-pin-i,#top.ni-css .ni-side li{transition:none}';
      pins.forEach(function (el, k) { r += '#top.ni-css .ni-pin-i:nth-child(' + (k + 1) + '){animation:niPin' + k + ' ' + tl; });
      sideLi.forEach(function (el, k) { r += '#top.ni-css .ni-side li:nth-child(' + (k + 1) + '){animation:niLi' + k + ' ' + tl; });
      kf.textContent = r;
    }
    /* сниженная анимация: общий план, все метки и список на месте, плашка с заголовком видна, движения нет (записывается один раз) */
    function paintStill() {
      var st = state(0);
      cam.style.transform = st.cam;
      pin.style.setProperty('--po', 1); pin.style.setProperty('--so', 1); pin.style.setProperty('--vo', 0); pin.style.setProperty('--eo', 0);
      pins.forEach(function (el, i) { var m = st.pins[i]; el.style.setProperty('--x', m.x + 'px'); el.style.setProperty('--y', m.y + 'px'); el.style.setProperty('--o', 1); });
      sideLi.forEach(function (li) { li.classList.add('on'); });
    }
    /* запасной путь без view(): то же движение, но значениями, по прокрутке */
    function paintScroll(p) {
      var st = state(p);
      cam.style.transform = st.cam;
      pin.style.setProperty('--p', p); pin.style.setProperty('--po', st.po); pin.style.setProperty('--so', st.so); pin.style.setProperty('--vo', st.vo); pin.style.setProperty('--eo', st.eo);
      pins.forEach(function (el, i) { var m = st.pins[i]; el.style.setProperty('--x', m.x + 'px'); el.style.setProperty('--y', m.y + 'px'); el.style.setProperty('--o', m.o); });
      sideLi.forEach(function (li, i) { li.classList.toggle('on', i < st.on); });
    }

    var playing = false, endLive = false, shown = false, endBtn = end.querySelector('button');
    /* по прокрутке: видео вкл/выкл и кликабельность финальной кнопки (только пороги, без записи стилей) */
    function tNi() {
      if (!shown) return;
      var p = prog(ni), vo = clamp((p - .7) / .08), eo = clamp((p - .88) / .06);
      if (!cssTl) paintScroll(p);
      if (vid.play) { if (vo > 0 && !playing && !still) { playing = true; vid.play().catch(function () {}); } if (vo === 0 && playing) { playing = false; vid.pause(); } }
      var live = eo > .5;
      if (live !== endLive) { endLive = live; end.classList.toggle('live', live); endBtn.tabIndex = live ? 0 : -1; }
    }
    if (cssTl) ni.classList.add('ni-css');
    function relay() { lay(); if (still) paintStill(); else if (cssTl) build(); }
    relay();
    var rz = 0;
    addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(function () { relay(); tNi(); }); });
    if (still) return;
    var raf = 0;
    visibleOf(ni, function (v) { shown = v; if (v) tNi(); else if (playing && vid.pause) { playing = false; vid.pause(); } });
    addEventListener('scroll', function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; tNi(); }); }, { passive: true });
  }

  /* ═══ 2. Карусель «Что скроется за плиткой» ═══ */
  function initCarousel() {
    var za = document.getElementById('za'), scene = document.getElementById('crScene'), ring = document.getElementById('crRing');
    if (!za || !scene || !ring) return;
    var figs = [].slice.call(ring.children), n = figs.length, step = 360 / n, a = 0, cur = -1, drag = null, timer = null, hold = false, anim = null, inView = false;
    var dots = [].slice.call(za.querySelectorAll('.cr-dots i')), nEl = za.querySelector('.cr-n'), tEl = za.querySelector('.cr-t'), dEl = za.querySelector('.cr-d');
    function size() {
      var w = Math.round(Math.min(innerWidth * .22, innerHeight * .36, 330));
      if (innerWidth < 900) w = Math.round(Math.min(innerWidth * .58, innerHeight * .42));
      ring.style.setProperty('--w', w + 'px'); ring.style.setProperty('--step', step + 'deg'); ring.style.setProperty('--r', Math.round(w / 2 / Math.tan(Math.PI / n) * 1.15) + 'px');
    }
    /* видео играет только у переднего кадра и только пока блок на экране */
    function sync() {
      figs.forEach(function (f, k) {
        var v = f.querySelector('video'); if (!v) return;
        if (k === cur && inView && !still) { v.preload = 'auto'; v.play().catch(function () {}); } else v.pause();
      });
    }
    function paint() {
      ring.style.setProperty('--a', a + 'deg');
      figs.forEach(function (f, i) { var d = Math.abs((((i * step + a) % 360) + 540) % 360 - 180); f.style.setProperty('--d', Math.min(1, d / 90).toFixed(3)); });
      var i = ((Math.round(-a / step) % n) + n) % n; if (i === cur) return; cur = i;
      figs.forEach(function (f, k) { f.classList.toggle('front', k === i); });
      sync();
      nEl.textContent = i + 1; tEl.textContent = figs[i].getAttribute('data-t'); dEl.textContent = figs[i].getAttribute('data-d');
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }
    function go(t) {
      var f0 = a, t0 = performance.now(), dur = still ? 0 : 900; cancelAnimationFrame(anim);
      (function f(now) { var q = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - q, 4); a = f0 + (t - f0) * e; paint(); if (q < 1) anim = requestAnimationFrame(f); })(t0);
    }
    function idx() { return Math.round(-a / step); }
    function to(k) { go(-k * step); auto(); }
    za.querySelector('.cr-next').onclick = function () { to(idx() + 1); };
    za.querySelector('.cr-prev').onclick = function () { to(idx() - 1); };
    scene.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { to(idx() + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { to(idx() - 1); e.preventDefault(); } });
    scene.addEventListener('pointerdown', function (e) { cancelAnimationFrame(anim); drag = { x: e.clientX, a: a }; scene.setPointerCapture(e.pointerId); });
    scene.addEventListener('pointermove', function (e) { if (drag) { a = drag.a + (e.clientX - drag.x) * .2; paint(); } });
    function up() { if (!drag) return; drag = null; to(idx()); }
    scene.addEventListener('pointerup', up); scene.addEventListener('pointercancel', up);
    /* автолистание: пауза при наведении, фокусе, перетаскивании, скрытой вкладке и вне экрана; при сниженной анимации его нет */
    function auto() { clearInterval(timer); if (still || !inView) return; timer = setInterval(function () { if (!hold && !drag && !document.hidden) go(-(idx() + 1) * step); }, 3600); }
    scene.addEventListener('mouseenter', function () { hold = true; }); scene.addEventListener('mouseleave', function () { hold = false; });
    scene.addEventListener('focusin', function () { hold = true; }); scene.addEventListener('focusout', function () { hold = false; });
    visibleOf(scene, function (v) { inView = v; if (v) auto(); else clearInterval(timer); sync(); }, .3);
    size(); addEventListener('resize', function () { size(); paint(); }); paint();
  }

  /* ═══ 3. «Ночь. Протечка.»: ролик, смена строк (запасной путь), кнопка звука ═══ */
  function initLeak() {
    var lk = document.getElementById('lk'); if (!lk) return;
    var steps = [].slice.call(lk.querySelectorAll('#lkSteps li')), dotEls = [].slice.call(lk.querySelectorAll('#lkDots i')), vEl = document.getElementById('lkVid'), snd = document.getElementById('lkSnd'), mq = matchMedia('(min-width: 900px)'), cur = -1, shown = false;
    /* строки меняет CSS (santehnika.css, шкала --lk) от 900 px при поддержке view() и без reduced-motion; скрипт нужен только в остальных случаях */
    function viaCss() { return cssTl && mq.matches; }
    function tLk() {
      if (!shown || viaCss() || !mq.matches) return;
      var i = Math.min(steps.length - 1, Math.floor(prog(lk) * steps.length)); if (i === cur) return; cur = i;
      steps.forEach(function (l, k) { l.classList.toggle('on', k === i); }); dotEls.forEach(function (d, k) { d.classList.toggle('on', k <= i); });
    }
    /* звук включается только по нажатию: ролик идёт сначала один раз, потом возвращается к беззвучной петле; при уходе с блока пауза и беззвучный режим */
    function setSnd(on, noPlay) {
      if (!snd) return;
      vEl.muted = !on; vEl.loop = !on;
      if (on) { vEl.currentTime = 0; vEl.play().catch(function () {}); }
      else if (!noPlay && shown && !still) vEl.play().catch(function () {});
      snd.setAttribute('aria-pressed', on ? 'true' : 'false'); snd.querySelector('span').textContent = on ? 'Выключить звук' : 'Включить звук';
    }
    if (snd) {
      snd.addEventListener('click', function () { setSnd(vEl.muted); });
      vEl.addEventListener('ended', function () { setSnd(false); });
    }
    visibleOf(vEl, function (v) {
      shown = v;
      if (v && !still) vEl.play().catch(function () {});
      else { if (snd && !vEl.muted) setSnd(false, true); vEl.pause(); }
      if (v) tLk();
    }, .2);
    var raf = 0;
    addEventListener('scroll', function () { if (raf || viaCss()) return; raf = requestAnimationFrame(function () { raf = 0; tLk(); }); }, { passive: true });
  }

  initNiche(); initCarousel(); initLeak();
})();
