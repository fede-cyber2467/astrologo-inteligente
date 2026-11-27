/* Interfaz: perfiles, pestañas y render de cada pantalla. */
(function () {
  'use strict';
  var M = Motor, R = Reglas, T = Textos, P = M.P, S = M.SIGNOS, DIA = 86400000, VS = '︎';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

  /* Enlace de invitación: trae las claves en el fragmento de la dirección (no viaja al servidor), se guardan y se borra de la barra */
  var SITIO = 'https://fede-cyber2467.github.io/astrologo-inteligente/';
  /** Busca un código de invitación dentro de un texto (el mensaje completo sirve) y guarda lo que trae. */
  function aplicarInvitacion(texto) {
    var m = /7b22[0-9a-f]{30,}/i.exec(String(texto || '').replace(/\s+/g, ''));
    if (!m) return false;
    try {
      var d = JSON.parse(decodeURIComponent(m[0].replace(/(..)/g, '%$1')));
      if (!d.a && !d.g) return false;
      if (d.a) { guardar('astro.clave', d.a); guardar('astro.ia', true); }
      if (d.g) guardar('astro.gclave', d.g);
      if (d.v) guardar('astro.voces', d.v);
      return true;
    } catch (e) { return false; }
  }
  if (/^#i[0-9a-f]{20,}$/.test(location.hash)) { aplicarInvitacion(location.hash); history.replaceState(null, '', location.pathname + location.search); }
  /** Mensaje listo para enviar: enlace normal + código (los mensajeros cortan los enlaces largos). */
  function enlaceInvitacion() {
    var d = { a: leer('astro.clave', ''), g: leer('astro.gclave', ''), v: leer('astro.voces', null) };
    var hex = unescape(encodeURIComponent(JSON.stringify(d))).split('').map(function (c) { return ('0' + c.charCodeAt(0).toString(16)).slice(-2); }).join('');
    return 'Te invito a probar Urania.\n\n1) Abre: ' + SITIO + '\n2) Copia este mensaje completo y pégalo donde dice "¿Te pasaron una invitación?".\n\nCódigo: ' + hex;
  }

  var perfiles = leer('astro.perfiles', []);
  var est = { perfil: null, natal: null, nac: null, tab: 'inicio', hecho: {} };

  function activar(id) {
    est.perfil = perfiles.filter(function (p) { return p.id === id; })[0] || perfiles[0] || null;
    est.hecho = {};
    if (!est.perfil) { est.natal = null; return; }
    guardar('astro.activo', est.perfil.id);
    var p = est.perfil, f = p.fecha.split('-'), ho = p.hora.split(':');
    est.nac = M.localAUTC(+f[0], +f[1], +f[2], +ho[0], +ho[1], p.nac.zona);
    est.natal = M.carta(est.nac, p.nac.lat, p.nac.lon);
  }
  function lugar() { return est.perfil.act; }

  /* ---------- fechas en la zona donde vive la persona ---------- */
  function fF(d, o) { return new Intl.DateTimeFormat('es-AR', Object.assign({ timeZone: lugar().zona }, o)).format(d); }
  function fDia(d) { return fF(d, { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''); }
  function fDiaCorto(d) { return fF(d, { weekday: 'long', day: 'numeric' }).replace(',', ''); }
  function fCorta(d) { return fF(d, { day: 'numeric', month: 'short' }); }
  function fConAnio(d) { return fF(d, { day: 'numeric', month: 'long', year: 'numeric' }); }
  function fHora(d) { return fF(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
  function fDiaHora(d) { return fDia(d) + ' ' + fHora(d); }
  function ymd(d) {
    var o = {}; new Intl.DateTimeFormat('en-CA', { timeZone: lugar().zona, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }
  function deYmd(s, hh, mm) { var a = s.split('-'); return M.localAUTC(+a[0], +a[1], +a[2], hh || 0, mm || 0, lugar().zona); }
  function inicioDia(d) { return deYmd(ymd(d)); }

  function clsP(p) { return p >= 62 ? 'p-alto' : p >= 45 ? 'p-medio' : 'p-bajo'; }
  function color(p) { var x = Math.max(0, Math.min(1, (p - 20) / 60)); return 'hsl(' + Math.round(x * 140) + ',62%,' + (58 + x * 6) + '%)'; }
  function htmlFactores(F, n) {
    return '<ul class="factores">' + F.slice(0, n || 99).map(function (f) {
      return '<li><span class="' + (f.pts > 0 ? 'pos' : 'neg') + '">' + (f.pts > 0 ? '+' : '−') + Math.abs(f.pts) + '</span><span>' + h(f.txt) + '</span></li>';
    }).join('') + '</ul>';
  }
  function htmlPuntaje(p) { return '<span class="puntaje ' + clsP(p) + '"><b>' + p + '</b> ' + R.etiqueta(p) + '</span>'; }

  /* ---------- rueda ---------- */
  function rueda(c) {
    var cx = 230, cy = 230, o = ['<svg class="rueda" viewBox="0 0 460 460" role="img" aria-label="Rueda de la carta natal">'];
    function pt(lon, r) { var a = (180 + (lon - c.asc)) * Math.PI / 180; return [(cx + r * Math.cos(a)).toFixed(1), (cy - r * Math.sin(a)).toFixed(1)]; }
    function linea(l, r1, r2, col, w) { var a = pt(l, r1), b = pt(l, r2); o.push('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" style="stroke:' + col + '" stroke-width="' + (w || 1) + '"/>'); }
    function texto(l, r, t, tam, col) { var a = pt(l, r); o.push('<text x="' + a[0] + '" y="' + a[1] + '" font-size="' + tam + '" style="fill:' + col + '" text-anchor="middle" dominant-baseline="central">' + t + '</text>'); }
    [210, 180, 112].forEach(function (r) { o.push('<circle cx="230" cy="230" r="' + r + '" fill="none" style="stroke:var(--borde-fuerte)"/>'); });
    for (var s = 0; s < 12; s++) {
      linea(s * 30, 180, 210, 'var(--borde-fuerte)'); linea(s * 30, 112, 180, 'var(--borde)');
      texto(s * 30 + 15, 195, S[s].g + VS, 19, 'var(--oro)');
      texto(s * 30 + 15, 123, ((s - c.signoAsc + 12) % 12) + 1, 10, 'var(--suave)');
    }
    var colA = { armonico: 'var(--bien)', tenso: 'var(--mal)', union: 'var(--oro)' };
    M.aspectosNatales(c).forEach(function (a) {
      if (a.a === 'asc' || a.a === 'mc' || a.b === 'asc' || a.b === 'mc' || a.orbe > 5 || a.asp.id === 'conj') return;
      var p1 = pt(c.pos[a.a].lon, 112), p2 = pt(c.pos[a.b].lon, 112);
      o.push('<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" style="stroke:' + colA[a.asp.tipo] + '" stroke-opacity=".55"/>');
    });
    linea(c.asc, 112, 218, 'var(--oro)', 2); texto(c.asc, 226, 'AC', 10, 'var(--oro)');
    linea(c.mc, 180, 218, 'var(--oro)', 2); texto(c.mc, 226, 'MC', 10, 'var(--oro)');
    var lista = M.PLANETAS.map(function (p) { return { g: p.g, lon: c.pos[p.id].lon, retro: c.pos[p.id].retro }; });
    lista.push({ g: '☊', lon: c.pos.nodo.lon });
    lista.sort(function (a, b) { return a.lon - b.lon; });
    var nivel = 0, ant = -99;
    lista.forEach(function (p) {
      nivel = p.lon - ant < 8 ? (nivel + 1) % 3 : 0; ant = p.lon;
      linea(p.lon, 180, 174, 'var(--texto)');
      texto(p.lon, 163 - nivel * 17, p.g + VS, 19, p.retro && p.g !== '☊' ? 'var(--exig)' : 'var(--texto)');
    });
    o.push('</svg>');
    return o.join('');
  }
  function tablaPos(c, conCasa) {
    var filas = M.PLANETAS.map(function (p) {
      var x = c.pos[p.id], d = x.dignidad;
      return '<tr><td class="g">' + p.g + VS + '</td><td>' + p.n + '</td><td>' + M.fmtLon(x.lon) + (x.retro ? ' <span class="chip">R</span>' : '') +
        (d ? '<span class="chip ' + (d === 'domicilio' || d === 'exaltacion' ? 'bien' : 'mal') + '">' + { domicilio: 'domicilio', exaltacion: 'exaltación', exilio: 'exilio', caida: 'caída' }[d] + '</span>' : '') +
        '</td>' + (conCasa ? '<td>' + x.casa + '</td>' : '') + '</tr>';
    });
    filas.push('<tr><td class="g">☊' + VS + '</td><td>Nodo Norte</td><td>' + M.fmtLon(c.pos.nodo.lon) + '</td>' + (conCasa ? '<td>' + c.pos.nodo.casa + '</td>' : '') + '</tr>');
    if (conCasa) filas.push('<tr><td class="g">AC</td><td>Ascendente</td><td>' + M.fmtLon(c.asc) + '</td><td>1</td></tr>', '<tr><td class="g">MC</td><td>Medio Cielo</td><td>' + M.fmtLon(c.mc) + '</td><td>' + c.casaDe(c.mc) + '</td></tr>');
    return '<div class="tabla-scroll"><table><tr><th></th><th>Punto</th><th>Posición</th>' + (conCasa ? '<th>Casa</th>' : '') + '</tr>' + filas.join('') + '</table></div>';
  }

  /* ---------- listas de eventos ---------- */
  function rangoTransito(t, f) {
    f = f || fCorta;
    var r = (t.abiertoIni ? 'ya activo' : f(t.desde)) + ' → ' + (t.abiertoFin ? 'sigue' : f(t.hasta));
    if (t.exactos.length) r += ' · exacto ' + t.exactos.map(f).join(', ');
    return r;
  }
  function liTransito(t, f) {
    var cls = t.asp.tipo === 'armonico' ? 'bien' : t.asp.tipo === 'tenso' ? 'mal' : '';
    return '<li><div class="fecha">' + rangoTransito(t, f) + '<span class="chip ' + cls + '">' + t.asp.n + '</span></div>' + h(T.fraseTransito(t)) + '</li>';
  }
  function liLunacion(e, f) {
    return '<li><div class="fecha">' + (f || fDiaHora)(e.fecha) + '</div><b>' + e.tipo + ' en ' + M.fmtLon(e.lon) + '.</b> ' + h(T.fraseLunacion(e)) + '</li>';
  }
  function liEstacion(e, f) { return '<li><div class="fecha">' + (f || fDia)(e.fecha) + '</div>' + h(T.fraseEstacion(e)) + '</li>'; }
  function lista(items, vacio) { return items.length ? '<ul class="lista">' + items.join('') + '</ul>' : '<p class="suave">' + vacio + '</p>'; }

  /* ---------- INICIO ---------- */
  function htmlSemana(sem) {
    return '<div class="semana">' + sem.dias.map(function (d) {
      var p = Math.max(5, Math.min(95, 50 + d.tono * 7));
      return '<div class="dia"><b>' + fDiaCorto(d.fecha) + '</b><div class="tono" style="background:' + color(p) + '"></div>' + T.fraseTono(d.tono) +
        '<div class="suave">' + T.AREA[d.lunaCasa].corto + '</div></div>';
    }).join('') + '</div>';
  }
  function persona() { return Personas.POR_ID[leer('astro.persona', '')] || null; }
  function detalleClima(cl) {
    var max = cl.areas[0].foco || 1;
    return cl.areas.filter(function (a) { return a.foco > 0; }).slice(0, 5).map(function (a) {
      var p = Math.max(8, Math.min(92, 50 + a.tono * 9));
      return '<div class="area"><div class="area-n"><b>' + T.AREA[a.casa].corto + '</b><span class="area-b"><i style="width:' + Math.round(a.foco / max * 100) + '%;background:' + color(p) + '"></i></span></div>' +
        '<ul>' + a.motivos.map(function (m) { return '<li>' + h(m.txt) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  function renderElegirAstrologo() {
    $('#tab-inicio').innerHTML = '<div class="hero-centro"><h1>Elige qué astrólogo te acompaña</h1><p class="suave">Los cinco leen el mismo cielo con el mismo rigor. Cambia la forma de contártelo. Puedes cambiar cuando quieras.</p></div>' +
      '<div class="astros">' + Personas.LISTA.map(function (p) {
        return '<button class="astro" data-per="' + p.id + '">' + Personas.retrato(p, 104) + '<b>' + p.n + '</b><span class="rol">' + p.rol + '</span><span class="desc">' + p.desc + '</span><i>' + p.muestra + '</i></button>';
      }).join('') + '</div>';
    $('#tab-inicio').querySelectorAll('[data-per]').forEach(function (b) { b.onclick = function () { guardar('astro.persona', b.dataset.per); renderInicio(); window.scrollTo(0, 0); }; });
  }
  function renderInicio() {
    var per = persona();
    if (!per) return renderElegirAstrologo();
    var ahora = new Date(), l = lugar(), hoy = inicioDia(ahora);
    var y = +ymd(hoy).slice(0, 4), mth = +ymd(hoy).slice(5, 7);
    var m0 = M.localAUTC(y, mth, 1, 0, 0, l.zona), m1 = M.localAUTC(mth === 12 ? y + 1 : y, mth === 12 ? 1 : mth + 1, 1, 0, 0, l.zona);
    var r = R.puntuar(ahora, l.lat, l.lon, R.ACC.general, est.natal, {}), el = r.luna, c = r.carta, sem = R.semanal(est.natal, hoy);
    var prox = el.proximo ? 'Su próximo aspecto es ' + el.proximo.asp.n + ' a ' + P[el.proximo.planeta].n + ' (en ' + Math.round(el.proximo.dias * 24) + ' h).' : 'No cierra aspectos en las próximas horas.';
    var rl = T.resumenLlano(r.factores), doy = Math.floor(+hoy / DIA);
    var vistas = [
      { etq: 'Hoy', que: 'Día', pens: 'Para pensar hoy', cl: R.clima(est.natal, hoy, new Date(+hoy + DIA), true) },
      { etq: 'Semana', que: 'Semana', pens: 'Para pensar esta semana', cl: R.clima(est.natal, hoy, new Date(+hoy + 7 * DIA)) },
      { etq: fF(ahora, { month: 'long' }).replace(/^./, function (x) { return x.toUpperCase(); }), que: 'Mes', pens: 'Para pensar este mes', cl: R.clima(est.natal, m0, m1) }];
    // Tono general: el del día de hoy, y el promedio de los días de la semana y del mes
    function media(d) { var s = 0; d.forEach(function (x) { s += x.tono; }); return d.length ? s / d.length : 0; }
    var diasMes = []; for (var d0 = m0; d0 < m1; d0 = new Date(+d0 + 7 * DIA)) R.semanal(est.natal, d0).dias.forEach(function (x) { if (x.fecha < m1) diasMes.push(x); });
    vistas[0].tn = T.tono(sem.dias[0].tono, 'Día'); vistas[1].tn = T.tono(media(sem.dias), 'Semana'); vistas[2].tn = T.tono(media(diasMes), 'Mes');
    vistas[1].extra = '<h3>Día por día</h3>' + htmlSemana(sem);
    // Cuando el tono general y el del tema principal no coinciden, una frase los une para que no se contradigan
    function puente(v) {
      var fem = v.que === 'Semana', top = v.cl.areas.filter(function (x) { return x.casa === v.tx.casa; })[0];
      if (v.tn.cls === 'bien' && !v.tx.bueno) return 'En general ' + (fem ? 'la' : 'el') + ' ' + v.que.toLowerCase() + ' acompaña, pero este tema te pide más. ';
      if (v.tn.cls === 'mal' && top && top.tono > 1.5) return 'En general ' + (fem ? 'la' : 'el') + ' ' + v.que.toLowerCase() + ' pide cuidado, pero este tema viene a favor. ';
      return '';
    }
    vistas.forEach(function (v) { v.tx = T.textoClima(v.cl, v.que, per); v.frase = Personas.frase(v.tx.casa, v.tx.bueno, doy); });
    $('#tab-inicio').innerHTML =
      '<div class="hero"><div class="quien"><div class="foto">' + Personas.retrato(per, 136) + '<button type="button" id="cambiarAstro" class="cambiar" title="Cambiar de astrólogo" aria-label="Cambiar de astrólogo"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg></button></div><b>' + per.n + '</b><span>' + per.rol + '</span></div>' +
      '<div class="consulta"><p class="saludo">Hola, ' + h(est.perfil.nombre) + '</p><h1>¿Quieres consultarme algo?</h1><div id="cZona"></div></div></div>' +
      '<blockquote class="pensar"><span id="pensarEtq"></span><p id="pensarTxt"></p></blockquote>' +
      '<div class="tarjeta clima"><div class="seg" id="seg">' + vistas.map(function (v, i) { return '<button data-i="' + i + '">' + v.etq + '</button>'; }).join('') + '</div>' +
      '<div class="carrusel" id="carrusel">' + vistas.map(function (v) {
        return '<div class="panel"><div class="tono-gral ' + v.tn.cls + '"><i></i>' + v.tn.txt + '</div><h2 class="bueno">' + h(v.que + ' ' + T.AREA[v.tx.casa].de) + '</h2><p>' + h(puente(v) + v.tx.texto) + '</p>' +
          '<details><summary>¿Por qué?</summary><p class="suave">Áreas de tu vida más activadas (barra más larga, más movimiento; verde fluye, rojo exige) y qué las mueve en tu carta:</p>' + detalleClima(v.cl) + (v.extra || '') + '</details></div>';
      }).join('') + '</div></div>' +
      '<details class="tarjeta plegable"><summary>Para profundizar: el cielo de este momento</summary>' +
      '<p style="margin-top:16px">' + htmlPuntaje(r.puntaje) + ' <span class="suave">para iniciar algo ahora mismo (' + fHora(ahora) + ', ' + h(l.nombre) + ')</span></p>' +
      (rl.favor.length ? '<p><b>A favor:</b> ' + h(rl.favor.join('. ')) + '.</p>' : '') + (rl.contra.length ? '<p><b>A tener en cuenta:</b> ' + h(rl.contra.join('. ')) + '.</p>' : '') +
      '<h3>Factores</h3>' + htmlFactores(r.factores) +
      '<h3 style="margin-top:14px">Luna y hora</h3><p><b>' + el.fase + '</b> en ' + M.fmtLon(c.pos.luna.lon) + ', ' + Math.round(el.iluminacion * 100) + '% iluminada. ' + prox + ' ' +
      (el.vacia ? 'Está vacía de curso hasta cambiar de signo, en ' + Math.round(el.horasACambioSigno) + ' h.' : 'No está vacía de curso; cambia de signo en ' + Math.round(el.horasACambioSigno) + ' h.') + '</p>' +
      (r.hora ? '<p>Hora planetaria de <b>' + P[r.hora.regente].n + '</b> hasta las ' + fHora(r.hora.fin) + ' (día de ' + P[r.hora.regenteDia].n + '). Ascendente del momento: ' + M.fmtLon(c.asc) + '. Carta ' + (c.diurna ? 'diurna' : 'nocturna') + '.</p>' : '') +
      '<h3>Procesos de fondo</h3>' + lista(sem.lentos.map(function (t) { return liTransito(t); }), 'Esta semana no hay tránsitos lentos exactos sobre tu carta.') +
      '<h3 style="margin-top:14px">Posiciones</h3>' + tablaPos(c, false) + '</details>';
    var car = $('#carrusel'), segs = $('#seg').querySelectorAll('button'), actual = -1;
    function activar(i) {
      if (i === actual || !vistas[i]) return; actual = i;
      segs.forEach(function (b, k) { b.classList.toggle('on', k === i); });
      $('#pensarEtq').textContent = vistas[i].pens; $('#pensarTxt').textContent = vistas[i].frase;
    }
    segs.forEach(function (b) { b.onclick = function () { activar(+b.dataset.i); car.scrollTo({ left: +b.dataset.i * car.clientWidth, behavior: 'smooth' }); }; });
    var espera; car.onscroll = function () { clearTimeout(espera); espera = setTimeout(function () { activar(Math.round(car.scrollLeft / car.clientWidth)); }, 90); };
    activar(0);
    $('#cambiarAstro').onclick = function (ev) { ev.preventDefault(); renderElegirAstrologo(); window.scrollTo(0, 0); };
    if (window.ConfidenteUI) window.ConfidenteUI.montar($('#cZona'));
  }

  /* ---------- CARTA ---------- */
  function renderCarta() {
    var c = est.natal, p = est.perfil;
    $('#tab-carta').innerHTML =
      '<div class="tarjeta"><h2>La carta de ' + h(p.nombre) + ', en palabras</h2><p class="suave">' + h(p.fecha.split('-').reverse().join('/')) + ' ' + h(p.hora) + ' · ' + h(p.nac.nombre) + '</p></div>' +
      T.lecturaNatal(c).map(function (s) { return '<div class="tarjeta"><h3>' + s.t + '</h3>' + s.p.map(function (x) { return '<p>' + h(x) + '</p>'; }).join('') + '</div>'; }).join('') +
      '<details class="tarjeta plegable"><summary>Ver la rueda y las posiciones exactas</summary><div class="grilla" style="margin-top:12px"><div>' + rueda(c) + '<p class="suave" style="text-align:center">Casas de signo entero</p></div><div>' + tablaPos(c, true) + '</div></div></details>';
  }

  /* ---------- PRONÓSTICO ---------- */
  var pron = { sub: 'anio', mes: 0 };
  function renderPronostico() {
    var el = $('#tab-pronostico'), hoy = inicioDia(new Date()), cuerpo = '';
    if (pron.sub === 'anio') {
      var a = R.anual(est.natal, est.nac, hoy);
      cuerpo = '<div class="tarjeta"><h2>Tus próximos 12 meses</h2><p class="suave">De hoy al ' + fConAnio(a.hasta) + '. Tu año de cumpleaños a cumpleaños va del ' + fConAnio(a.profeccion.desde) + ' al ' + fConAnio(a.profeccion.hasta) + '</p>' +
        T.fraseProfeccion(a).map(function (x) { return '<p>' + h(x) + '</p>'; }).join('') + '</div>' +
        '<div class="tarjeta"><h3>Grandes tránsitos de los próximos 12 meses</h3>' + lista(a.transitos.map(function (t) { return liTransito(t, fConAnio); }), 'No hay tránsitos lentos exactos en este período.') + '</div>' +
        '<div class="grilla"><div class="tarjeta"><h3>Eclipses</h3>' + lista(a.eclipses.map(function (e) { return liLunacion(e, fConAnio); }), 'Sin eclipses en el período.') + '</div>' +
        '<div class="tarjeta"><h3>Retrogradaciones de Mercurio, Venus y Marte</h3>' + lista(a.estaciones.map(function (e) { return liEstacion(e, fConAnio); }), 'Ninguna en el período.') + '</div></div>';
    } else if (pron.sub === 'mes') {
      var y = +ymd(hoy).slice(0, 4), mth = +ymd(hoy).slice(5, 7) - 1 + pron.mes;
      y += Math.floor(mth / 12); mth = ((mth % 12) + 12) % 12;
      var d0 = M.localAUTC(y, mth + 1, 1, 0, 0, lugar().zona), d1 = M.localAUTC(mth === 11 ? y + 1 : y, mth === 11 ? 1 : mth + 2, 1, 0, 0, lugar().zona);
      var m = R.mensual(est.natal, d0, d1);
      cuerpo = '<div class="tarjeta"><div class="fila" style="align-items:center"><button class="sec" id="mAnt">←</button><h2 style="margin:0;flex:1;text-align:center">' + fF(new Date(+d0 + 15 * DIA), { month: 'long', year: 'numeric' }).replace(/^./, function (x) { return x.toUpperCase(); }) + '</h2><button class="sec" id="mSig">→</button></div></div>' +
        '<div class="grilla"><div class="tarjeta"><h3>Lunaciones</h3>' + lista(m.lunaciones.map(function (e) { return liLunacion(e); }), 'Sin lunaciones.') + '</div>' +
        '<div class="tarjeta"><h3>Cambios de dirección</h3>' + lista(m.estaciones.map(function (e) { return liEstacion(e); }), 'Ningún planeta cambia de dirección este mes.') + '</div></div>' +
        '<div class="tarjeta"><h3>Fechas clave del mes</h3>' + lista(m.rapidos.map(function (t) { return liTransito(t); }), 'Sin tránsitos rápidos exactos.') + '</div>' +
        '<div class="tarjeta"><h3>Telón de fondo</h3>' + lista(m.lentos.map(function (t) { return liTransito(t); }), 'Sin tránsitos lentos en orbe este mes.') + '</div>';
    } else {
      var s = R.semanal(est.natal, hoy);
      cuerpo = '<div class="tarjeta"><h2>Tus próximos 7 días</h2>' + htmlSemana(s) + '</div><div class="tarjeta">' + lista(s.dias.map(function (d) {
        var ev = d.eventos.map(function (e) { return '<div><span class="fecha">' + fHora(e.hora) + '</span> ' + h(T.fraseTransito(e.t)) + '</div>'; }).join('');
        return '<li><b style="text-transform:capitalize">' + fDia(d.fecha) + '</b> · ' + T.fraseTono(d.tono) + ' · ' + d.fase + '<div>Luna en ' + S[d.lunaSigno].n + ' por tu casa ' + d.lunaCasa + ': el clima emocional pasa por ' + T.CASA[d.lunaCasa] + '.' +
          (d.lunaToca.length ? ' Pasa sobre tu ' + d.lunaToca.join(', ') + ' natal.' : '') + '</div>' + ev + '</li>';
      }), '') + '</div>';
    }
    el.innerHTML = '<div class="sub">' + [['anio', 'Año'], ['mes', 'Mes'], ['semana', 'Semana']].map(function (x) { return '<button data-sub="' + x[0] + '" class="' + (pron.sub === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' + cuerpo;
    el.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { pron.sub = b.dataset.sub; renderPronostico(); }; });
    if ($('#mAnt')) { $('#mAnt').onclick = function () { pron.mes--; renderPronostico(); }; $('#mSig').onclick = function () { pron.mes++; renderPronostico(); }; }
  }

  /* ---------- ELEGIR MOMENTO ---------- */
  var busq = null;
  function renderElegir() {
    var hoy = new Date();
    $('#tab-elegir').innerHTML =
      '<div class="tarjeta"><h2>¿Cuándo conviene?</h2><form id="frmElegir">' +
      '<label>Qué quieres hacer<select id="eAcc">' + R.ACCIONES.map(function (a) { return '<option value="' + a.id + '">' + a.n + '</option>'; }).join('') + '</select></label>' +
      '<p class="nota" id="eDesc"></p>' +
      '<div class="fila"><label>Desde<input type="date" id="eDesde" value="' + ymd(hoy) + '" required></label><label>Hasta<input type="date" id="eHasta" value="' + ymd(new Date(+hoy + 14 * DIA)) + '" required></label></div>' +
      '<div class="fila"><label>Entre las<select id="eH1"></select></label><label>y las<select id="eH2"></select></label></div>' +
      '<p class="nota">Lugar: ' + h(lugar().nombre) + '. Se evalúa cada 15 minutos (cada 30 si el rango supera un mes; máximo 92 días).</p>' +
      '<button type="submit" id="eBtn">Buscar los mejores momentos</button></form><div class="progreso" id="eProg" hidden><i></i></div></div><div id="eRes"></div>';
    var o = ''; for (var i = 0; i <= 24; i++) o += '<option value="' + i + '">' + (i < 10 ? '0' : '') + i + ':00</option>';
    $('#eH1').innerHTML = o; $('#eH2').innerHTML = o; $('#eH1').value = 8; $('#eH2').value = 22;
    function desc() { $('#eDesc').textContent = R.ACC[$('#eAcc').value].desc; }
    $('#eAcc').onchange = desc; desc();
    $('#frmElegir').onsubmit = function (ev) { ev.preventDefault(); buscar(); };
    if (busq) pintarBusqueda();
  }
  function buscar() {
    var l = lugar(), d0 = deYmd($('#eDesde').value), d1 = new Date(+deYmd($('#eHasta').value) + DIA);
    var h1 = +$('#eH1').value, h2 = +$('#eH2').value;
    if (d1 <= d0 || h2 <= h1) { $('#eRes').innerHTML = '<div class="tarjeta neg">Revisa el rango de fechas y de horas.</div>'; return; }
    if (d1 - d0 > 92 * DIA) d1 = new Date(+d0 + 92 * DIA);
    var paso = d1 - d0 > 31 * DIA ? 30 : 15, total = Math.ceil((d1 - d0) / DIA), i = 0, muestras = [];
    var btn = $('#eBtn'), prog = $('#eProg'); btn.disabled = true; prog.hidden = false;
    var acc = $('#eAcc').value;
    (function tanda() {
      var a = new Date(+d0 + i * DIA), b = new Date(Math.min(+d1, +a + DIA) - 1);
      muestras = muestras.concat(R.escanear({ desde: a, hasta: b, lat: l.lat, lon: l.lon, accion: acc, natal: est.natal, pasoMin: paso, zona: l.zona, horaMin: h1, horaMax: h2 }));
      i++; prog.firstChild.style.width = Math.round(i / total * 100) + '%';
      if (i < total) return setTimeout(tanda, 0);
      btn.disabled = false; prog.hidden = true;
      busq = { acc: acc, paso: paso, muestras: muestras, dia: null };
      pintarBusqueda();
    })();
  }
  function detalleVentana(v) {
    var l = lugar(), r = R.puntuar(v.pico, l.lat, l.lon, R.ACC[busq.acc], est.natal, {});
    return '<div class="tarjeta"><div class="fecha" style="text-transform:capitalize">' + fDia(v.inicio) + '</div><h3 style="margin:.1em 0">de ' + fHora(v.inicio) + ' a ' + fHora(v.fin) + ' · ' + htmlPuntaje(v.puntaje) + '</h3>' +
      (function (rl) { return (rl.favor.length ? '<p><b>A favor:</b> ' + h(rl.favor.join('. ')) + '.</p>' : '') + (rl.contra.length ? '<p><b>A tener en cuenta:</b> ' + h(rl.contra.join('. ')) + '.</p>' : ''); })(T.resumenLlano(r.factores)) +
      '<details><summary>Ver el detalle astrológico</summary><p class="suave">Punto más alto ' + fHora(v.pico) + ' · Ascendente ' + M.fmtLon(r.carta.asc) + ' · Luna ' + M.fmtLon(r.carta.pos.luna.lon) + (r.hora ? ' · hora de ' + P[r.hora.regente].n : '') + '</p>' + htmlFactores(r.factores) + '</details></div>';
  }
  function pintarBusqueda() {
    var ms = busq.muestras, porDia = {}, orden = [];
    ms.forEach(function (m) { var k = ymd(new Date(m.t)); if (!porDia[k]) { porDia[k] = []; orden.push(k); } porDia[k].push(m); });
    var vs = R.ventanas(ms, busq.paso, 6);
    var calor = orden.map(function (k) {
      var mx = Math.max.apply(null, porDia[k].map(function (m) { return m.p; })), d = deYmd(k, 12);
      return '<button data-dia="' + k + '" class="' + (busq.dia === k ? 'on' : '') + '" style="background:' + color(mx) + '" title="' + fDia(d) + '">' + fF(d, { weekday: 'short' }).slice(0, 2) + ' ' + +k.slice(8) + '<b>' + mx + '</b></button>';
    }).join('');
    var det = '';
    if (busq.dia && porDia[busq.dia]) {
      var dd = porDia[busq.dia], vd = R.ventanas(dd, busq.paso, 1)[0];
      det = '<div class="tarjeta"><h3 style="text-transform:capitalize">' + fDia(deYmd(busq.dia, 12)) + ', hora por hora</h3><div class="barras">' + dd.map(function (m) { return '<i style="height:' + m.p + '%;background:' + color(m.p) + '" title="' + fHora(new Date(m.t)) + ' · ' + m.p + '"></i>'; }).join('') +
        '</div><div class="ejes"><span>' + fHora(new Date(dd[0].t)) + '</span><span>' + fHora(new Date(dd[dd.length - 1].t)) + '</span></div></div>' + detalleVentana(vd);
    }
    $('#eRes').innerHTML = '<div class="tarjeta"><h2>' + h(R.ACC[busq.acc].n) + '</h2><p class="suave">Mejor puntaje de cada día. Toca un día para verlo hora por hora.</p><div class="calor">' + calor + '</div></div>' + det +
      '<h2 style="margin:18px 4px 10px">Las mejores ventanas del período</h2><div class="grilla">' + vs.map(detalleVentana).join('') + '</div>';
    $('#eRes').querySelectorAll('[data-dia]').forEach(function (b) { b.onclick = function () { busq.dia = b.dataset.dia; pintarBusqueda(); }; });
  }

  /* ---------- MÉTODO ---------- */
  function renderMetodo() {
    $('#tab-metodo').innerHTML =
      '<div class="tarjeta"><h2>Por qué no es como preguntarle a un chat de IA</h2>' +
      '<p>Un chat de inteligencia artificial común no calcula el cielo: cuando le preguntas dónde está un planeta, estima o inventa. Aquí es al revés.</p>' +
      '<ul><li><b>Primero calcula, después interpreta.</b> La posición de cada planeta se obtiene con cálculo astronómico para tu fecha, hora y lugar, con precisión de alrededor de un minuto de arco. El astrólogo solo interpreta sobre esos datos.</li>' +
      '<li><b>Parte de tu carta, no de tu signo.</b> Cada respuesta usa tu carta completa y lo que está pasando hoy sobre ella.</li>' +
      '<li><b>Te da día y hora.</b> Para elegir un momento evalúa cada 15 minutos con decenas de criterios de la astrología tradicional y te muestra las mejores ventanas.</li>' +
      '<li><b>Sigue un método, no una ocurrencia.</b> Las reglas vienen de técnicas documentadas de la tradición helenística, medieval y moderna, y puedes abrir el porqué de cada conclusión.</li>' +
      '<li><b>Cinco voces, un mismo rigor.</b> Eliges cómo quieres que te lo cuenten; los cálculos son los mismos.</li></ul></div>' +
      '<div class="tarjeta"><h2>La biblioteca del astrólogo</h2><p>En modo inteligente, el astrólogo puede consultar el texto original de obras clásicas de astrología que están en dominio público, y citar de dónde sale lo que dice.</p><div id="mBiblio" class="suave"></div></div>' +
      '<div class="tarjeta"><h2>Cómo calcula</h2><p>Las posiciones salen de <b>astronomy-engine</b>, una librería astronómica abierta con precisión de alrededor de un minuto de arco. Se usa el zodíaco tropical, casas de signo entero y regencias tradicionales (los siete planetas clásicos). El Ascendente y el Medio Cielo se calculan al grado y minuto para tu latitud y longitud, respetando el huso horario histórico de tu lugar de nacimiento.</p></div>' +
      '<div class="tarjeta"><h2>Cómo elige un momento</h2><p>El puntaje sigue el orden de prioridades que enseñan Chris Brennan y Leisa Schaim: primero el regente del Ascendente, después la Luna, los planetas en los ángulos, la casa del tema y, al final, tu carta natal como desempate.</p>' +
      '<ul><li><b>Secta</b>: de día Júpiter es el gran benéfico y Marte el planeta difícil; de noche, Venus y Saturno. El maléfico contrario a la secta en una casa angular es lo que más resta.</li>' +
      '<li><b>Luna</b>: que aplique a Venus o Júpiter y no a Marte o Saturno; que no esté vacía de curso (definición medieval, la de Bonatti y Lilly), ni combusta, ni en vía combusta. Creciente para empezar, menguante para cerrar (Doroteo, vía Benjamin Dykes).</li>' +
      '<li><b>Dignidades y combustión</b> según la tabla de William Lilly (combusto a menos de 8°30′ del Sol, bajo los rayos hasta 17°).</li>' +
      '<li><b>Tema</b>: casa 7 para pareja y contratos, 9 y 3 para viajes, 10 y 2 para negocios, 4 para vivienda, 5 para lo creativo; más el significador natural (Venus, Mercurio, Júpiter...). Mercurio retrógrado pesa fuerte en contratos.</li>' +
      '<li><b>Horas planetarias</b> como detalle menor (Lilly, Warnock).</li></ul>' +
      '<p>El puntaje compara momentos entre sí dentro del rango que pides: no existe la carta perfecta, se elige la mejor disponible.</p></div>' +
      '<div class="tarjeta"><h2>Cómo arma el pronóstico</h2><p><b>Año</b>: profección anual y señor del año (técnica helenística recuperada por Brennan y Demetra George), tránsitos de Júpiter a Plutón con orbe de 1° como los trabaja Robert Hand, y eclipses por casa. <b>Mes</b>: lunaciones por casa natal, cambios de dirección y tránsitos de Sol, Mercurio, Venus y Marte. <b>Semana</b>: la Luna por tus casas y los tránsitos exactos de cada día. La lectura de la carta combina la mirada tradicional (secta, regente del Ascendente, dignidades) con la psicológica de Liz Greene y Howard Sasportas.</p></div>' +
      '<div class="tarjeta"><h2>Créditos</h2><p class="suave">Cálculo astronómico: astronomy-engine, de Don Cross (licencia MIT). Ciudades y husos horarios: GeoNames (geonames.org), licencia Creative Commons Atribución 4.0. Mapa: Leaflet, con cartografía de © OpenStreetMap y sus colaboradores.</p></div>' +
      '<div class="tarjeta"><h2>Lo que todavía no hace</h2><p>No calcula revolución solar, progresiones, arcos solares ni liberación zodiacal, y no ofrece casas Placidus ni otras definiciones de Luna vacía. Varias reglas atribuidas a Vivian Robson y Doroteo vienen de fuentes secundarias y conviene cotejarlas con los libros.</p>' +
      '<p class="suave">La astrología es una tradición simbólica, no una ciencia predictiva: usala como una herramienta de reflexión y de elección de momentos, no como garantía de resultados. Para decisiones de salud, legales o de dinero, consulta con profesionales.</p></div>';
  }

  function pintarBiblioteca() {
    var el = $('#mBiblio'); if (!el || !window.Biblioteca) return;
    var c = Biblioteca.catalogo();
    el.innerHTML = c.length ? '<ul>' + c.map(function (o) { return '<li>' + h(o.autor) + ', <i>' + h(o.titulo) + '</i> (' + o.anio + ')</li>'; }).join('') + '</ul><p>' + c.length + ' obras, ' + c.reduce(function (n, o) { return n + o.pasajes; }, 0).toLocaleString('es') + ' pasajes consultables. Son textos antiguos: el astrólogo toma la técnica y la adapta a la vida de hoy.</p>' : 'La biblioteca no está disponible en este momento.';
  }

  /* ---------- pestañas ---------- */
  var RENDER = { comparar: function () { window.Comparar.render($('#tab-comparar')); }, voces: function () { window.Voces.render($('#tab-voces')); }, inicio: renderInicio, carta: renderCarta, pronostico: renderPronostico, elegir: renderElegir, metodo: function () { renderMetodo(); pintarBiblioteca(); } };
  function mostrar(tab) {
    est.tab = tab;
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    document.querySelectorAll('.tab').forEach(function (s) { s.hidden = !est.perfil || s.id !== 'tab-' + tab; });
    $('#vacio').hidden = !!est.perfil;
    if (!est.perfil) return;
    if (!est.hecho[tab] || tab === 'comparar') { RENDER[tab](); est.hecho[tab] = true; }
  }
  function pintarSelector() {
    $('#selPerfil').innerHTML = perfiles.map(function (p) { return '<option value="' + p.id + '">' + h(p.nombre) + '</option>'; }).join('');
    if (est.perfil) $('#selPerfil').value = est.perfil.id;
    $('#selPerfil').hidden = $('#btnEditar').hidden = !perfiles.length;
  }

  /* ---------- diálogo de perfil ---------- */
  var editando = null;
  function abrirPerfil(p) {
    editando = p;
    $('#pNombre').value = p ? p.nombre : ''; $('#pFecha').value = p ? p.fecha : ''; $('#pHora').value = p ? p.hora : '12:00';
    ['Nac', 'Act'].forEach(function (k) {
      var x = p ? (k === 'Nac' ? p.nac : p.act) : null;
      $('#p' + k + 'Busca').value = x ? x.nombre : ''; $('#p' + k + 'Lat').value = x ? x.lat : ''; $('#p' + k + 'Lon').value = x ? x.lon : ''; $('#p' + k + 'Zona').value = x ? x.zona : ''; $('#p' + k + 'Res').innerHTML = '';
    });
    var mismo = !p || (p.nac.lat === p.act.lat && p.nac.lon === p.act.lon);
    $('#pMismo').checked = mismo; $('#pActBloque').hidden = mismo; $('#btnBorrar').hidden = !p;
    $('#dlgPerfil').showModal();
  }
  /* Buscador de ciudades propio: la lista (GeoNames, CC BY 4.0) viaja con la app y se carga recién al buscar */
  var ciudades = null, nombrePais = null;
  function sinAcentos(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function cargarCiudades() {
    if (!ciudades) ciudades = fetch('datos/ciudades.json').then(function (r) { if (!r.ok) throw new Error('sin datos'); return r.json(); }).then(function (d) {
      d.c.forEach(function (c) { c.b = sinAcentos(c[0]); });
      return d;
    }).catch(function (e) { ciudades = null; throw e; });
    return ciudades;
  }
  function pais(cc) {
    try { nombrePais = nombrePais || new Intl.DisplayNames(['es'], { type: 'region' }); return nombrePais.of(cc); } catch (e) { return cc; }
  }
  function buscarCiudad(k) {
    var q = sinAcentos($('#p' + k + 'Busca').value.trim().split(',')[0]), res = $('#p' + k + 'Res');
    if (q.length < 2) return;
    res.textContent = 'Buscando…';
    cargarCiudades().then(function (d) {
      // primero las que empiezan con lo escrito, después las que lo contienen; la lista ya viene ordenada por población
      var empieza = [], contiene = [];
      for (var i = 0; i < d.c.length && empieza.length < 8; i++) {
        var c = d.c[i], pos = c.b.indexOf(q);
        if (pos === 0 || (c[6] && ('|' + c[6]).indexOf('|' + q) >= 0)) empieza.push(c);
        else if (pos > 0 && contiene.length < 8) contiene.push(c);
      }
      var lista = empieza.concat(contiene).slice(0, 8);
      res.innerHTML = '';
      lista.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button';
        b.textContent = [c[0], d.a[c[1]], pais(c[2])].filter(Boolean).join(', ');
        b.onclick = function () { $('#p' + k + 'Busca').value = b.textContent; $('#p' + k + 'Lat').value = c[3]; $('#p' + k + 'Lon').value = c[4]; $('#p' + k + 'Zona').value = d.z[c[5]]; res.innerHTML = ''; };
        res.appendChild(b);
      });
      if (!lista.length) res.textContent = 'No encontré esa ciudad. Prueba con la ciudad más cercana o carga las coordenadas a mano.';
    }).catch(function () { res.textContent = 'No pude cargar la lista de ciudades. Carga latitud, longitud y zona horaria a mano.'; });
  }
  /* Mapa para ubicar el lugar a mano (Leaflet + OpenStreetMap). Se carga recién al pedirlo. */
  var leaflet = null, mapas = {};
  function cargarLeaflet() {
    if (!leaflet) leaflet = new Promise(function (ok, mal) {
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'js/vendor/leaflet/leaflet.css'; document.head.appendChild(c);
      var j = document.createElement('script'); j.src = 'js/vendor/leaflet/leaflet.js'; j.onload = ok; j.onerror = function () { leaflet = null; mal(new Error('mapa')); }; document.head.appendChild(j);
    });
    return leaflet;
  }
  /** Ciudad de la lista más cercana a un punto: de ella se toma el huso horario. */
  function ciudadCercana(d, lat, lon) {
    var mejor = null, min = 1e9, k = Math.cos(lat * Math.PI / 180);
    for (var i = 0; i < d.c.length; i++) { var c = d.c[i], dy = c[3] - lat, dx = (c[4] - lon) * k, q = dx * dx + dy * dy; if (q < min) { min = q; mejor = c; } }
    return { c: mejor, km: Math.sqrt(min) * 111 };
  }
  function abrirMapa(k) {
    var caja = $('#p' + k + 'Mapa'), msg = $('#p' + k + 'MapaMsg');
    if (!caja.hidden) { caja.hidden = true; msg.hidden = true; return; }
    caja.hidden = false; msg.hidden = false; msg.textContent = 'Cargando el mapa…';
    Promise.all([cargarLeaflet(), cargarCiudades()]).then(function (r) {
      var d = r[1], L = window.L, lat = parseFloat($('#p' + k + 'Lat').value), lon = parseFloat($('#p' + k + 'Lon').value), tiene = isFinite(lat) && isFinite(lon);
      var m = mapas[k];
      if (!m) {
        m = mapas[k] = { mapa: L.map(caja, { zoomControl: true, attributionControl: true }).setView(tiene ? [lat, lon] : [-20, -60], tiene ? 10 : 3), punto: null };
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 16, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m.mapa);
        m.mapa.on('click', function (ev) { elegir(ev.latlng.lat, ev.latlng.lng); });
      } else if (tiene) m.mapa.setView([lat, lon], Math.max(m.mapa.getZoom(), 9));
      function marcar(la, lo) { if (m.punto) m.punto.setLatLng([la, lo]); else m.punto = L.circleMarker([la, lo], { radius: 9, color: '#e6c16a', weight: 3, fillColor: '#e6c16a', fillOpacity: 0.5 }).addTo(m.mapa); }
      function elegir(la, lo) {
        lo = ((lo + 540) % 360) - 180;
        var n = ciudadCercana(d, la, lo), nombre = [n.c[0], d.a[n.c[1]], pais(n.c[2])].filter(Boolean).join(', ');
        marcar(la, lo);
        $('#p' + k + 'Lat').value = la.toFixed(3); $('#p' + k + 'Lon').value = lo.toFixed(3); $('#p' + k + 'Zona').value = d.z[n.c[5]];
        $('#p' + k + 'Busca').value = n.km < 8 ? nombre : 'Cerca de ' + nombre;
        msg.textContent = 'Punto elegido. Huso horario tomado de ' + n.c[0] + ' (a ' + Math.round(n.km) + ' km): ' + d.z[n.c[5]] + '.';
      }
      if (tiene) marcar(lat, lon);
      msg.textContent = 'Acerca el mapa y toca el lugar exacto. Vuelve a tocar "Mapa" para cerrarlo.';
      setTimeout(function () { m.mapa.invalidateSize(); }, 60);
    }).catch(function () { msg.textContent = 'No pude cargar el mapa. Usa el buscador o carga las coordenadas a mano.'; });
  }

  function leerLugar(k) {
    var zona = $('#p' + k + 'Zona').value.trim(), lat = parseFloat($('#p' + k + 'Lat').value), lon = parseFloat($('#p' + k + 'Lon').value);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 89 || Math.abs(lon) > 180) throw new Error('Revisa la latitud y la longitud.');
    try { new Intl.DateTimeFormat('es', { timeZone: zona }); } catch (e) { throw new Error('La zona horaria "' + zona + '" no es válida. Ejemplo: America/Argentina/Buenos_Aires'); }
    return { nombre: $('#p' + k + 'Busca').value.trim() || (lat + ', ' + lon), lat: lat, lon: lon, zona: zona };
  }
  function guardarPerfil(ev) {
    ev.preventDefault();
    try {
      var nac = leerLugar('Nac'), act = $('#pMismo').checked ? nac : leerLugar('Act');
      var p = editando || { id: 'p' + Date.now() };
      p.nombre = $('#pNombre').value.trim(); p.fecha = $('#pFecha').value; p.hora = $('#pHora').value || '12:00'; p.nac = nac; p.act = act;
      if (!p.nombre || !p.fecha) throw new Error('Faltan el nombre o la fecha.');
      if (!editando) perfiles.push(p);
      guardar('astro.perfiles', perfiles); $('#dlgPerfil').close(); activar(p.id); busq = null; pintarSelector(); mostrar(est.tab);
    } catch (e) { alert(e.message); }
  }

  /* ---------- arranque ---------- */
  $('#invBtn').onclick = function () {
    if (aplicarInvitacion($('#invTxt').value)) { $('#invTxt').value = ''; $('#invMsg').textContent = 'Invitación activada: ya tienes el modo inteligente y las voces. Ahora carga tus datos.'; }
    else $('#invMsg').textContent = 'No encontré un código de invitación en ese texto. Copia el mensaje completo y pégalo de nuevo.';
  };
  function pintarCuenta() {
    var on = !!(window.Cuenta && Cuenta.activa()), chip = $('#cuentaChip'), v = $('#vacioCuenta');
    chip.hidden = !on; v.hidden = !on;
    if (on) { chip.textContent = '● ' + Cuenta.correo(); chip.title = 'Sesión iniciada'; v.textContent = 'Sesión iniciada como ' + Cuenta.correo() + '. Ya tienes el astrólogo inteligente: carga tus datos para empezar.'; }
  }
  if (window.Cuenta) Cuenta.alCambiar(pintarCuenta);
  function pintarTema() { var claro = document.documentElement.dataset.tema === 'claro'; $('#btnTema').textContent = claro ? '☾ Oscuro' : '☀ Claro'; $('#btnTema').setAttribute('aria-label', claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'); }
  var mqClaro = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  function ponerTema(claro) { if (claro) document.documentElement.dataset.tema = 'claro'; else delete document.documentElement.dataset.tema; pintarTema(); }
  $('#btnTema').onclick = function () {
    var claro = document.documentElement.dataset.tema !== 'claro';
    // si la elección coincide con la del dispositivo no se guarda nada: vuelve a seguir al dispositivo
    if (mqClaro && mqClaro.matches === claro) { try { localStorage.removeItem('astro.tema'); } catch (e) { /* nada */ } }
    else guardar('astro.tema', claro ? 'claro' : 'oscuro');
    ponerTema(claro);
  };
  if (mqClaro && mqClaro.addEventListener) mqClaro.addEventListener('change', function (ev) { if (!leer('astro.tema', null)) ponerTema(ev.matches); });
  pintarTema();
  $('#tabs').onclick = function (e) { if (e.target.dataset.tab) mostrar(e.target.dataset.tab); };
  $('#selPerfil').onchange = function () { activar(this.value); busq = null; mostrar(est.tab); };
  $('#btnNuevo').onclick = $('#btnPrimera').onclick = function () { abrirPerfil(null); };
  $('#btnEditar').onclick = function () { abrirPerfil(est.perfil); };
  $('#btnCancelar').onclick = function () { $('#dlgPerfil').close(); };
  $('#pMismo').onchange = function () { $('#pActBloque').hidden = this.checked; };
  $('#frmPerfil').onsubmit = guardarPerfil;
  document.querySelectorAll('[data-mapa]').forEach(function (b) { b.onclick = function () { abrirMapa(b.dataset.mapa); }; });
  document.querySelectorAll('[data-busca]').forEach(function (b) { b.onclick = function () { buscarCiudad(b.dataset.busca); }; });
  ['Nac', 'Act'].forEach(function (k) { $('#p' + k + 'Busca').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); buscarCiudad(k); } }); });
  $('#btnBorrar').onclick = function () {
    if (!editando || !confirm('¿Borrar la carta de ' + editando.nombre + '? No se puede deshacer.')) return;
    perfiles = perfiles.filter(function (p) { return p !== editando; }); guardar('astro.perfiles', perfiles);
    $('#dlgPerfil').close(); activar(null); pintarSelector(); mostrar('inicio');
  };

  window.App = { aplicarInvitacion: aplicarInvitacion, enlaceInvitacion: enlaceInvitacion, persona: persona, htmlFactores: htmlFactores, htmlPuntaje: htmlPuntaje, mostrar: mostrar, est: est, lugar: lugar, h: h, ymd: ymd, deYmd: deYmd, fDia: fDia, fHora: fHora, fDiaHora: fDiaHora, fConAnio: fConAnio, leer: leer, guardar: guardar, inicioDia: inicioDia };
  activar(leer('astro.activo', null)); pintarSelector();
  // Las pantallas de prueba (voces y comparación de modelos) se ven solo trabajando en la compu, no en la app pública
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) document.querySelectorAll('[data-tab=voces], [data-tab=comparar]').forEach(function (b) { b.hidden = true; });
  window.addEventListener('DOMContentLoaded', function () { mostrar('inicio'); if (window.Biblioteca) Biblioteca.iniciar(); });
})();
