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
    c.querySelectorAll('.pp, .volver').forEach(x => x.remove());
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

  // ---- navegación por pasos (sólo en páginas con body.pasos) ----
  // mapa de secciones al inicio, «siguiente» al final de cada sección,
  // paginador fijo y flechas del teclado para pasar de una sección a otra
  if (!document.body.classList.contains('pasos')) return;
  const secs = Array.from(doc.querySelectorAll('h2')).map(h => {
    const sec = h.closest('section');
    const id = h.id || (sec && sec.id) || idPara(h);
    const t = texto(h), m = t.match(/^(\d+)\.\s*(.*)$/);
    return { h, cont: sec || h, id, num: m ? m[1] : '', tit: m ? m[2] : t };
  });
  const n = secs.length;
  if (n < 2) return;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const titHtml = s => esc(s.tit);

  // mapa (las notas para el orador, si las hay, van aparte al pie del mapa)
  const portada = doc.querySelector(':scope > header');
  const enTexto = secs.filter(s => !s.cont.classList.contains('notas'));
  const notas = secs.find(s => s.cont.classList.contains('notas'));
  const mapa = document.createElement('nav');
  mapa.className = 'mapa'; mapa.id = 'mapa'; mapa.setAttribute('aria-label', 'Mapa del texto');
  mapa.innerHTML = '<div class="mapa-tit">En este texto · ' + enTexto.length + ' partes</div><ol>' +
    enTexto.map((s, i) => '<li><a href="#' + s.id + '"><span class="n">' + (s.num || i + 1) + '</span><span>' + titHtml(s) + '</span></a></li>').join('') + '</ol>' +
    (notas ? '<a class="mapa-notas" href="#' + notas.id + '">' + titHtml(notas) + ' ↓<small>los mismos datos, en apuntes</small></a>' : '');
  if (portada) portada.after(mapa); else doc.prepend(mapa);

  // imprimir sólo las notas
  const bImp = document.getElementById('imprimirNotas');
  if (bImp){
    bImp.addEventListener('click', () => { document.body.classList.add('solo-notas'); window.print(); });
    window.addEventListener('afterprint', () => document.body.classList.remove('solo-notas'));
  }

  // «siguiente» al final de cada sección
  secs.forEach((s, i) => {
    const a = document.createElement('a');
    a.className = 'sigue';
    if (i < n - 1){
      const sig = secs[i + 1];
      a.href = '#' + sig.id;
      a.innerHTML = '<small>siguiente · ' + (i + 2) + ' / ' + n + '</small>' + titHtml(sig) + ' →';
    } else {
      a.href = '#mapa';
      a.innerHTML = '<small>fin · ' + n + ' / ' + n + '</small>Volver al mapa del texto ↑';
    }
    if (s.cont !== s.h) s.cont.appendChild(a);
    else {
      const sig = secs[i + 1];
      if (sig) sig.h.before(a); else { const pie = doc.querySelector(':scope > footer'); pie ? pie.before(a) : doc.appendChild(a); }
    }
  });

  // paginador
  const pag = document.createElement('div');
  pag.id = 'paginador';
  pag.title = 'Flechas ← → del teclado: sección anterior / siguiente';
  pag.innerHTML = '<button type="button" aria-label="Sección anterior">‹</button><span class="cuenta"></span><button type="button" aria-label="Sección siguiente">›</button>';
  document.body.appendChild(pag);
  const [bAnt, bSig] = pag.querySelectorAll('button'), cuenta = pag.querySelector('.cuenta');
  function actual(){
    const hdr = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 49;
    let k = -1;
    secs.forEach((s, i) => { if (s.cont.getBoundingClientRect().top <= hdr + 40) k = i; });
    return k;                                   // -1: todavía en la portada o el mapa
  }
  function ir(i){
    i = Math.max(0, Math.min(n - 1, i));
    const destino = document.getElementById(secs[i].id) || secs[i].h;
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#' + secs[i].id); } catch(e){}
  }
  function pintar(){
    const k = actual();
    cuenta.textContent = (k < 0 ? '–' : (k + 1)) + ' / ' + n;
    bAnt.disabled = k <= 0;
    bSig.disabled = k >= n - 1;
  }
  bAnt.addEventListener('click', () => ir(actual() - 1));
  bSig.addEventListener('click', () => ir(actual() + 1));
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight'){ e.preventDefault(); ir(actual() + 1); }
    else if (e.key === 'ArrowLeft'){ e.preventDefault(); if (actual() > 0) ir(actual() - 1); }
  });
  let pend = false;
  window.addEventListener('scroll', () => { if (!pend){ pend = true; requestAnimationFrame(() => { pend = false; pintar(); }); } }, { passive: true });
  pintar();
})();
