/* legal.js: оглавление юридических страниц. Собирается из h2 документа, только от 1280 px (в CSS ниже оно скрыто), без оглавления страница работает как обычный текст.
   Номер раздела берётся из .num; id = razdel-N. Подсвечивается раздел, который сейчас у верхнего края окна. */
(function () {
  var doc = document.getElementById('lgDoc'), toc = document.getElementById('lgToc');
  if (!doc || !toc) return;
  var heads = [].slice.call(doc.querySelectorAll('h2'));
  if (heads.length < 3) return;
  var list = document.createElement('ol'), links = [];
  heads.forEach(function (h, i) {
    var num = h.querySelector('.num'), n = num ? num.textContent.trim() : String(i + 1);
    var text = h.textContent.replace(num ? num.textContent : '', '').trim();
    h.id = h.id || 'razdel-' + n;
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = '#' + h.id;
    var b = document.createElement('b'); b.textContent = n;
    a.appendChild(b); a.appendChild(document.createTextNode(text));
    li.appendChild(a); list.appendChild(li); links.push(a);
  });
  var cap = document.createElement('p'); cap.textContent = 'Разделы';
  toc.appendChild(cap); toc.appendChild(list); toc.hidden = false;
  function spy() {
    var cur = 0, edge = window.innerHeight * 0.3;
    heads.forEach(function (h, i) { if (h.getBoundingClientRect().top <= edge) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  spy();
})();
