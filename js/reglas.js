/* Reglas: puntaje de momentos (astrología eleccional) y datos de pronóstico.
   Criterio base: Brennan/Schaim (secta, regente del Ascendente, Luna, casas de signo entero),
   Lilly (dignidades, combustión), Dykes/Doroteo (fase lunar), con capa natal como desempate. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./motor.js'));
  else root.Reglas = factory(root.Motor);
})(this, function (M) {
  'use strict';
  var DIA = 86400000, P = M.P, S = M.SIGNOS;

  var ACCIONES = [
    { id: 'general', n: 'Iniciar algo (general)', casas: [], sig: [], desc: 'Cualquier comienzo que quieras que prospere.' },
    { id: 'viaje', n: 'Viaje', casas: [9, 3], sig: ['jupiter', 'mercurio'], mod: 'cardinal', desc: 'El momento que cuenta es cuando sales de tu casa.' },
    { id: 'propuesta', n: 'Propuesta, pareja o casamiento', casas: [7], sig: ['venus'], mod: 'fijo', desc: 'El momento es el de la pregunta o el "sí".' },
    { id: 'negocio', n: 'Abrir un negocio o lanzar un proyecto', casas: [10, 2], sig: ['jupiter', 'mercurio'], mod: 'fijo', desc: 'Apertura de puertas, publicación del lanzamiento o constitución.' },
    { id: 'contrato', n: 'Firmar un contrato o acuerdo', casas: [7, 3], sig: ['mercurio'], retroFuerte: true, mod: 'mutable', desc: 'El momento de la firma.' },
    { id: 'trabajo', n: 'Entrevista o empezar un trabajo', casas: [10, 11], sig: ['sol', 'mercurio'], desc: 'Inicio de la entrevista o del primer día.' },
    { id: 'mudanza', n: 'Mudanza o tema de vivienda', casas: [4], sig: ['luna'], mod: 'fijo', desc: 'Entrar a la casa nueva o firmar por ella.' },
    { id: 'comunicar', n: 'Publicar, anunciar o enviar algo importante', casas: [3, 10], sig: ['mercurio'], desc: 'El instante de apretar "publicar" o "enviar".' },
    { id: 'conversacion', n: 'Conversación importante o pedir algo', casas: [7, 11], sig: ['mercurio', 'venus'], desc: 'Cuando empieza la charla.' },
    { id: 'creativo', n: 'Proyecto creativo o artístico', casas: [5], sig: ['venus', 'mercurio'], desc: 'Empezar a grabar, estrenar, mostrar.' },
    { id: 'estudiar', n: 'Empezar a estudiar o un curso', casas: [9, 3], sig: ['mercurio'], mod: 'mutable', desc: 'La primera clase o el momento de inscribirte.' },
    { id: 'compraventa', n: 'Comprar o vender algo importante', casas: [2, 7], sig: ['mercurio', 'jupiter'], comercio: true, desc: 'El momento de cerrar la operación.' },
    { id: 'cerrar', n: 'Cerrar, terminar o soltar algo', casas: [], sig: [], fase: 'menguante', desc: 'Para finales conviene Luna menguante.' }
  ];
  var ACC = {}; ACCIONES.forEach(function (a) { ACC[a.id] = a; });

  var CASAS_BUENAS = { 1: 8, 10: 8, 7: 6, 4: 6, 11: 6, 5: 3, 9: 3, 3: 2 };
  var N_DIG = { domicilio: 'en domicilio', exaltacion: 'en exaltación', exilio: 'en exilio', caida: 'en caída' };
  function esAng(n) { return n === 1 || n === 4 || n === 7 || n === 10; }
  function gr(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }

  function puntuar(date, lat, lon, acc, natal, cache) {
    var c = M.carta(date, lat, lon), pos = c.pos, F = [], suma = 0;
    function f(pts, txt) { pts = Math.round(pts); if (!pts) return; F.push({ pts: pts, txt: txt }); suma += pts; }
    var malContra = c.diurna ? 'marte' : 'saturno', benSecta = c.diurna ? 'jupiter' : 'venus';
    var sol = pos.sol.lon;

    // 1. Maléficos y benéficos respecto de los ángulos
    ['marte', 'saturno', 'venus', 'jupiter'].forEach(function (id) {
      var p = pos[id], mal = id === 'marte' || id === 'saturno';
      var cerca = Math.min(M.sep(p.lon, c.asc), M.sep(p.lon, c.mc), M.sep(p.lon, c.asc + 180), M.sep(p.lon, c.mc + 180));
      if (mal) {
        if (esAng(p.casa)) {
          var aj = M.aspectoEntre(p.lon, pos.jupiter.lon, 6), frenado = p.dignidad === 'domicilio' || p.dignidad === 'exaltacion' || (aj && aj.asp.tipo === 'armonico');
          f((id === malContra ? -12 : -6) * (frenado ? 0.5 : 1), P[id].n + (id === malContra ? ' (maléfico contrario a la secta)' : ' (maléfico)') + ' en casa angular ' + p.casa + (frenado ? ', refrenado por su dignidad o por Júpiter' : ''));
        }
        if (cerca <= 5) f(-8, P[id].n + ' a ' + gr(cerca) + '° de un ángulo');
      } else {
        if (esAng(p.casa)) {
          var debil = p.retro || p.dignidad === 'exilio' || p.dignidad === 'caida' || M.sep(p.lon, sol) <= 8.5;
          f(debil ? 2 : (id === benSecta ? 8 : 6), P[id].n + ' (benéfico) en casa angular ' + p.casa + (debil ? ', pero debilitado' : ''));
        }
        if (cerca <= 5) f(4, P[id].n + ' a ' + gr(cerca) + '° de un ángulo');
      }
    });

    // 2. Regente del Ascendente
    var R = c.regenteAsc, pr = pos[R], nR = P[R].n + ', regente del Ascendente,';
    if (CASAS_BUENAS[pr.casa]) f(CASAS_BUENAS[pr.casa], nR + ' en casa ' + pr.casa);
    else f(-10, nR + ' en casa ' + pr.casa + ' (sin vínculo con el Ascendente)');
    if (pr.dignidad) f({ domicilio: 7, exaltacion: 5, exilio: -5, caida: -5 }[pr.dignidad], nR + ' ' + N_DIG[pr.dignidad]);
    if (pr.retro && R !== 'sol' && R !== 'luna') f(-10, nR + ' retrógrado');
    if (R !== 'sol' && R !== 'luna') {
      var ds = M.sep(pr.lon, sol);
      if (ds <= 0.28) f(4, nR + ' en el corazón del Sol (cazimi)');
      else if (ds <= 8.5) f(-8, nR + ' combusto (a ' + gr(ds) + '° del Sol)');
      else if (ds <= 17) f(-3, nR + ' bajo los rayos del Sol');
    }
    ['venus', 'jupiter', 'marte', 'saturno'].forEach(function (id) {
      if (id === R) return;
      var a = M.aspectoEntre(pr.lon, pos[id].lon, 6); if (!a) return;
      var rapido = Math.abs(pr.vel) > Math.abs(pos[id].vel) ? pr : pos[id], lento = rapido === pr ? pos[id] : pr;
      var apl = M.aplicativo(rapido, lento, a.asp.a), mal = id === 'marte' || id === 'saturno';
      if (mal) { if (a.asp.tipo !== 'armonico') f(apl ? -8 : -3, nR + ' en ' + a.asp.n + (apl ? ' aplicativa' : ' separativa') + ' con ' + P[id].n); }
      else if (apl) f(a.asp.tipo === 'tenso' ? 3 : 6, nR + ' aplicando por ' + a.asp.n + ' a ' + P[id].n);
    });

    // 3. Luna
    var L = pos.luna, el = M.estadoLuna(pos);
    if (el.proximo) {
      var pp = el.proximo, mal = pp.planeta === 'marte' || pp.planeta === 'saturno', ben = pp.planeta === 'venus' || pp.planeta === 'jupiter';
      var t = 'La Luna aplica por ' + pp.asp.n + ' a ' + P[pp.planeta].n;
      if (mal) f(pp.asp.tipo === 'armonico' ? -1 : -14, t);
      else if (ben) f(pp.asp.tipo === 'tenso' ? 5 : 10, t);
      else f(pp.asp.tipo === 'armonico' ? 3 : (pp.asp.tipo === 'tenso' ? -2 : 0), t);
    }
    if (el.vacia) f([1, 3, 8, 11].indexOf(L.signo) >= 0 ? -3 : -8, 'Luna vacía de curso (no cierra ningún aspecto antes de cambiar de signo)');
    if (L.signo === 3 || L.signo === 1) f(5, 'Luna en ' + S[L.signo].n + ' (dignificada)');
    if (L.signo === 7 || L.signo === 9) f(-5, 'Luna en ' + S[L.signo].n + ' (debilitada)');
    if (R !== 'luna' && [2, 6, 8, 12].indexOf(L.casa) >= 0) f(-4, 'Luna en casa ' + L.casa + ' (sin vínculo con el Ascendente)');
    var quiereMeng = acc.fase === 'menguante';
    if (el.creciente) f(quiereMeng ? -4 : 4, 'Luna creciente (' + Math.round(el.iluminacion * 100) + '% iluminada)');
    else f(quiereMeng ? 4 : -3, 'Luna menguante (' + Math.round(el.iluminacion * 100) + '% iluminada)');
    // Ramesey y Bonatti: peor cuando la Luna va hacia el Sol (menguante) que cuando ya se aleja
    if (!el.creciente && el.distSol <= 15) f(-10, 'Luna combusta, yendo hacia el Sol');
    else if (el.creciente && el.distSol <= 5) f(-8, 'Luna combusta, recién saliendo del Sol');
    else if (el.distSol <= 12) f(-3, 'Luna bajo los rayos del Sol');
    if (el.viaCombusta) f(acc.id === 'propuesta' || acc.id === 'viaje' || acc.comercio ? -8 : -4, 'Luna en vía combusta (15° Libra a 15° Escorpio)');
    if (M.gradoEnSigno(L.lon) >= 27) f(-2, 'Luna en los últimos grados del signo');
    var dn = Math.min(M.sep(L.lon, pos.nodo.lon), M.sep(L.lon, pos.nodo.lon + 180));
    var cola = M.sep(L.lon, pos.nodo.lon + 180);
    if (cola <= 5) f(-5, 'Luna junto al Nodo Sur');
    else if (cola <= 12) f(-2, 'Luna cerca del Nodo Sur');
    else if (dn <= 5) f(-2, 'Luna junto al Nodo Norte');
    if (L.vel < 12.4) f(-3, 'Luna lenta (avanza menos que su promedio)');
    if (L.casa === 1 && !acc.comercio) f(-4, 'Luna en el Ascendente');
    var lum = M.aspectoEntre(L.lon, sol, 6);
    if (lum && lum.asp.tipo === 'armonico') f(3, 'Sol y Luna en ' + lum.asp.n);
    // Ramesey y Lilly: la casa 4 y su regente muestran el final del asunto
    var r4 = pos[c.regenteCasa(4)];
    if (r4.dignidad === 'domicilio' || r4.dignidad === 'exaltacion') f(3, 'El regente de la casa 4 (el final del asunto) está fuerte');
    else if (r4.dignidad === 'exilio' || r4.dignidad === 'caida' || (r4.retro && c.regenteCasa(4) !== 'sol' && c.regenteCasa(4) !== 'luna')) f(-3, 'El regente de la casa 4 (el final del asunto) está débil');
    if (acc.comercio) ['luna', 'mercurio'].forEach(function (id) { var am = M.aspectoEntre(pos.marte.lon, pos[id].lon, 5); if (am) f(-4, 'Marte en ' + am.asp.n + ' con ' + P[id].n + ': discusiones en la operación'); });
    var disp = S[L.signo].reg;
    if (disp !== 'luna' && (pos[disp].casa === 8 || pos[disp].casa === 12)) f(-4, 'El regente de la Luna (' + P[disp].n + ') cae en casa ' + pos[disp].casa + ': final flojo');

    // 4. Casa del tema
    (acc.casas || []).forEach(function (n, i) {
      var w = i === 0 ? 1.4 : 0.7, rg = c.regenteCasa(n), pg = pos[rg], nr = P[rg].n + ', regente de la casa ' + n + ' (tema),';
      if (pg.dignidad) f({ domicilio: 5, exaltacion: 4, exilio: -4, caida: -4 }[pg.dignidad] * w, nr + ' ' + N_DIG[pg.dignidad]);
      if (pg.casa === 6 || pg.casa === 8 || pg.casa === 12) f(-4 * w, nr + ' en casa ' + pg.casa);
      else if (esAng(pg.casa)) f(3 * w, nr + ' en casa angular');
      if (pg.retro && rg !== 'sol' && rg !== 'luna') f(-4 * w, nr + ' retrógrado');
      ['venus', 'jupiter'].forEach(function (b) { if (pos[b].casa === n) f(5 * w, P[b].n + ' en la casa ' + n + ', la del tema'); });
      ['marte', 'saturno'].forEach(function (b) { if (pos[b].casa === n) f(-6 * w, P[b].n + ' en la casa ' + n + ', la del tema'); });
      if (pr.casa === n && n !== 1) f(5 * w, 'El regente del Ascendente está en la casa del tema');
    });

    // 5. Significadores naturales
    (acc.sig || []).forEach(function (id, i) {
      var w = i === 0 ? 1.4 : 0.8, p = pos[id], ns = P[id].n + ' (significador)';
      if (p.retro && id !== 'sol' && id !== 'luna') f((acc.retroFuerte ? -12 : -8) * w, ns + ' retrógrado');
      if (p.dignidad) f({ domicilio: 4, exaltacion: 4, exilio: -3, caida: -3 }[p.dignidad] * w, ns + ' ' + N_DIG[p.dignidad]);
      if (id !== 'sol' && id !== 'luna' && M.sep(p.lon, sol) <= 8.5 && M.sep(p.lon, sol) > 0.28) f(-5 * w, ns + ' combusto');
    });

    // 6. Modalidad del Ascendente
    if (acc.mod && S[c.signoAsc].mod === acc.mod) f(3, 'Ascendente en signo ' + acc.mod + ' (' + S[c.signoAsc].n + '), acorde al objetivo');
    if (acc.mod && S[L.signo].mod === acc.mod) f(3, 'Luna en signo ' + acc.mod + ', acorde al objetivo');
    if (acc.id === 'viaje' && S[c.signoAsc].mod === 'fijo') f(-3, 'Ascendente en signo fijo: poco propicio para viajar');
    if (acc.id === 'propuesta' && S[L.signo].mod === 'cardinal') f(-3, 'Luna en signo cardinal: poco propicia para lo que debe durar');

    // 7. Hora planetaria
    var hp = M.horaPlanetaria(date, lat, lon, cache);
    if (hp) {
      var afines = (acc.sig || []).concat(acc.sig && acc.sig.length ? [] : ['jupiter', 'venus', 'sol']);
      if (afines.indexOf(hp.regente) >= 0) f(3, 'Hora planetaria de ' + P[hp.regente].n);
    }

    // 8. Capa natal (desempate)
    if (natal) {
      var mcn = natal.diurna ? 'marte' : 'saturno';
      var pts = [['Sol', natal.pos.sol.lon], ['Luna', natal.pos.luna.lon], ['Ascendente', natal.asc], ['Medio Cielo', natal.mc]];
      pts.forEach(function (pt) {
        var a = M.aspectoEntre(pos[mcn].lon, pt[1], 3);
        if (a && a.asp.tipo !== 'armonico') f(a.asp.tipo === 'union' ? -6 : -3, P[mcn].n + ' del momento en ' + a.asp.n + ' con tu ' + pt[0] + ' natal');
        ['venus', 'jupiter'].forEach(function (b) {
          var x = M.aspectoEntre(pos[b].lon, pt[1], 3);
          if (x && x.asp.tipo !== 'tenso') f(4, P[b].n + ' del momento en ' + x.asp.n + ' con tu ' + pt[0] + ' natal');
        });
      });
      if (c.signoAsc === natal.signoDeCasa(10) || c.signoAsc === natal.pos.venus.signo || c.signoAsc === natal.pos.jupiter.signo)
        f(3, 'El Ascendente del momento cae en un signo fuerte de tu carta');
      var cl = natal.casaDe(L.lon);
      if (cl === 6 || cl === 8 || cl === 12) f(-2, 'La Luna transita tu casa ' + cl + ' natal');
    }

    var puntaje = Math.max(1, Math.min(99, Math.round(63 + suma)));
    F.sort(function (a, b) { return Math.abs(b.pts) - Math.abs(a.pts); });
    return { fecha: date, puntaje: puntaje, factores: F, carta: c, luna: el, hora: hp };
  }

  function etiqueta(p) {
    return p >= 75 ? 'Excelente' : p >= 62 ? 'Bueno' : p >= 45 ? 'Neutro' : p >= 30 ? 'Flojo' : 'Mejor evitar';
  }

  /** Puntajes cada `pasoMin` minutos entre dos instantes, filtrando por franja horaria local. */
  function escanear(o) {
    var paso = (o.pasoMin || 15) * 60000, out = [], cache = {}, acc = ACC[o.accion] || ACC.general, offC = {};
    for (var t = +o.desde; t <= +o.hasta; t += paso) {
      var k = Math.floor(t / DIA);
      if (offC[k] === undefined) offC[k] = o.zona ? M.desfaseZona(t, o.zona) : 0;
      var hl = (((t + offC[k]) % DIA) + DIA) % DIA / 3600000;
      if (o.horaMin !== undefined && (hl < o.horaMin || hl >= o.horaMax)) continue;
      var r = puntuar(new Date(t), o.lat, o.lon, acc, o.natal, cache);
      out.push({ t: t, p: r.puntaje });
    }
    return out;
  }
  /** Mejores ventanas a partir de las muestras. */
  function ventanas(muestras, pasoMin, n) {
    var paso = pasoMin * 60000, usados = {}, out = [];
    var idx = {}; muestras.forEach(function (m, i) { idx[m.t] = i; });
    muestras.slice().sort(function (a, b) { return b.p - a.p; }).forEach(function (m) {
      if (out.length >= n || usados[m.t]) return;
      var i = idx[m.t], a = i, b = i;
      while (a > 0 && muestras[a - 1].t === muestras[a].t - paso && muestras[a - 1].p >= m.p - 6) a--;
      while (b < muestras.length - 1 && muestras[b + 1].t === muestras[b].t + paso && muestras[b + 1].p >= m.p - 6) b++;
      for (var j = Math.max(0, a - 8); j <= Math.min(muestras.length - 1, b + 8); j++) usados[muestras[j].t] = 1;
      out.push({ inicio: new Date(muestras[a].t), fin: new Date(muestras[b].t + paso), pico: new Date(m.t), puntaje: m.p });
    });
    return out;
  }

  /* ---------- Pronóstico ---------- */
  function conCasa(natal, lista) {
    lista.forEach(function (e) {
      e.casa = natal.casaDe(e.lon);
      e.toca = [];
      [['Sol', natal.pos.sol.lon], ['Luna', natal.pos.luna.lon], ['Ascendente', natal.asc], ['Medio Cielo', natal.mc], ['Venus', natal.pos.venus.lon], ['Marte', natal.pos.marte.lon], ['Mercurio', natal.pos.mercurio.lon]].forEach(function (pt) {
        var a = M.aspectoEntre(e.lon, pt[1], 4);
        if (a && (a.asp.id === 'conj' || a.asp.id === 'opos')) e.toca.push({ punto: pt[0], asp: a.asp, orbe: a.orbe });
      });
    });
    return lista;
  }
  function anual(natal, nacimiento, desde) {
    var hasta = new Date(+desde + 365 * DIA), pr = M.profeccion(natal, nacimiento, desde), sen = natal.pos[pr.senor];
    return {
      desde: desde, hasta: hasta, profeccion: pr,
      senor: { id: pr.senor, signo: sen.signo, casa: sen.casa, dignidad: sen.dignidad, retro: sen.retro },
      planetasEnSigno: M.PLANETAS.filter(function (p) { return natal.pos[p.id].signo === pr.signo; }).map(function (p) { return p.id; }),
      transitos: M.transitos(natal, desde, hasta, M.LENTOS, 1),
      eclipses: conCasa(natal, M.eclipses(desde, hasta)),
      estaciones: M.estaciones(desde, hasta).filter(function (e) { return ['mercurio', 'venus', 'marte'].indexOf(e.planeta) >= 0; })
    };
  }
  function mensual(natal, desde, hasta) {
    return {
      desde: desde, hasta: hasta,
      lunaciones: conCasa(natal, M.lunaciones(desde, hasta)),
      rapidos: M.transitos(natal, desde, hasta, M.RAPIDOS, 1).filter(function (t) { return t.exactos.length; }),
      lentos: M.transitos(natal, desde, hasta, M.LENTOS, 1),
      estaciones: M.estaciones(desde, hasta)
    };
  }
  var PESO = { sol: 2, mercurio: 1.5, venus: 3, marte: 3, jupiter: 4, saturno: 4, urano: 3, neptuno: 2, pluton: 3 };
  function tonoTransito(t) {
    var mal = t.planeta === 'marte' || t.planeta === 'saturno' || t.planeta === 'pluton', ben = t.planeta === 'venus' || t.planeta === 'jupiter';
    var s = t.asp.tipo === 'armonico' ? 1 : t.asp.tipo === 'tenso' ? -1 : (ben ? 1 : mal ? -1 : 0.3);
    if (ben && s < 0) s = -0.3; if (mal && s > 0) s = 0.5;
    return s * PESO[t.planeta];
  }
  /** Siete días a partir de `desde` (inicio del día local, en UTC). */
  function semanal(natal, desde) {
    var hasta = new Date(+desde + 7 * DIA);
    var tr = M.transitos(natal, desde, hasta, M.RAPIDOS, 1).filter(function (t) { return t.exactos.length; });
    var lentos = M.transitos(natal, desde, hasta, M.LENTOS, 1), base = 0;
    lentos.forEach(function (t) { base += tonoTransito(t) * 0.4; });
    var dias = [];
    for (var i = 0; i < 7; i++) {
      var d0 = new Date(+desde + i * DIA), d1 = new Date(+d0 + DIA), medio = new Date(+d0 + DIA / 2);
      var pos = M.posiciones(medio, ['sol', 'luna', 'mercurio', 'venus', 'marte', 'jupiter', 'saturno']);
      var ev = [], tono = base;
      tr.forEach(function (t) { t.exactos.forEach(function (x) { if (x >= d0 && x < d1) { ev.push({ t: t, hora: x }); tono += tonoTransito(t); } }); });
      // la Luna del día sobre puntos natales
      var lunaToca = [];
      [['Sol', natal.pos.sol.lon], ['Luna', natal.pos.luna.lon], ['Ascendente', natal.asc], ['Medio Cielo', natal.mc], ['Venus', natal.pos.venus.lon], ['Júpiter', natal.pos.jupiter.lon], ['Marte', natal.pos.marte.lon], ['Saturno', natal.pos.saturno.lon]].forEach(function (pt) {
        if (M.sep(pos.luna.lon, pt[1]) <= 7) lunaToca.push(pt[0]);
      });
      if (lunaToca.indexOf('Venus') >= 0 || lunaToca.indexOf('Júpiter') >= 0) tono += 1.5;
      if (lunaToca.indexOf('Marte') >= 0 || lunaToca.indexOf('Saturno') >= 0) tono -= 1.5;
      var el = M.estadoLuna(pos);
      dias.push({ fecha: d0, lunaSigno: M.signoDe(pos.luna.lon), lunaCasa: natal.casaDe(pos.luna.lon), fase: el.fase, eventos: ev, lunaToca: lunaToca, tono: tono });
    }
    return { desde: desde, hasta: hasta, dias: dias, lentos: lentos };
  }

  /* ---------- Clima por áreas de vida: de qué "es" un día, una semana o un mes ---------- */
  var PT_CASA = { venus: 7, luna: 4, sol: 1, mercurio: 3, marte: 6, jupiter: 9, saturno: 10, asc: 1, mc: 10 };
  // Leo: en tránsito pesan Saturno y Júpiter; Venus y Mercurio apenas, salvo que rijan la carta o el año; Marte, sobre todo en los ángulos
  var W_CASA = { sol: [2, 1], mercurio: [1, 0.4], venus: [1.8, 1.5], marte: [2, -0.7], jupiter: [2.2, 2.5], saturno: [1.8, -1.2] };
  /* Cada período mira su propia escala: el día, la Luna y lo exacto de hoy; la semana, los planetas rápidos;
     el mes, las lunaciones y por dónde andan Sol, Venus y Marte. Lo lento (meses) queda como fondo. */
  var ESCALA = {
    dia: { casas: 0.25, rapido: 2.2, lento: 0.12, lunacion: 0 },
    semana: { casas: 0.55, rapido: 1.6, lento: 0.22, lunacion: 4 },
    mes: { casas: 1, rapido: 0.7, lento: 0.5, lunacion: 3.5 }
  };
  function clima(natal, desde, hasta, conLuna) {
    var A = [], i, dur = (hasta - desde) / DIA, E = ESCALA[dur <= 1.5 ? 'dia' : dur <= 10 ? 'semana' : 'mes'];
    for (i = 0; i <= 12; i++) A.push({ casa: i, foco: 0, tono: 0, motivos: [] });
    function add(casa, foco, tono, txt) { var a = A[casa]; a.foco += foco; a.tono += tono; a.motivos.push({ txt: txt, tono: tono, foco: foco }); }
    var medio = new Date((+desde + +hasta) / 2), pos = M.posiciones(medio, ['sol', 'luna', 'mercurio', 'venus', 'marte', 'jupiter', 'saturno']);
    // planetas que mandan en esta carta este año: el regente del Ascendente y el señor del año (Ptolomeo, Leo)
    var senor = M.profeccion(natal, natal.fecha, desde).senor;
    function manda(id) { return id === senor || id === natal.regenteAsc ? 1.6 : 1; }
    // Leo: un planeta tocado actúa por la casa natal que ocupa, además de su tema natural
    function casasDe(punto) { var nat = punto === 'asc' ? 1 : punto === 'mc' ? 10 : natal.pos[punto].casa, tema = PT_CASA[punto]; return nat === tema ? [[nat, 1]] : [[nat, 0.6], [tema, 0.4]]; }
    Object.keys(W_CASA).forEach(function (id) {
      var c = natal.casaDe(pos[id].lon), w = W_CASA[id], lento = id === 'jupiter' || id === 'saturno', k = E.casas * (lento && E !== ESCALA.mes ? 0.5 : 1) * manda(id);
      if (id === 'marte' && !esAng(c)) k *= 0.5;
      add(c, w[0] * k, (pos[id].retro && w[1] > 0 ? w[1] / 2 : w[1]) * k, P[id].n + (pos[id].retro ? ' retrógrado' : '') + ' transita tu casa ' + c + ' (' + S[M.signoDe(pos[id].lon)].n + ')');
    });
    var lunaCasa = null;
    if (conLuna) {
      lunaCasa = natal.casaDe(pos.luna.lon);
      add(lunaCasa, 4, 0.6, 'La Luna pasa hoy por tu casa ' + lunaCasa + ' (' + S[M.signoDe(pos.luna.lon)].n + ')');
      puntosNat(natal).forEach(function (pt) {
        var a = M.aspectoEntre(pos.luna.lon, pt.lon, 6); if (!a || a.asp.id === 'sext') return;
        var ben = pt.id === 'venus' || pt.id === 'jupiter', mal = pt.id === 'marte' || pt.id === 'saturno';
        var t = a.asp.tipo === 'armonico' ? 1 : a.asp.tipo === 'tenso' ? (ben ? -0.3 : -1) : (ben ? 1.2 : mal ? -1 : 0.5);
        casasDe(pt.id).forEach(function (x) { add(x[0], 2.2 * x[1], t * x[1], 'La Luna de hoy en ' + a.asp.n + ' con tu ' + pt.n + ' natal'); });
      });
    }
    M.transitos(natal, desde, hasta, M.RAPIDOS.concat(M.LENTOS), 1).forEach(function (t) {
      var lento = M.LENTOS.indexOf(t.planeta) >= 0;
      if (!lento && !t.exactos.length) return;
      var clave = t.punto === 'sol' || t.punto === 'luna' || t.punto === 'asc' || t.punto === 'mc';
      var k = (lento ? E.lento : E.rapido) * manda(t.planeta) * (t.punto === senor ? 1.6 : 1);
      if ((t.planeta === 'saturno' || t.planeta === 'jupiter') && clave) k *= 2;      // lo que Leo considera decisivo
      if (t.planeta === 'marte' && !clave) k *= 0.5;
      if ((t.planeta === 'venus' || t.planeta === 'mercurio') && manda(t.planeta) === 1) k *= 0.6;
      casasDe(t.punto).forEach(function (x) { add(x[0], PESO[t.planeta] * k * x[1], tonoTransito(t) * k * x[1], P[t.planeta].n + ' en ' + t.asp.n + ' con tu ' + t.nPunto + ' natal' + (lento ? ' (proceso de fondo)' : '')); });
    });
    if (E.lunacion) conCasa(natal, M.lunaciones(desde, hasta)).forEach(function (e) {
      var toca = e.toca.length ? 1.5 : 0.7; // la lunación dispara un tema; pesa de verdad si toca un punto de la carta
      add(e.casa, E.lunacion * toca, e.tipo.indexOf('nueva') >= 0 ? 1 : 0.5, e.tipo + ' en tu casa ' + e.casa + ' (' + M.fmtLon(e.lon) + ')' + (e.toca.length ? ', sobre tu ' + e.toca[0].punto + ' natal' : ''));
    });
    var areas = A.slice(1), total = 0;
    areas.forEach(function (a) { total += a.tono; a.motivos.sort(function (x, y) { return y.foco - x.foco; }); });
    var porFoco = areas.slice().sort(function (a, b) { return b.foco - a.foco; });
    var porTono = areas.slice().sort(function (a, b) { return b.tono - a.tono; });
    return { areas: porFoco, top: porFoco[0], mejor: porTono[0].tono > 1 ? porTono[0] : null, cuidado: porTono[11].tono < -1 ? porTono[11] : null, tono: total, lunaCasa: lunaCasa };
  }
  function puntosNat(natal) {
    var o = ['sol', 'luna', 'mercurio', 'venus', 'marte', 'jupiter', 'saturno'].map(function (id) { return { id: id, n: P[id].n, lon: natal.pos[id].lon }; });
    o.push({ id: 'asc', n: 'Ascendente', lon: natal.asc }, { id: 'mc', n: 'Medio Cielo', lon: natal.mc });
    return o;
  }

  return { clima: clima, ACCIONES: ACCIONES, ACC: ACC, puntuar: puntuar, etiqueta: etiqueta, escanear: escanear, ventanas: ventanas, anual: anual, mensual: mensual, semanal: semanal, tonoTransito: tonoTransito };
});
