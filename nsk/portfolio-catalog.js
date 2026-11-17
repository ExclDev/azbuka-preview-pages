/* portfolio-catalog.js: каталог портфолио. Только ленивые петли: src при подходе к экрану (200 px), пауза вне экрана.
   WebM только где VP9 «probably», иначе MP4. Save-Data, 2G и prefers-reduced-motion: ничего не играет, видны постеры («3g» не считаем).
   На телефоне одновременно играет не больше трёх петель: четвёртая вытесняет самую раннюю. */
(() => {
  const nc = navigator.connection, lite = !!(nc && (nc.saveData || /2g$/.test(nc.effectiveType || '')));
  if (lite || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const webm = document.createElement('video').canPlayType('video/webm; codecs="vp9"') === 'probably';
  const phone = matchMedia('(max-width: 759px)');
  const playing = [];
  const start = v => {
    if (!v.getAttribute('src')) v.src = (webm && v.dataset.webm) ? v.dataset.webm : v.dataset.src;
    if (!playing.includes(v)) playing.push(v);
    while (phone.matches && playing.length > 3) playing.shift().pause();
    v.play().catch(() => {});
  };
  const stop = v => { const i = playing.indexOf(v); if (i > -1) playing.splice(i, 1); if (!v.paused) v.pause(); };
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start(e.target) : stop(e.target)), { rootMargin: '200px 0px' });
  document.querySelectorAll('video[data-src]').forEach(v => io.observe(v));
})();
