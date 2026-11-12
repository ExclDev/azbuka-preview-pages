/* ═══ home.js: код главной (форма на странице, таймер акции, видео, глобус, портфолио, отзывы). Подключается после base.js ═══ */
function openAboutVideo() {
  var lightbox = document.getElementById('avLightbox');
  var video = document.getElementById('avLightboxVideo');
  if (!lightbox || !video) return;
  video.poster = 'images/about-video-poster.jpg';
  video.src = 'videos/about-video.mp4';
  video.muted = false;
  video.currentTime = 0;
  lightbox.classList.add('open');
  document.documentElement.classList.add('scroll-locked');
  video.play().catch(function () {});
}
if (document.getElementById('mainForm')) {
document.getElementById('mainForm').addEventListener('submit', e => handleFormSubmit(e, e.target));
// Форма на странице открыта с момента загрузки — от неё и считаем время.
AZ_LEAD.markOpened(document.getElementById('mainForm'));
// Кнопка формы на странице — единственная своя, попапную ставит openPopup.
document.getElementById('mainForm').addEventListener('focusin', function () {
  if (!AZ_LEAD.trigger) AZ_LEAD.trigger = 'Форма на странице — Отправить заявку';
}, { once: true });
}
(function () {
  const aboutTop = document.querySelector('.about-top');
  if (!aboutTop) return;
  const obs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      aboutTop.classList.add('is-visible');
      obs.unobserve(aboutTop);
    }
  }, { threshold: 0.2 });
  obs.observe(aboutTop);
})();
function toggleTech(btn) {
  const items  = document.querySelectorAll('.tech-hidden');
  const isOpen = items[0] && items[0].classList.contains('show');
  items.forEach(li => li.classList.toggle('show', !isOpen));
  btn.querySelector('span').textContent = isOpen ? 'Показать полностью' : 'Свернуть';
}
(function initFlipCards() {
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (!isTouch) return;
  document.querySelectorAll('.reason-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.reason-card.flipped').forEach(c => {
        if (c !== card) c.classList.remove('flipped');
      });
      card.classList.toggle('flipped');
    });
  });
})();
(function initVideoReels() {
  var rail = document.getElementById('avRail');
  if (!rail) return;
  var cards = Array.from(rail.querySelectorAll('.av-card'));
  var lightbox = document.getElementById('avLightbox');
  var lightboxVideo = document.getElementById('avLightboxVideo');
  var lightboxClose = document.getElementById('avLightboxClose');
  var currentlyPlaying = null;
  function playOnly(video) {
    if (currentlyPlaying && currentlyPlaying !== video) {
      currentlyPlaying.pause();
    }
    if (video && video !== currentlyPlaying) {
      video.play().catch(function () {});
    }
    currentlyPlaying = video;
  }
  var ratios = new Map();
  var suppressAutoplay = false;
  function applyVisibilityAutoplay() {
    var bestCard = null;
    var bestRatio = 0;
    ratios.forEach(function (ratio, card) {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestCard = card;
      }
    });
    if (bestCard) {
      playOnly(bestCard.querySelector('.av-video'));
    } else if (currentlyPlaying) {
      currentlyPlaying.pause();
      currentlyPlaying = null;
    }
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });
    if (suppressAutoplay) return;
    applyVisibilityAutoplay();
  }, { threshold: [0.6, 0.75, 0.9] });
  cards.forEach(function (card) { io.observe(card); });
  /* Ленивая подгрузка постеров: отдельный observer с запасом по rootMargin,
     чтобы не трогать пороги/логику автовоспроизведения основного observer. */
  var posterObserver = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var video = entry.target.querySelector('.av-video');
      if (video) {
        if (video.dataset.poster) {
          video.poster = video.dataset.poster;
        }
        video.preload = 'metadata';
      }
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '400px 0px', threshold: 0 });
  cards.forEach(function (card) { posterObserver.observe(card); });
  /* Ховер запускает видео карточки под курсором — только на устройствах
     с настоящим курсором, чтобы не мешать touch-автоплею по видимости. */
  var hoverCapable = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hoverCapable) {
    var resumeTimer = null;
    cards.forEach(function (card) {
      var video = card.querySelector('.av-video');
      if (!video) return;
      card.addEventListener('mouseenter', function () {
        suppressAutoplay = true;
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        playOnly(video);
      });
      card.addEventListener('mouseleave', function () {
        if (currentlyPlaying === video) {
          video.pause();
          currentlyPlaying = null;
        }
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () {
          resumeTimer = null;
          suppressAutoplay = false;
          applyVisibilityAutoplay();
        }, 180);
      });
    });
  }
  /* Горизонтальный скролл колесом мыши, как в карусели отзывов */
  rail.addEventListener('wheel', function (e) {
    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 0) {
      e.preventDefault();
      rail.scrollLeft += delta;
    }
  }, { passive: false });
  function centerRailIfNoOverflow() {
    rail.style.justifyContent = rail.scrollWidth <= rail.clientWidth ? 'center' : 'flex-start';
  }
  centerRailIfNoOverflow();
  window.addEventListener('resize', centerRailIfNoOverflow);
  cards.forEach(function (card) {
    var btn = card.querySelector('.av-sound-btn');
    var video = card.querySelector('.av-video');
    if (!btn || !video) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (video.dataset.fullSrc) {
        openLightbox(video.dataset.fullSrc);
      } else {
        video.muted = !video.muted;
        btn.dataset.state = video.muted ? 'muted' : 'on';
        btn.setAttribute('aria-label', video.muted ? 'Включить звук' : 'Выключить звук');
      }
    });
  });
  function openLightbox(src) {
    lightboxVideo.src = src;
    lightboxVideo.muted = false;
    lightboxVideo.currentTime = 0;
    lightbox.classList.add('open');
    document.documentElement.classList.add('scroll-locked');
    lightboxVideo.play().catch(function () {});
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    document.documentElement.classList.remove('scroll-locked');
    lightboxVideo.pause();
    lightboxVideo.removeAttribute('src');
    lightboxVideo.load();
  }
  lightboxVideo.addEventListener('ended', closeLightbox);
  cards.forEach(function (card) {
    var video = card.querySelector('.av-video');
    card.addEventListener('click', function () {
      var fullSrc = video.dataset.fullSrc || video.getAttribute('src');
      openLightbox(fullSrc);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var fullSrc = video.dataset.fullSrc || video.getAttribute('src');
        openLightbox(fullSrc);
      }
    });
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });
})();
(function initOfficeGlobe() {
  var canvas = document.getElementById('officeGlobe');
  var revealBtn = document.getElementById('mapRevealBtn');
  var mapWrap = document.getElementById('contactsMap');
  if (!canvas || !revealBtn || !mapWrap) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Точки суши — Fibonacci-sphere lattice, только по земле. [lat0, lon0, lat1, lon1, ...] */
  var LAND_DOTS_FLAT = [81.4,-44.86,80.27,-77.32,79.66,-24.8,78.7,-57.26,77.32,-37.2,76.53,-69.66,76.38,67.85,75.78,-102.12,75.35,-49.6,74.66,-82.06,74.26,-29.53,74.13,107.97,73.11,128.04,72.99,-94.46,72.62,-41.93,72.5,95.57,72.15,148.1,71.57,115.64,71.46,-106.86,71.02,83.18,70.69,135.7,70.58,-86.79,70.26,-34.27,70.15,103.24,69.84,155.76,69.63,70.78,69.53,-151.72,69.33,123.3,69.22,-99.19,69.02,175.82,68.92,-46.67,68.82,90.84,68.73,-131.65,68.53,143.36,68.33,58.38,68.24,-164.11,68.04,110.9,67.85,25.92,67.76,163.42,67.57,78.44,67.48,-144.05,67.29,130.96,67.2,-91.53,67.01,-176.51,66.92,-39.01,66.83,98.5,66.74,-123.99,66.65,13.52,66.56,151.02,66.47,-71.47,66.38,66.04,66.29,-156.45,66.2,-18.94,66.11,118.56,66.03,-103.93,65.94,33.58,65.85,171.09,65.76,-51.41,65.67,86.1,65.59,-136.39,65.42,138.63,65.24,53.64,64.99,106.16,64.9,-116.33,64.82,21.18,64.74,158.69,64.57,73.7,64.48,-148.79,64.32,126.23,64.24,-96.27,64.15,41.24,63.99,-43.74,63.91,93.77,63.83,-128.73,63.67,146.29,63.5,61.3,63.42,-161.19,63.26,113.83,63.18,-108.66,63.11,28.84,63.03,166.35,62.87,81.37,62.79,-141.13,62.63,133.89,62.48,48.91,62.25,101.43,62.17,-121.06,62.09,16.44,62.02,153.95,61.86,68.97,61.79,-153.52,61.64,121.49,61.56,-101.0,61.49,36.51,61.34,-48.48,61.26,89.03,61.19,-133.46,61.04,141.55,60.89,56.57,60.67,109.09,60.6,-113.4,60.53,24.11,60.31,76.63,60.09,129.15,59.95,44.17,59.74,96.69,59.66,-125.8,59.59,11.71,59.52,149.22,59.45,-73.28,59.38,64.23,59.31,-158.26,59.17,116.75,59.1,-105.74,59.03,31.77,58.82,84.29,58.75,-138.2,58.62,136.82,58.48,51.83,58.27,104.36,58.21,-118.14,58.0,-65.61,57.94,71.89,57.73,124.42,57.67,-98.07,57.6,39.43,57.4,91.96,57.33,-130.54,57.07,59.5,56.87,112.02,56.81,-110.47,56.74,27.03,56.55,79.56,56.42,-5.43,56.35,132.08,56.29,-90.41,56.22,47.1,56.03,99.62,55.97,-122.87,55.77,-70.35,55.71,67.16,55.52,119.68,55.46,-102.81,55.39,34.7,55.2,87.22,54.95,-82.75,54.89,54.76,54.71,107.28,54.64,-115.21,54.58,22.3,54.52,159.81,54.46,-62.69,54.4,74.82,54.21,127.34,54.15,-95.15,54.09,42.36,53.91,94.88,53.85,-127.61,53.79,9.9,53.66,-75.09,53.6,62.42,53.42,114.95,53.36,-107.55,53.3,29.96,53.12,82.48,53.0,-2.5,52.95,135.01,52.89,-87.48,52.83,50.02,52.65,102.55,52.59,-119.95,52.53,17.56,52.41,-67.42,52.35,70.09,52.18,122.61,52.12,-99.88,52.06,37.62,51.89,90.15,51.77,5.16,51.71,142.67,51.6,57.69,51.43,110.21,51.37,-112.28,51.31,25.23,51.2,-59.76,51.14,77.75,50.97,130.27,50.91,-92.22,50.86,45.29,50.69,97.81,50.63,-124.68,50.57,12.83,50.46,-72.16,50.4,65.35,50.24,117.87,50.18,-104.62,50.12,32.89,49.96,85.41,49.79,137.93,49.73,-84.56,49.68,52.95,49.51,105.47,49.46,-117.02,49.4,20.49,49.24,73.01,49.07,125.54,49.02,-96.96,48.96,40.55,48.8,93.07,48.69,8.09,48.58,-76.89,48.53,60.61,48.37,113.14,48.31,-109.36,48.26,28.15,48.15,-56.83,48.1,80.68,47.99,-4.31,47.94,133.2,47.88,-89.29,47.83,48.21,47.67,100.74,47.62,-121.75,47.56,15.75,47.46,-69.23,47.41,68.28,47.25,120.8,47.19,-101.69,47.14,35.82,46.98,88.34,46.88,3.35,46.77,-81.63,46.72,55.88,46.57,108.4,46.51,-114.09,46.46,23.42,46.31,75.94,46.15,128.46,46.1,-94.03,46.05,43.48,45.89,96.0,45.79,11.02,45.69,-73.97,45.64,63.54,45.48,116.06,45.43,-106.43,45.23,83.6,45.08,136.13,45.02,-86.37,44.82,103.66,44.77,-118.83,44.72,18.68,44.57,71.2,44.42,123.73,44.37,-98.77,44.32,38.74,44.17,91.27,44.07,6.28,44.02,143.79,43.97,-78.7,43.92,58.8,43.77,111.33,43.72,-111.16,43.67,26.34,43.52,78.87,43.42,-6.12,43.38,131.39,43.33,-91.1,43.28,46.41,43.13,98.93,43.08,-123.56,42.93,-71.04,42.88,66.47,42.74,118.99,42.69,-103.5,42.49,86.53,42.4,1.55,42.3,-83.44,42.25,54.07,42.11,106.59,42.06,-115.9,42.01,21.61,41.87,74.13,41.72,126.65,41.67,-95.84,41.63,41.67,41.48,94.19,41.29,-75.78,41.24,61.73,41.1,114.25,41.05,-108.24,41.01,29.27,40.86,81.79,40.77,-3.19,40.67,-88.18,40.63,49.33,40.49,101.86,40.44,-120.64,40.25,69.39,40.11,121.92,40.06,-100.57,40.02,36.93,39.88,89.46,39.69,-80.51,39.64,57.0,39.5,109.52,39.46,-112.97,39.27,77.06,39.18,-7.93,39.09,-92.91,39.04,44.6,38.9,97.12,38.67,64.66,38.54,117.18,38.49,-105.31,38.44,32.2,38.31,84.72,38.13,-85.25,37.94,104.78,37.9,-117.71,37.72,72.32,37.54,-97.65,37.49,39.86,37.36,92.38,37.17,-77.59,37.13,59.92,37.0,112.45,36.95,-110.05,36.77,79.98,36.68,-5.0,36.59,-89.98,36.55,47.52,36.41,100.05,36.19,67.59,36.06,120.11,36.01,-102.38,35.84,87.65,35.75,2.66,35.71,140.17,35.66,-82.32,35.62,55.19,35.49,107.71,35.44,-114.78,35.27,75.25,35.13,127.77,35.09,-94.72,35.05,42.79,34.92,95.31,34.83,10.33,34.7,62.85,34.57,115.37,34.52,-107.12,34.35,82.91,34.26,-2.07,34.22,135.43,34.18,-87.06,34.13,50.45,34.0,102.97,33.79,70.51,33.62,-99.46,33.57,38.05,33.44,90.57,33.36,5.59,33.27,-79.39,33.23,58.11,33.1,110.64,33.06,-111.86,32.89,78.18,32.8,-6.81,32.76,130.7,32.72,-91.79,32.67,45.71,32.55,98.24,32.46,13.25,32.33,65.78,32.21,118.3,32.16,-104.19,32.0,85.84,31.91,0.85,31.83,-84.13,31.78,53.38,31.66,105.9,31.62,-116.59,31.57,20.92,31.45,73.44,31.28,-96.53,31.24,40.98,31.11,93.5,31.03,8.52,30.9,61.04,30.78,113.56,30.74,-108.93,30.7,28.58,30.57,81.1,30.49,-3.88,30.4,-88.87,30.36,48.64,30.24,101.16,30.16,16.18,30.03,68.7,29.91,121.23,29.87,-101.27,29.82,36.24,29.7,88.77,29.62,3.78,29.54,-81.2,29.49,56.3,29.37,108.83,29.29,23.84,29.17,76.37,29.08,-8.62,28.96,43.91,28.84,96.43,28.76,11.44,28.63,63.97,28.51,116.49,28.47,-106.0,28.43,31.51,28.31,84.03,28.23,-0.95,28.1,51.57,27.98,104.09,27.9,19.11,27.78,71.63,27.62,-98.34,27.58,39.17,27.46,91.69,27.38,6.71,27.26,59.23,27.13,111.75,27.05,26.77,26.93,79.29,26.85,-5.69,26.73,46.83,26.61,99.36,26.53,14.37,26.41,66.89,26.29,119.42,26.25,-103.07,26.09,86.96,26.01,1.97,25.77,107.02,25.69,22.03,25.58,74.56,25.5,-10.43,25.38,42.1,25.26,94.62,25.18,9.64,24.94,114.68,24.9,-107.81,24.86,29.7,24.74,82.22,24.67,-2.76,24.55,49.76,24.43,102.28,24.35,17.3,24.23,69.82,24.15,-15.16,24.08,-100.15,23.92,89.88,23.84,4.9,23.72,57.42,23.61,109.95,23.53,24.96,23.41,77.48,23.33,-7.5,23.22,45.02,23.1,97.55,23.02,12.56,22.75,-104.88,22.71,32.62,22.59,85.15,22.52,0.16,22.4,52.69,22.28,105.21,22.21,20.23,22.09,72.75,22.01,-12.24,21.9,40.29,21.78,92.81,21.7,7.83,21.63,-77.16,21.4,27.89,21.28,80.41,21.2,-4.57,21.13,-89.56,21.09,47.95,20.97,100.47,20.9,15.49,20.63,-101.96,20.59,35.55,20.4,3.09,20.28,55.61,20.09,23.15,19.98,75.68,19.9,-9.31,19.79,43.21,19.67,95.74,19.6,10.75,19.29,30.82,19.18,83.34,19.1,-1.65,18.99,50.88,18.88,103.4,18.8,18.42,18.61,-14.04,18.54,-99.03,18.31,6.02,18.01,26.08,17.9,78.6,17.82,-6.38,17.75,-91.37,17.71,46.14,17.59,98.66,17.52,13.68,17.22,33.74,17.03,1.28,16.92,53.8,16.81,106.33,16.73,21.34,16.62,73.87,16.55,-11.12,16.47,-96.1,16.25,8.94,15.95,29.01,15.76,-3.45,15.69,-88.44,15.65,49.07,15.54,101.59,15.46,16.61,15.28,-15.85,15.17,36.67,14.98,4.21,14.69,24.27,14.57,76.79,14.5,-8.19,14.39,44.33,14.2,11.87,13.91,31.93,13.72,-0.53,13.65,-85.51,13.5,104.52,13.43,19.53,13.25,-12.93,13.14,39.6,12.95,7.14,12.66,27.2,12.55,79.72,12.47,-5.26,12.25,99.78,12.18,14.8,11.89,34.86,11.71,2.4,11.49,107.45,11.41,22.46,11.23,-10.0,11.12,42.52,10.94,10.06,10.87,-74.92,10.65,30.12,10.46,-2.34,10.35,50.19,10.17,17.73,10.1,-67.26,9.95,122.77,9.88,37.79,9.7,5.33,9.41,25.39,9.3,77.91,9.23,-7.07,9.12,45.45,8.94,12.99,8.87,-72.0,8.65,33.05,8.47,0.59,8.18,20.65,8.1,-64.33,8.0,-11.81,7.96,125.7,7.89,40.71,7.71,8.25,7.63,-76.73,7.42,28.32,7.31,80.84,7.24,-4.15,7.13,48.38,6.95,15.92,6.88,-69.07,6.66,35.98,6.48,3.52,6.19,23.58,6.12,-61.41,6.01,-8.88,5.9,43.64,5.72,11.18,5.65,-73.8,5.51,116.23,5.44,31.24,5.36,-53.74,5.26,-1.22,4.97,18.84,4.9,-66.14,4.68,38.91,4.5,6.44,4.21,26.51,4.14,-58.48,3.93,46.57,3.75,14.11,3.67,-70.88,3.46,34.17,2.99,21.77,2.92,-63.21,2.71,41.83,2.45,-75.61,2.31,114.42,2.24,29.43,2.17,-55.55,1.77,17.03,1.7,-67.95,1.49,37.1,1.09,109.68,1.02,24.7,0.95,-60.29,0.56,12.3,0.48,-72.69,0.34,117.34,0.27,32.36,0.2,-52.62,-0.2,19.96,-0.27,-65.02,-0.48,40.02,-0.73,-77.42,-0.88,112.61,-0.95,27.62,-1.02,-57.36,-1.16,132.67,-1.42,15.23,-1.49,-69.76,-1.63,120.27,-1.7,35.29,-1.77,-49.7,-2.17,22.89,-2.24,-62.1,-2.63,10.49,-2.71,-74.5,-2.85,115.54,-2.92,30.55,-2.99,-54.43,-3.32,103.14,-3.39,18.15,-3.46,-66.83,-3.67,38.21,-3.75,-46.77,-3.89,143.26,-3.93,-79.23,-4.14,25.82,-4.21,-59.17,-4.5,-39.11,-4.61,13.42,-4.68,-71.57,-4.9,33.48,-4.97,-51.51,-5.11,138.52,-5.36,21.08,-5.44,-63.91,-5.72,-43.84,-5.87,146.19,-5.9,-76.3,-6.12,28.74,-6.19,-56.24,-6.48,-36.18,-6.59,16.34,-6.66,-68.64,-6.88,36.41,-6.95,-48.58,-7.09,141.45,-7.27,108.99,-7.35,24.01,-7.42,-60.98,-7.71,-40.92,-7.89,-73.38,-8.1,31.67,-8.18,-53.32,-8.58,19.27,-8.65,-65.71,-8.87,39.33,-8.94,-45.65,-9.12,-78.11,-9.34,26.93,-9.41,-58.05,-9.7,-37.99,-9.81,14.53,-9.88,-70.45,-10.1,34.6,-10.17,-50.39,-10.57,22.2,-10.65,-62.79,-10.94,-42.73,-11.12,-75.19,-11.34,29.86,-11.41,-55.12,-11.81,17.46,-11.89,-67.52,-12.11,37.52,-12.18,-47.46,-12.33,142.57,-12.58,25.12,-12.66,-59.86,-12.95,-39.8,-13.14,-72.26,-13.36,32.79,-13.43,-52.2,-13.84,20.39,-13.91,-64.6,-14.13,40.45,-14.2,-44.53,-14.61,28.05,-14.69,-56.93,-14.83,133.1,-14.91,48.11,-15.09,15.65,-15.17,-69.33,-15.39,35.71,-15.46,-49.27,-15.87,23.32,-15.95,-61.67,-16.1,128.36,-16.25,-41.61,-16.66,30.98,-16.73,-54.01,-16.88,136.02,-17.14,18.58,-17.22,-66.41,-17.37,123.63,-17.52,-46.34,-17.67,143.69,-17.93,26.24,-18.01,-58.74,-18.16,131.29,-18.23,46.3,-18.42,13.84,-18.73,33.91,-18.8,-51.08,-18.95,138.95,-19.22,21.51,-19.29,-63.48,-19.45,126.55,-19.6,-43.42,-19.75,146.62,-20.02,29.17,-20.09,-55.82,-20.25,134.22,-20.51,16.77,-20.59,-68.21,-20.74,121.82,-20.9,-48.15,-21.05,141.88,-21.32,24.43,-21.4,-60.55,-21.55,129.48,-21.63,44.5,-22.05,117.08,-22.13,32.1,-22.21,-52.89,-22.36,137.14,-22.63,19.7,-22.71,-65.29,-22.86,124.74,-23.02,-45.22,-23.18,144.81,-23.45,27.36,-23.53,-57.62,-23.68,132.41,-23.76,47.42,-23.96,14.96,-24.04,-70.02,-24.19,120.01,-24.27,35.02,-24.35,-49.96,-24.51,140.07,-24.78,22.62,-24.86,-62.36,-25.02,127.67,-25.34,147.73,-25.54,115.27,-25.62,30.29,-25.69,-54.7,-25.85,135.33,-26.13,17.89,-26.21,-67.1,-26.37,122.93,-26.69,143.0,-26.97,25.55,-27.05,-59.43,-27.21,130.6,-27.54,150.66,-27.74,118.2,-27.9,-51.77,-28.06,138.26,-28.35,20.82,-28.43,-64.17,-28.59,125.86,-28.92,145.92,-29.21,28.48,-29.29,-56.51,-29.45,133.53,-29.82,-68.91,-29.99,121.13,-30.32,141.19,-30.61,23.74,-30.7,-61.24,-30.86,128.79,-31.2,148.85,-31.41,116.39,-31.57,-53.58,-31.74,136.45,-32.04,19.01,-32.12,-65.98,-32.29,124.05,-32.63,144.12,-32.93,26.67,-33.01,-58.32,-33.57,-70.71,-33.74,119.32,-34.09,139.38,-34.48,-63.05,-35.0,147.04,-35.97,-67.79,-36.5,142.31,-36.91,-60.12,-37.49,-72.52,-38.44,-64.86,-38.77,177.69,-40.02,-69.6,-41.58,148.16,-42.64,-66.67,-44.32,-71.41,-44.67,171.15,-47.14,-68.48,-48.96,-73.21,-52.06,-70.29,-67.01,143.85,-67.48,111.39,-68.24,131.45,-68.43,46.47,-68.73,98.99,-69.02,151.51,-69.12,-70.98,-69.22,66.53,-69.53,119.05,-69.74,34.07,-70.05,86.59,-70.37,139.12,-70.58,54.13,-70.91,106.65,-71.13,21.67,-71.24,159.18,-71.35,-63.31,-71.46,74.19,-71.69,-10.79,-71.8,126.72,-72.03,41.73,-72.38,94.25,-72.62,9.27,-72.74,146.78,-72.99,61.79,-73.36,114.32,-73.61,29.33,-73.74,166.84,-74.0,81.86,-74.26,-3.13,-74.39,134.38,-74.52,-88.11,-74.66,49.39,-75.07,101.92,-75.21,-120.57,-75.35,16.93,-75.49,154.44,-75.64,-68.05,-75.78,69.46,-76.08,-15.53,-76.23,121.98,-76.38,-100.51,-76.53,37.0,-77.0,89.52,-77.16,-132.97,-77.32,4.53,-77.49,142.04,-77.65,-80.45,-77.82,57.06,-78.17,-27.93,-78.34,109.58,-78.52,-112.91,-78.7,24.6,-78.89,162.1,-79.26,77.12,-79.46,-145.37,-79.66,-7.86,-79.86,129.64,-80.06,-92.85,-80.27,44.66,-80.93,97.18,-81.16,-125.31,-81.4,12.2,-81.64,149.71,-81.89,-72.79,-82.15,64.72,-82.69,-20.26,-82.98,117.24,-83.28,-105.25,-83.59,32.26,-83.92,169.77,-84.27,-52.72,-84.64,84.78,-85.04,-137.71,-85.47,-0.2,-85.95,137.31,-86.49,-85.19,-87.13,52.32,-87.97,-170.17,-90.0,-0.0];

  // Маркеры городов — совпадают с координатами офисов в данных городов (src/_data/cities)
  var MARKERS = [
    { key: 'tomsk',       lat: 56.4587, lon: 84.9563, size: 1.1 },
    { key: 'novosibirsk', lat: 55.0418, lon: 82.9301, size: 1.1 },
  ];

  var CONFIG = {
    autoRotateSpeed: 0.0032,
    theta: 0.28,
    dotBaseSize: 1.55,
    markerBaseSize: 3.6,
    diffuse: 0.85,
    ambient: 0.16,
    dragSensitivity: 0.010,
    springBack: 0.045,
  };

  var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2.5);
  var radius = 0;
  var phi = -1.48, theta = CONFIG.theta;
  var rotationVelocity = CONFIG.autoRotateSpeed;
  var dragging = false;
  var lastPointer = { x: 0, y: 0 };
  var pointerVelocity = { x: 0, y: 0 };
  var rafId = null;
  var running = false;
  var activeCityKey = mapWrap.dataset.cityKey || 'tomsk';
  var markerPhase = MARKERS.map(function () { return Math.random() * Math.PI * 2; });

  // На узких экранах прореживаем точки для меньшей нагрузки на CPU
  var dotStep = window.innerWidth < 480 ? 2 : 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2.5);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    // радиус сферы — от меньшей стороны, чтобы сфера оставалась кругом
    // в прямоугольном канвасе, а не растягивалась под форму контейнера
    radius = Math.min(canvas.width, canvas.height) * 0.46;
  }
  window.addEventListener('resize', resize);

  // Пересчитываем размер при любом изменении фактических размеров контейнера
  // (grid-раскладка, брейкпоинты), а не только при resize окна
  var roCanvas = new ResizeObserver(function () { resize(); });
  roCanvas.observe(mapWrap);

  function normalize(v) {
    var len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }
  var light = normalize({ x: -0.55, y: 0.35, z: 0.9 });

  function project(latDeg, lonDeg, phiRot, thetaRot) {
    var lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
    var x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
    var cy = Math.cos(phiRot), sy = Math.sin(phiRot);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    var ct = Math.cos(thetaRot), st = Math.sin(thetaRot);
    var y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
    return { x: x1, y: y2, z: z2 };
  }
  function brightnessOf(nx, ny, nz) {
    var d = nx * light.x + ny * light.y + nz * light.z;
    return Math.min(1, CONFIG.ambient + Math.max(0, d) * CONFIG.diffuse);
  }

  function render(now) {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cx = canvas.width / 2, cy = canvas.height / 2;

    if (!dragging && !reduceMotion) {
      rotationVelocity += (CONFIG.autoRotateSpeed - rotationVelocity) * CONFIG.springBack;
      phi += rotationVelocity;
    }

    var rim = ctx.createRadialGradient(cx, cy, radius * 0.86, cx, cy, radius);
    rim.addColorStop(0, 'rgba(232,32,26,0.05)');
    rim.addColorStop(1, 'rgba(232,32,26,0)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

    var dotSize = CONFIG.dotBaseSize * (canvas.width / 620);
    var n = LAND_DOTS_FLAT.length / 2;
    for (var i = 0; i < n; i += dotStep) {
      var lat = LAND_DOTS_FLAT[i * 2], lon = LAND_DOTS_FLAT[i * 2 + 1];
      var p = project(lat, lon, phi, theta);
      if (p.z < -0.02) continue;
      var b = brightnessOf(p.x, p.y, p.z);
      var sx = cx + p.x * radius, sy = cy - p.y * radius;
      var depthScale = 0.55 + 0.55 * Math.max(0, p.z);
      var r = Math.round(20 + (232 - 20) * b);
      var g = Math.round(12 + (32 - 12) * b);
      var bl = Math.round(6 + (26 - 6) * b);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + (0.35 + 0.65 * b) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, dotSize * depthScale, 0, Math.PI * 2); ctx.fill();
    }

    var markerSize = CONFIG.markerBaseSize * (canvas.width / 620);
    for (var mi = 0; mi < MARKERS.length; mi++) {
      var m = MARKERS[mi];
      var isActive = m.key === activeCityKey;
      var pm = project(m.lat, m.lon, phi, theta);
      if (pm.z < -0.02) continue;
      var bm = brightnessOf(pm.x, pm.y, pm.z);
      var smx = cx + pm.x * radius, smy = cy - pm.y * radius;
      var depthScaleM = 0.6 + 0.5 * Math.max(0, pm.z);
      var baseR = markerSize * m.size * depthScaleM * (isActive ? 1.15 : 0.85);
      var pulse = reduceMotion ? 0.5 : (Math.sin(now * 0.0018 + markerPhase[mi]) + 1) / 2;
      var haloR = baseR * (isActive ? (2.0 + pulse * 1.8) : (1.3 + pulse * 0.6));
      var haloAlpha = (isActive ? 0.28 : 0.12) * (0.4 + 0.6 * bm);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(232,32,26,' + haloAlpha + ')';
      ctx.arc(smx, smy, haloR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = isActive
        ? 'rgba(255,' + Math.round(60 + 60 * bm) + ',' + Math.round(50 + 40 * bm) + ',' + (0.75 + 0.25 * bm) + ')'
        : 'rgba(232,32,26,' + (0.35 + 0.25 * bm) + ')';
      ctx.arc(smx, smy, baseR, 0, Math.PI * 2); ctx.fill();
    }

    rafId = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(render);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Анимация идёт только пока секция контактов видна
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (mapWrap.classList.contains('contacts-map--revealed')) return;
      if (entry.isIntersecting) start(); else stop();
    });
  }, { threshold: 0.1 });
  io.observe(mapWrap);

  resize();
  render(0); // первый статичный кадр сразу, не дожидаясь observer'а

  // --- drag / вращение мышью и тачем ---
  function pointerDown(x, y) {
    dragging = true; lastPointer = { x: x, y: y }; pointerVelocity = { x: 0, y: 0 };
    canvas.classList.add('grabbing');
  }
  function pointerMove(x, y) {
    if (!dragging) return;
    var dx = x - lastPointer.x, dy = y - lastPointer.y;
    lastPointer = { x: x, y: y };
    phi += dx * CONFIG.dragSensitivity;
    theta = Math.max(-1.1, Math.min(1.1, theta + dy * CONFIG.dragSensitivity * 0.6));
    pointerVelocity = { x: dx, y: dy };
  }
  function pointerUp() {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('grabbing');
    rotationVelocity = CONFIG.autoRotateSpeed + pointerVelocity.x * CONFIG.dragSensitivity * 0.6;
  }
  canvas.addEventListener('pointerdown', function (e) { canvas.setPointerCapture(e.pointerId); pointerDown(e.clientX, e.clientY); });
  canvas.addEventListener('pointermove', function (e) { pointerMove(e.clientX, e.clientY); });
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);

  // --- открытие карты по клику ---
  function revealMap() {
    if (mapWrap.classList.contains('contacts-map--revealed')) return;
    var src = mapWrap.dataset.mapSrc;
    var title = mapWrap.dataset.mapAlt;

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.cssText = 'border:0; display:block; min-height:500px;';
    mapWrap.appendChild(iframe);

    mapWrap.classList.add('contacts-map--revealed');
    stop();
    io.disconnect();

    if (typeof ym === 'function' && typeof YM_COUNTER_ID !== 'undefined' && YM_COUNTER_ID !== 'YOUR_COUNTER_ID') {
      try { ym(YM_COUNTER_ID, 'reachGoal', 'map_open'); } catch (e) {}
    }
  }
  revealBtn.addEventListener('click', revealMap);
})();
let typeTimer = null;
function typeHeroTitle(redText, whiteText) {
  const titleEl  = document.querySelector('[data-hero-title]');
  const badges   = document.getElementById('heroBadges');
  const ctas     = document.getElementById('heroCtas');
  if (!titleEl) return;
  const sp = whiteText.indexOf(' ');
  const word1 = sp === -1 ? whiteText : whiteText.slice(0, sp);  
  const rest  = sp === -1 ? ''        : whiteText.slice(sp);     
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    titleEl.innerHTML = '<em>' + redText + '</em><span class="white-line"><span class="word-white">' +
      word1 + '</span><span class="rest-red">' + rest + '</span></span>';
    if (badges) badges.classList.add('show');
    if (ctas)   ctas.classList.add('show');
    return;
  }
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  if (badges) badges.classList.remove('show');
  if (ctas)   ctas.classList.remove('show');
  titleEl.innerHTML =
    '<em><span class="red-text"></span><span class="type-caret" id="caretRed">&nbsp;</span></em>' +
    '<span class="white-line">' +
      '<span class="word-white"></span>' +
      '<span class="rest-red"></span>' +
      '<span class="type-caret done" id="caretWhite">&nbsp;</span>' +
    '</span>';
  const redEl    = titleEl.querySelector('.red-text');
  const wordEl   = titleEl.querySelector('.word-white');
  const restEl   = titleEl.querySelector('.rest-red');
  const caretRed = titleEl.querySelector('#caretRed');
  const caretWhite = titleEl.querySelector('#caretWhite');
  const SPEED = 55; 
  let phase = 0;    
  let i = 0;
  typeTimer = setInterval(() => {
    if (phase === 0) {
      if (i <= redText.length) {
        redEl.textContent = redText.slice(0, i);
        i++;
      } else {
        phase = 1; i = 0;
        caretRed.classList.add('done');
        caretWhite.classList.remove('done');
      }
    } else if (phase === 1) {
      if (i <= word1.length) {
        wordEl.textContent = word1.slice(0, i);
        i++;
      } else {
        phase = 2; i = 0;
      }
    } else {
      if (i <= rest.length) {
        restEl.textContent = rest.slice(0, i);
        i++;
      } else {
        clearInterval(typeTimer);
        typeTimer = null;
        caretWhite.classList.add('done');
        setTimeout(() => { if (badges) badges.classList.add('show'); }, 150);
        setTimeout(() => { if (ctas)   ctas.classList.add('show');   }, 350);
      }
    }
  }, SPEED);
}
typeHeroTitle('Профессиональный', AZ_CITY.heroLine2);
(function () {
  'use strict';
  var lb        = document.getElementById('lightbox');
  var lbImg     = document.getElementById('lightboxImg');
  var lbTitle   = document.getElementById('lightboxTitle');
  var lbSub     = document.getElementById('lightboxSub');
  var lbCounter = document.getElementById('lightboxCounter');
  var lbClose   = document.getElementById('lightboxClose');
  var lbPrev    = document.getElementById('lightboxPrev');
  var lbNext    = document.getElementById('lightboxNext');
  if (!lb || !lbImg) { console.warn('Lightbox: элементы не найдены'); return; }
  var photos  = Array.from(document.querySelectorAll('.consult-photo[data-caption]'));
  var current = 0;
  function showPhoto(idx) {
    current = ((idx % photos.length) + photos.length) % photos.length;
    var el  = photos[current];
    var img = el.querySelector('img');
    lbImg.src                 = img.src;
    lbImg.alt                 = img.alt;
    lbTitle.textContent       = el.dataset.caption || '';
    lbSub.textContent         = el.dataset.sub     || '';
    lbCounter.textContent     = (current + 1) + ' / ' + photos.length;
    lbPrev.style.display      = photos.length > 1 ? '' : 'none';
    lbNext.style.display      = photos.length > 1 ? '' : 'none';
  }
  function closeLightbox() {
    lb.classList.remove('open');
    document.documentElement.classList.remove('scroll-locked');
  }
  window.openLightbox = function (el) {
    var idx = photos.indexOf(el);
    showPhoto(idx >= 0 ? idx : 0);
    lb.classList.add('open');
    document.documentElement.classList.add('scroll-locked');
    lbClose.focus();
  };
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click',  function () { showPhoto(current - 1); });
  lbNext.addEventListener('click',  function () { showPhoto(current + 1); });
  lb.addEventListener('click',      function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  showPhoto(current - 1);
    if (e.key === 'ArrowRight') showPhoto(current + 1);
  });
  var touchX = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend',   function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { dx < 0 ? showPhoto(current + 1) : showPhoto(current - 1); }
    touchX = null;
  }, { passive: true });
})();
(function () {
  'use strict';
  var JSON_URL   = 'images/portfolio/portfolio.json';
  var grid       = document.getElementById('portfolioPreviewGrid');
  var modal      = document.getElementById('portfolioModal');
  var stage      = document.getElementById('portfolioModalStage');
  var titleEl    = document.getElementById('portfolioModalTitle');
  var subEl      = document.getElementById('portfolioModalSub');
  var counterEl  = document.getElementById('portfolioModalCounter');
  var thumbsEl   = document.getElementById('portfolioModalThumbs');
  var closeBtn   = document.getElementById('portfolioModalClose');
  var prevBtn    = document.getElementById('portfolioModalPrev');
  var nextBtn    = document.getElementById('portfolioModalNext');
  var quickWidget = document.getElementById('quickWidget');
  if (!grid || !modal || !stage) { console.warn('Portfolio: элементы не найдены'); return; }
  var photos    = [];
  var current   = 0;
  var THUMB_RANGE = 5;
  var DEFAULT_ALT = 'Пример ремонта — Азбука Ремонта';
  var stageImg = document.createElement('img');
  stageImg.className = 'portfolio-modal-img';
  stage.appendChild(stageImg);
  function wrap(i, len) { return ((i % len) + len) % len; }
  /* ═══ Превью-сетка ═══ */
  function renderGrid() {
    grid.innerHTML = '';
    var preview = photos.slice(0, 3);
    preview.forEach(function (photo, idx) {
      var tile = document.createElement('div');
      tile.className = 'consult-photo';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', 'Увеличить фото — ' + (photo.title || 'работа ' + (idx + 1)));
      tile.innerHTML =
          '<img src="' + photo.src + '" alt="' + (photo.title || DEFAULT_ALT) + '" width="350" height="300" loading="lazy" />'
        + '<div class="consult-photo-overlay">'
        +   '<div class="consult-photo-zoom">'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'
        +       '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>'
        +     '</svg>'
        +   '</div>'
        +   '<div class="consult-photo-caption">'
        +     '<span class="consult-photo-title">' + (photo.title || '') + '</span>'
        +     '<span class="consult-photo-sub">'   + (photo.sub   || '') + '</span>'
        +   '</div>'
        + '</div>';
      tile.addEventListener('click',   function () { openPortfolioModal(idx); });
      tile.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') openPortfolioModal(idx); });
      grid.appendChild(tile);
    });
    var allTile = document.createElement('div');
    allTile.className = 'consult-photo consult-photo-all';
    allTile.setAttribute('role', 'button');
    allTile.setAttribute('tabindex', '0');
    allTile.setAttribute('aria-label', 'Все работы — открыть галерею');
    allTile.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">'
      +   '<path d="M4 8h4V4H4v4zm0 8h4v-4H4v4zm8-8h4V4h-4v4zm0 8h4v-4h-4v4z"/>'
      + '</svg>'
      + '<span>Все работы</span>'
      + (photos.length ? '<div class="consult-photo-count">' + photos.length + ' фото</div>' : '');
    allTile.addEventListener('click',   function () { openPortfolioModal(0); });
    allTile.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') openPortfolioModal(0); });
    grid.appendChild(allTile);
  }
  /* ═══ Предзагрузка соседних фото (без рендера в DOM) ═══ */
  function preloadNeighbors() {
    var total = photos.length;
    if (total < 2) return;
    [current - 1, current + 1].forEach(function (i) {
      var idx = wrap(i, total);
      var im  = new Image();
      im.src  = photos[idx].src;
    });
  }
  /* ═══ Лента миниатюр (только текущий ± THUMB_RANGE, без рендера всего списка) ═══ */
  function renderThumbs() {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';
    var total = photos.length;
    if (total < 2) return;
    var span = Math.min(THUMB_RANGE, Math.floor((total - 1) / 2));
    for (var offset = -span; offset <= span; offset++) {
      (function (offset) {
        var idx   = wrap(current + offset, total);
        var photo = photos[idx];
        var btn   = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'portfolio-modal-thumb' + (idx === current ? ' is-active' : '');
        btn.setAttribute('aria-label', 'Перейти к фото ' + (idx + 1));
        btn.innerHTML = '<img src="' + photo.src + '" alt="' + (photo.title || DEFAULT_ALT) + '" loading="lazy" />';
        btn.addEventListener('click', function () { showPhoto(idx); });
        thumbsEl.appendChild(btn);
      })(offset);
    }
  }
  function showPhoto(idx) {
    current = wrap(idx, photos.length);
    var photo = photos[current];
    stageImg.src = photo.src;
    stageImg.alt = photo.title || DEFAULT_ALT;
    titleEl.textContent   = photo.title || '';
    subEl.textContent     = photo.sub   || '';
    counterEl.textContent = (current + 1) + ' / ' + photos.length;
    prevBtn.style.display = photos.length > 1 ? '' : 'none';
    nextBtn.style.display = photos.length > 1 ? '' : 'none';
    renderThumbs();
    preloadNeighbors();
  }
  function closePortfolioModal() {
    modal.classList.remove('open');
    document.documentElement.classList.remove('scroll-locked');
    if (quickWidget) quickWidget.style.display = '';
  }
  window.openPortfolioModal = function (idx) {
    if (!photos.length) return;
    showPhoto(idx || 0);
    modal.classList.add('open');
    document.documentElement.classList.add('scroll-locked');
    if (quickWidget) quickWidget.style.display = 'none';
    closeBtn.focus();
  };
  closeBtn.addEventListener('click', closePortfolioModal);
  prevBtn.addEventListener('click',  function () { showPhoto(current - 1); });
  nextBtn.addEventListener('click',  function () { showPhoto(current + 1); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closePortfolioModal(); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape')     closePortfolioModal();
    if (e.key === 'ArrowLeft')  showPhoto(current - 1);
    if (e.key === 'ArrowRight') showPhoto(current + 1);
  });
  /* ═══ Свайп на тач-устройствах ═══ */
  var touchX = null;
  modal.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  modal.addEventListener('touchend',   function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { dx < 0 ? showPhoto(current + 1) : showPhoto(current - 1); }
    touchX = null;
  }, { passive: true });
  /* ═══ Колесо мыши / трекпад ═══ */
  var wheelCooldown = false;
  modal.addEventListener('wheel', function (e) {
    if (!modal.classList.contains('open')) return;
    e.preventDefault();
    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 30 && !wheelCooldown) {
      wheelCooldown = true;
      showPhoto(delta > 0 ? current + 1 : current - 1);
      setTimeout(function () { wheelCooldown = false; }, 350);
    }
  }, { passive: false });
  /* ═══ Загрузка данных ═══ */
  fetch(JSON_URL)
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (data) {
      photos = Array.isArray(data) ? data : [];
      renderGrid();
    })
    .catch(function (err) {
      console.warn('Portfolio: не удалось загрузить portfolio.json', err);
      grid.innerHTML = '';
    });
})();
(function () {
  var AVATAR_COLORS = { red: 'red', blue: 'blue', green: 'green', orange: 'orange' };
  /* ═══ Данные ═══ */
  var FALLBACK_REVIEWS = window.AZ_HOME.fallbackReviews;
  var REVIEWS_FALLBACK_CONFIG = window.AZ_HOME.fallbackConfig;
  /* ═══ Состояние стека ═══ */
  var currentIndex       = 0;
  var totalCards         = 0;
  var cardEls            = [];
  var dotEls             = [];
  var lastNavigationTime = 0;
  var navigationCooldown = 400;
  var listenersAdded     = false;
  /* ═══ Вспомогательные функции ═══ */
  function starsSVG(n) {
    var s = '';
    for (var i = 0; i < 5; i++) {
      s += i < n
        ? '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
        : '<svg viewBox="0 0 24 24" style="opacity:.25"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return s;
  }
  function renderMeta(total, avg) {
    var scoreEl = document.getElementById('arScore');
    var starsEl = document.getElementById('arMetaStars');
    var countEl = document.getElementById('arMetaCount');
    if (scoreEl) scoreEl.textContent = avg.toFixed(1);
    if (starsEl) starsEl.innerHTML   = starsSVG(Math.round(avg));
    if (countEl) {
      var m100 = total % 100, m10 = total % 10;
      var word = m100 >= 11 && m100 <= 14 ? 'отзывов' : m10 === 1 ? 'отзыв' : (m10 >= 2 && m10 <= 4) ? 'отзыва' : 'отзывов';
      countEl.textContent = total + ' ' + word;
    }
  }
  /* ═══ Позиционирование карточек ═══ */
  function getCardStyle(index) {
    var total = totalCards;
    var diff  = index - currentIndex;
    if (diff >  total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    if (diff ===  0) return { x:    0, scale: 1,    opacity: 1,   z: 5, ry:   0 };
    if (diff === -1) return { x: -270, scale: 0.85, opacity: 0.6, z: 4, ry:  -8 };
    if (diff === -2) return { x: -450, scale: 0.72, opacity: 0.3, z: 3, ry: -14 };
    if (diff ===  1) return { x:  270, scale: 0.85, opacity: 0.6, z: 4, ry:   8 };
    if (diff ===  2) return { x:  450, scale: 0.72, opacity: 0.3, z: 3, ry:  14 };
    return { x: diff > 0 ? 580 : -580, scale: 0.6, opacity: 0, z: 0, ry: 0 };
  }
  function isVisible(index) {
    var total = totalCards;
    var diff  = index - currentIndex;
    if (diff >  total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return Math.abs(diff) <= 2;
  }
  function render() {
    cardEls.forEach(function (card, index) {
      var visible = isVisible(index);
      card.style.display = visible ? '' : 'none';
      if (!visible) return;
      var s        = getCardStyle(index);
      var isCurrent = index === currentIndex;
      card.classList.toggle('is-current', isCurrent);
      card.style.zIndex    = s.z;
      card.style.transform = 'translateX(' + s.x + 'px) scale(' + s.scale + ') rotateY(' + s.ry + 'deg)';
      card.style.opacity   = s.opacity;
    });
    dotEls.forEach(function (d, i) { d.classList.toggle('active', i === currentIndex); });
    var cEl = document.getElementById('arCounterCurrent');
    if (cEl) cEl.textContent = String(currentIndex + 1).padStart(2, '0');
  }
  function navigate(direction) {
    var now = Date.now();
    if (now - lastNavigationTime < navigationCooldown) return;
    lastNavigationTime = now;
    /* Свернуть раскрытую карточку при смене */
    var prev = cardEls[currentIndex];
    if (prev) {
      prev.classList.remove('is-expanded');
      var pt = prev.querySelector('.ar-text');
      var pb = prev.querySelector('.ar-expand-btn');
      if (pt && !pt.classList.contains('collapsed')) pt.classList.add('collapsed');
      if (pb) pb.textContent = 'Раскрыть';
    }
    if (direction > 0) {
      currentIndex = currentIndex === totalCards - 1 ? 0 : currentIndex + 1;
    } else {
      currentIndex = currentIndex === 0 ? totalCards - 1 : currentIndex - 1;
    }
    render();
  }
  /* ═══ Построение карточек ═══ */
  function renderCards(reviews) {
    var stackEl = document.getElementById('arStack');
    if (!stackEl) return;
    stackEl.innerHTML = '';
    cardEls      = [];
    totalCards   = reviews.length;
    currentIndex = 0;
    var totEl = document.getElementById('arCounterTotal');
    if (totEl) totEl.textContent = String(reviews.length).padStart(2, '0');
    reviews.forEach(function (r) {
      var colorClass = 'ar-avatar--' + (AVATAR_COLORS[r.color] || 'red');
      var card = document.createElement('div');
      card.className = 'ar-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML =
          '<div class="ar-card-inner">'
        +   '<div class="ar-card-header">'
        +     '<div class="ar-avatar ' + colorClass + '">' + r.initials + '</div>'
        +     '<div class="ar-card-info">'
        +       '<div class="ar-author">' + r.author + '</div>'
        +       '<div class="ar-date">'   + r.date   + '</div>'
        +     '</div>'
        +     '<div class="ar-stars">' + starsSVG(r.rating) + '</div>'
        +   '</div>'
        +   '<p class="ar-text collapsed">' + r.text + '</p>'
        +   '<button class="ar-expand-btn">Раскрыть</button>'
        + '</div>';
      stackEl.appendChild(card);
      cardEls.push(card);
    });
    requestAnimationFrame(function () {
      cardEls.forEach(function (card) {
        var text = card.querySelector('.ar-text');
        var btn  = card.querySelector('.ar-expand-btn');
        if (text && btn && text.scrollHeight <= text.clientHeight + 2) {
          btn.style.display = 'none';
        }
      });
      render();
    });
  }
  /* ═══ Точки-индикаторы ═══ */
  function buildDots(count) {
    var dotsEl = document.getElementById('arDots');
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    dotEls = [];
    for (var i = 0; i < count; i++) {
      (function (idx) {
        var d = document.createElement('button');
        d.className = 'ar-dot' + (idx === 0 ? ' active' : '');
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', 'Отзыв ' + (idx + 1));
        d.addEventListener('click', function () {
          if (idx !== currentIndex) { currentIndex = idx; render(); }
        });
        dotsEl.appendChild(d);
        dotEls.push(d);
      })(i);
    }
  }
  /* ═══ Обработчики событий ═══ */
  function initListeners() {
    if (listenersAdded) return;
    listenersAdded = true;
    var wrapEl  = document.getElementById('arStackWrap');
    var stackEl = document.getElementById('arStack');
    var prevBtn = document.getElementById('arPrev');
    var nextBtn = document.getElementById('arNext');
    /* Колесо мыши / трекпад — только над блоком */
    if (wrapEl) {
      wrapEl.addEventListener('wheel', function (e) {
        var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(delta) > 30) {
          e.preventDefault();
          navigate(delta > 0 ? 1 : -1);
        }
      }, { passive: false });
    }
    /* Prev / Next кнопки в футере */
    if (prevBtn) prevBtn.addEventListener('click', function () { navigate(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { navigate(1); });
    /* Drag / Touch (делегируем на контейнер стека) */
    var isDragging  = false;
    var dragStartX  = 0;
    var activeCard  = null;
    function onDragStart(e, card) {
      if (!card || !card.classList.contains('is-current')) return;
      isDragging = true;
      activeCard = card;
      card.classList.add('dragging');
      dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
    }
    function onDragMove(e) {
      if (!isDragging || !activeCard) return;
      var cx     = e.touches ? e.touches[0].clientX : e.clientX;
      var offset = (cx - dragStartX) * 0.5;
      activeCard.style.transform = 'translateX(' + offset + 'px) scale(1) rotateY(0deg)';
    }
    function onDragEnd(e) {
      if (!isDragging || !activeCard) return;
      var endX   = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      var offset = endX - dragStartX;
      activeCard.classList.remove('dragging');
      isDragging = false;
      if      (offset < -50) navigate(1);
      else if (offset >  50) navigate(-1);
      else                   render();
      activeCard = null;
    }
    if (stackEl) {
      stackEl.addEventListener('mousedown', function (e) {
        onDragStart(e, e.target.closest('.ar-card'));
      });
      stackEl.addEventListener('touchstart', function (e) {
        onDragStart(e, e.target.closest('.ar-card'));
      }, { passive: true });
    }
    document.addEventListener('mousemove',  onDragMove);
    document.addEventListener('touchmove',  onDragMove, { passive: true });
    document.addEventListener('mouseup',    onDragEnd);
    document.addEventListener('touchend',   onDragEnd);
    /* Клавиатура */
    if (wrapEl) {
      wrapEl.setAttribute('tabindex', '0');
      wrapEl.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft')  { navigate(-1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { navigate(1);  e.preventDefault(); }
      });
    }
    /* Раскрыть / Свернуть текст (только для текущей карточки) */
    if (stackEl) {
      stackEl.addEventListener('click', function (e) {
        if (!e.target.classList.contains('ar-expand-btn')) return;
        var card = e.target.closest('.ar-card');
        if (!card || !card.classList.contains('is-current')) return;
        var btn         = e.target;
        var text        = btn.previousElementSibling;
        var isCollapsed = text.classList.toggle('collapsed');
        card.classList.toggle('is-expanded', !isCollapsed);
        btn.textContent = isCollapsed ? 'Раскрыть' : 'Свернуть';
      });
    }
  }
  /* ═══ Загрузка отзывов ═══ */
  function loadReviews(cityConfig) {
    var file  = cityConfig.reviewsFile  || 'reviews.json';
    var total = cityConfig.reviewsTotal;
    var avg   = cityConfig.reviewsAvg   || 4.9;
    var url   = cityConfig.reviewsUrl   || '';
    renderMeta(total, avg);
    var linkEl = document.querySelector('.ar-2gis-link');
    if (linkEl && url) linkEl.href = url;
    initListeners();
    function afterLoad(reviews) {
      renderCards(reviews);
      buildDots(reviews.length);
    }
    fetch(file)
      .then(function (r) { return r.json(); })
      .then(afterLoad)
      .catch(function () {
        renderMeta(REVIEWS_FALLBACK_CONFIG.total, REVIEWS_FALLBACK_CONFIG.avg);
        if (linkEl) linkEl.href = REVIEWS_FALLBACK_CONFIG.url;
        afterLoad(FALLBACK_REVIEWS);
      });
  }
  /* Настройки отзывов своего города (файл, число, рейтинг, ссылка на 2ГИС) — из данных города */
  loadReviews(window.AZ_HOME.reviews);
})();

/* ═══ «Чем занимаемся»: шторка карточек на тач-экране (12.11.2026) ═══
   С наведением шторку ведёт CSS (hover и фокус). На тач-экране карточка раскрывается один раз, когда доезжает до середины экрана,
   обратно не играет. Под prefers-reduced-motion шторки нет: остаётся верхнее фото. */
(function () {
  var cards = document.querySelectorAll('.nvx-c');
  if (!cards.length || matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-revealed'); io.unobserve(en.target); } });
  }, { rootMargin: '-45% 0px -45% 0px' });
  [].forEach.call(cards, function (c) { io.observe(c); });
})();
