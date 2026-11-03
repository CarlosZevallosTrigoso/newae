/* Índice lateral de las guías: se construye a partir de los h2/h3 de #doc,
   marca la sección visible y se pliega en pantallas angostas. */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const doc = $('doc'), toc = $('toc'), lista = $('tocLista');
  if (!doc || !toc || !lista) return;

  // altura real de la cabecera → scroll-padding y posición del índice
  const barra = document.querySelector('header.barra');
  function medirBarra(){
    if (barra) document.documentElement.style.setProperty('--hdr', barra.offsetHeight + 'px');
  }
  medirBarra();
  window.addEventListener('resize', medirBarra);

  function slug(s){
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }
  const usados = new Set(Array.from(document.querySelectorAll('[id]')).map(e => e.id));
  function idPara(el){
    if (el.id) return el.id;
    // un h2 hereda el id de su <section>, si la tiene
    if (el.tagName === 'H2'){
      const sec = el.closest('section[id]');
      if (sec && !sec.dataset.idUsado){ sec.dataset.idUsado = '1'; return sec.id; }
    }
    let base = slug(el.textContent) || 'seccion', id = base, n = 2;
    while (usados.has(id)) id = base + '-' + (n++);
    usados.add(id); el.id = id; return id;
  }
  function texto(el){
    const c = el.cloneNode(true);
    c.querySelectorAll('.pp').forEach(x => x.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  // construcción
  const cabeceras = Array.from(doc.querySelectorAll('h2, h3'));
  const entradas = [];           // {id, el, enlace}
  let ol2 = null, liActual = null;
  cabeceras.forEach(h => {
    // la etiqueta de parte (.parte) que precede al h2 se vuelve rótulo del índice
    if (h.tagName === 'H2'){
      const prev = h.previousElementSibling;
      if (prev && prev.classList.contains('parte')){
        const rot = document.createElement('li');
        rot.className = 'toc-parte'; rot.textContent = texto(prev);
        lista.appendChild(rot);
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      const id = idPara(h);
      a.href = '#' + id; a.textContent = texto(h);
      li.appendChild(a); lista.appendChild(li);
      liActual = li; ol2 = null;
      entradas.push({ id, el: h.closest('section[id]') && h.closest('section[id]').id === id ? h.closest('section') : h, enlace: a });
    } else {
      if (!liActual) return;
      if (!ol2){ ol2 = document.createElement('ol'); liActual.appendChild(ol2); }
      const li = document.createElement('li');
      const a = document.createElement('a');
      const id = idPara(h);
      a.href = '#' + id; a.textContent = texto(h);
      li.appendChild(a); ol2.appendChild(li);
      entradas.push({ id, el: h, enlace: a });
    }
  });

  // sección activa
  let activa = null;
  function marcar(){
    const hdr = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 49;
    const y = window.scrollY + hdr + 24;
    let cand = entradas[0];
    for (const e of entradas){
      const top = e.el.getBoundingClientRect().top + window.scrollY;
      if (top <= y) cand = e; else break;
    }
    if (cand === activa) return;
    if (activa) activa.enlace.classList.remove('activa');
    activa = cand;
    if (activa){
      activa.enlace.classList.add('activa');
      // mantener visible en el índice
      const r = activa.enlace.getBoundingClientRect(), t = toc.getBoundingClientRect();
      if (r.top < t.top || r.bottom > t.bottom) activa.enlace.scrollIntoView({ block: 'nearest' });
    }
  }
  let pedido = false;
  window.addEventListener('scroll', () => { if (!pedido){ pedido = true; requestAnimationFrame(() => { pedido = false; marcar(); }); } }, { passive: true });
  window.addEventListener('load', marcar);
  marcar();

  // índice plegable (móvil)
  const btn = $('toggleToc');
  if (btn){
    btn.addEventListener('click', () => document.body.classList.toggle('toc-abierto'));
    lista.addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('toc-abierto'); });
    document.addEventListener('click', e => {
      if (document.body.classList.contains('toc-abierto') && !toc.contains(e.target) && e.target !== btn)
        document.body.classList.remove('toc-abierto');
    });
  }
})();
