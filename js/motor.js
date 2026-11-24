/* Motor de cálculo: posiciones planetarias, ángulos, casas, aspectos, dignidades,
   Luna, horas planetarias, tránsitos, lunaciones, eclipses y profecciones.
   Usa astronomy-engine (MIT). Zodíaco tropical, casas de signo entero. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/astronomy.browser.min.js'));
  else root.Motor = factory(root.Astronomy);
})(this, function (A) {
  'use strict';
  var RAD = Math.PI / 180, DIA = 86400000;

  var PLANETAS = [
    { id: 'sol', n: 'Sol', g: '☉', body: 'Sun' },
    { id: 'luna', n: 'Luna', g: '☽', body: 'Moon' },
    { id: 'mercurio', n: 'Mercurio', g: '☿', body: 'Mercury' },
    { id: 'venus', n: 'Venus', g: '♀', body: 'Venus' },
    { id: 'marte', n: 'Marte', g: '♂', body: 'Mars' },
    { id: 'jupiter', n: 'Júpiter', g: '♃', body: 'Jupiter' },
    { id: 'saturno', n: 'Saturno', g: '♄', body: 'Saturn' },
    { id: 'urano', n: 'Urano', g: '♅', body: 'Uranus' },
    { id: 'neptuno', n: 'Neptuno', g: '♆', body: 'Neptune' },
    { id: 'pluton', n: 'Plutón', g: '♇', body: 'Pluto' }
  ];
  var P = {}; PLANETAS.forEach(function (p) { P[p.id] = p; });
  var CLASICOS = ['sol', 'luna', 'mercurio', 'venus', 'marte', 'jupiter', 'saturno'];
  var LENTOS = ['jupiter', 'saturno', 'urano', 'neptuno', 'pluton'];
  var RAPIDOS = ['sol', 'mercurio', 'venus', 'marte'];

  var SIGNOS = [
    { n: 'Aries', g: '♈', el: 'fuego', mod: 'cardinal', reg: 'marte' },
    { n: 'Tauro', g: '♉', el: 'tierra', mod: 'fijo', reg: 'venus' },
    { n: 'Géminis', g: '♊', el: 'aire', mod: 'mutable', reg: 'mercurio' },
    { n: 'Cáncer', g: '♋', el: 'agua', mod: 'cardinal', reg: 'luna' },
    { n: 'Leo', g: '♌', el: 'fuego', mod: 'fijo', reg: 'sol' },
    { n: 'Virgo', g: '♍', el: 'tierra', mod: 'mutable', reg: 'mercurio' },
    { n: 'Libra', g: '♎', el: 'aire', mod: 'cardinal', reg: 'venus' },
    { n: 'Escorpio', g: '♏', el: 'agua', mod: 'fijo', reg: 'marte' },
    { n: 'Sagitario', g: '♐', el: 'fuego', mod: 'mutable', reg: 'jupiter' },
    { n: 'Capricornio', g: '♑', el: 'tierra', mod: 'cardinal', reg: 'saturno' },
    { n: 'Acuario', g: '♒', el: 'aire', mod: 'fijo', reg: 'saturno' },
    { n: 'Piscis', g: '♓', el: 'agua', mod: 'mutable', reg: 'jupiter' }
  ];
  var EXALT = { sol: 0, luna: 1, mercurio: 5, venus: 11, marte: 9, jupiter: 3, saturno: 6 };

  var ASPECTOS = [
    { id: 'conj', n: 'conjunción', g: '☌', a: 0, tipo: 'union' },
    { id: 'sext', n: 'sextil', g: '⚹', a: 60, tipo: 'armonico' },
    { id: 'cuad', n: 'cuadratura', g: '□', a: 90, tipo: 'tenso' },
    { id: 'trig', n: 'trígono', g: '△', a: 120, tipo: 'armonico' },
    { id: 'opos', n: 'oposición', g: '☍', a: 180, tipo: 'tenso' }
  ];

  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function dif(a, b) { return ((a - b + 540) % 360 + 360) % 360 - 180; } // a-b con signo, en (-180,180]
  function sep(a, b) { return Math.abs(dif(a, b)); }
  function signoDe(lon) { return Math.floor(norm(lon) / 30); }
  function gradoEnSigno(lon) { return norm(lon) % 30; }
  function fmtLon(lon) {
    lon = norm(lon);
    var s = Math.floor(lon / 30), g = lon - s * 30, d = Math.floor(g), m = Math.floor((g - d) * 60);
    return d + '°' + (m < 10 ? '0' : '') + m + '′ ' + SIGNOS[s].n;
  }

  function lonDe(body, time, rot) {
    if (body === 'Sun') return A.SunPosition(time).elon;
    if (body === 'Moon') return A.EclipticGeoMoon(time).lon;
    var v = A.GeoVector(body, time, true);
    return A.SphereFromVector(A.RotateVector(rot || A.Rotation_EQJ_ECT(time), v)).lon;
  }
  function nodoMedio(time) {
    var T = time.tt / 36525;
    return norm(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000);
  }

  /** Posiciones eclípticas (zodíaco tropical, de fecha) con velocidad en °/día. */
  function posiciones(date, ids) {
    var t = A.MakeTime(date), dt = 1 / 24, t2 = t.AddDays(dt);
    var r1 = A.Rotation_EQJ_ECT(t), r2 = A.Rotation_EQJ_ECT(t2), out = {};
    (ids || PLANETAS.map(function (p) { return p.id; })).forEach(function (id) {
      var b = P[id].body, l = lonDe(b, t, r1), v = dif(lonDe(b, t2, r2), l) / dt;
      out[id] = { lon: l, vel: v, retro: v < 0 };
    });
    if (!ids) out.nodo = { lon: nodoMedio(t), vel: -0.053, retro: true };
    return out;
  }

  function angulos(date, lat, lon) {
    var t = A.MakeTime(date), T = t.tt / 36525;
    var eps = (23.4392911 - 0.0130042 * T) * RAD;
    var ramc = norm(A.SiderealTime(t) * 15 + lon) * RAD;
    var mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / RAD);
    var asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * RAD) * Math.sin(eps))) / RAD);
    if (norm(asc - mc) > 180) asc = norm(asc + 180);
    return { asc: asc, mc: mc };
  }

  function dignidad(id, signo) {
    if (CLASICOS.indexOf(id) < 0) return null;
    if (SIGNOS[signo].reg === id) return 'domicilio';
    if (EXALT[id] === signo) return 'exaltacion';
    if (SIGNOS[(signo + 6) % 12].reg === id) return 'exilio';
    if (EXALT[id] === (signo + 6) % 12) return 'caida';
    return null;
  }

  /** Carta completa de un instante y lugar. */
  function carta(date, lat, lon) {
    var pos = posiciones(date), ang = angulos(date, lat, lon);
    var sAsc = signoDe(ang.asc);
    var c = { fecha: date, lat: lat, lon: lon, pos: pos, asc: ang.asc, mc: ang.mc, signoAsc: sAsc };
    c.casaDe = function (l) { return ((signoDe(l) - sAsc + 12) % 12) + 1; };
    c.signoDeCasa = function (n) { return (sAsc + n - 1) % 12; };
    c.regenteCasa = function (n) { return SIGNOS[c.signoDeCasa(n)].reg; };
    c.diurna = norm(pos.sol.lon - ang.asc) > 180;
    c.fortuna = c.diurna ? norm(ang.asc + pos.luna.lon - pos.sol.lon) : norm(ang.asc + pos.sol.lon - pos.luna.lon);
    c.regenteAsc = SIGNOS[sAsc].reg;
    Object.keys(pos).forEach(function (id) {
      pos[id].signo = signoDe(pos[id].lon);
      pos[id].casa = c.casaDe(pos[id].lon);
      pos[id].dignidad = dignidad(id, pos[id].signo);
    });
    return c;
  }

  function aspectoEntre(l1, l2, orbe) {
    var d = sep(l1, l2), mejor = null;
    ASPECTOS.forEach(function (a) {
      var o = Math.abs(d - a.a);
      if (o <= orbe && (!mejor || o < mejor.orbe)) mejor = { asp: a, orbe: o };
    });
    return mejor;
  }
  /** ¿El aspecto entre a y b se está cerrando? (a y b: {lon, vel}) */
  function aplicativo(a, b, ang) {
    var ahora = Math.abs(sep(a.lon, b.lon) - ang);
    var luego = Math.abs(sep(a.lon + a.vel * 0.05, b.lon + (b.vel || 0) * 0.05) - ang);
    return luego < ahora;
  }

  function aspectosNatales(c) {
    var pts = PLANETAS.map(function (p) { return { id: p.id, n: p.n, lon: c.pos[p.id].lon, vel: c.pos[p.id].vel }; });
    pts.push({ id: 'asc', n: 'Ascendente', lon: c.asc, vel: 0, ang: true }, { id: 'mc', n: 'Medio Cielo', lon: c.mc, vel: 0, ang: true });
    var out = [];
    for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
      var a = pts[i], b = pts[j];
      if (a.ang && b.ang) continue;
      var lum = a.id === 'sol' || a.id === 'luna' || b.id === 'sol' || b.id === 'luna';
      var r = aspectoEntre(a.lon, b.lon, lum ? 8 : 6);
      if (!r) continue;
      if (r.asp.id === 'sext' && r.orbe > 4) continue;
      if ((a.ang || b.ang) && r.orbe > 5) continue;
      out.push({ a: a.id, b: b.id, na: a.n, nb: b.n, asp: r.asp, orbe: r.orbe });
    }
    return out.sort(function (x, y) { return x.orbe - y.orbe; });
  }

  /** Hora local de una zona IANA -> instante UTC (respeta husos históricos). */
  function desfaseZona(ms, zona) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    var o = {}; f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
    return Date.UTC(o.year, o.month - 1, o.day, o.hour % 24, o.minute, o.second) - ms;
  }
  function localAUTC(y, m, d, h, mi, zona) {
    var g = Date.UTC(y, m - 1, d, h, mi, 0);
    var u = g - desfaseZona(g, zona);
    u = g - desfaseZona(u, zona);
    return new Date(u);
  }

  /* ---------- Luna ---------- */
  var ANG_LUNA = [0, 60, 90, 120, 180, 240, 270, 300];
  function aspDeAngulo(a) { a = a > 180 ? 360 - a : a; return ASPECTOS.filter(function (x) { return x.a === a; })[0]; }
  /** Próximos aspectos que la Luna perfecciona con los planetas clásicos, ordenados por recorrido lunar. */
  function proximosAspectosLuna(pos) {
    var L = pos.luna, out = [];
    ['sol', 'mercurio', 'venus', 'marte', 'jupiter', 'saturno'].forEach(function (id) {
      var p = pos[id], d = norm(L.lon - p.lon), rel = L.vel - p.vel;
      ANG_LUNA.forEach(function (a) {
        var g = norm(a - d);
        if (g < 0.02) return;
        out.push({ planeta: id, asp: aspDeAngulo(a), recorrido: g * L.vel / rel, dias: g / rel });
      });
    });
    return out.sort(function (x, y) { return x.recorrido - y.recorrido; });
  }
  function estadoLuna(pos) {
    var L = pos.luna, prox = proximosAspectosLuna(pos), resto = 30 - gradoEnSigno(L.lon);
    var enSigno = prox.filter(function (x) { return x.recorrido < resto; });
    var elong = norm(L.lon - pos.sol.lon);
    var fases = ['Luna nueva', 'Creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Menguante'];
    return {
      proximo: prox[0] && prox[0].recorrido <= 13 ? prox[0] : null,
      vacia: enSigno.length === 0,
      horasACambioSigno: resto / L.vel * 24,
      elongacion: elong, creciente: elong < 180,
      fase: fases[Math.floor(norm(elong + 22.5) / 45)],
      iluminacion: (1 - Math.cos(elong * RAD)) / 2,
      distSol: sep(L.lon, pos.sol.lon),
      viaCombusta: L.lon >= 195 && L.lon <= 225
    };
  }

  /* ---------- Horas planetarias ---------- */
  var CALDEO = ['saturno', 'jupiter', 'marte', 'sol', 'venus', 'mercurio', 'luna'];
  var REG_DIA = ['sol', 'luna', 'marte', 'mercurio', 'jupiter', 'venus', 'saturno'];
  function tramoSolar(date, lat, lon) {
    var obs = new A.Observer(lat, lon, 0);
    var r = A.SearchRiseSet('Sun', obs, +1, A.MakeTime(new Date(date.getTime() - 26 * 3600000)), 2);
    if (!r) return null;
    var r2 = A.SearchRiseSet('Sun', obs, +1, r.AddDays(0.01), 2);
    while (r2 && r2.date <= date) { r = r2; r2 = A.SearchRiseSet('Sun', obs, +1, r.AddDays(0.01), 2); }
    if (!r2 || r.date > date) return null;
    var s = A.SearchRiseSet('Sun', obs, -1, r, 2);
    if (!s) return null;
    return { orto: r.date, ocaso: s.date, ortoSig: r2.date, lon: lon };
  }
  function horaPlanetaria(date, lat, lon, cache) {
    var tr = cache && cache.tr && date >= cache.tr.orto && date < cache.tr.ortoSig ? cache.tr : tramoSolar(date, lat, lon);
    if (cache) cache.tr = tr;
    if (!tr) return null;
    var idx, ini, fin, largo;
    if (date < tr.ocaso) { largo = (tr.ocaso - tr.orto) / 12; idx = Math.floor((date - tr.orto) / largo); ini = +tr.orto + idx * largo; }
    else { largo = (tr.ortoSig - tr.ocaso) / 12; var k = Math.floor((date - tr.ocaso) / largo); idx = 12 + k; ini = +tr.ocaso + k * largo; }
    fin = ini + largo;
    var regDia = REG_DIA[new Date(tr.orto.getTime() + lon / 15 * 3600000).getUTCDay()];
    return { regente: CALDEO[(CALDEO.indexOf(regDia) + idx) % 7], regenteDia: regDia, inicio: new Date(ini), fin: new Date(fin), diurna: idx < 12 };
  }

  /* ---------- Eventos en un rango ---------- */
  function puntosNatales(c, ids) {
    var out = (ids || ['sol', 'luna', 'mercurio', 'venus', 'marte', 'jupiter', 'saturno']).map(function (id) { return { id: id, n: P[id].n, lon: c.pos[id].lon }; });
    out.push({ id: 'asc', n: 'Ascendente', lon: c.asc }, { id: 'mc', n: 'Medio Cielo', lon: c.mc });
    return out;
  }
  function biseccion(f, a, b) { // a,b en ms; f cambia de signo
    var fa = f(a);
    for (var i = 0; i < 22; i++) { var m = (a + b) / 2, fm = f(m); if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m; }
    return new Date((a + b) / 2);
  }
  /** Tránsitos de `planetas` a los puntos natales entre dos fechas. */
  function transitos(natal, desde, hasta, planetas, orbe) {
    orbe = orbe || 1;
    var dias = Math.ceil((hasta - desde) / DIA) + 1, muestras = [], i;
    for (i = 0; i <= dias; i++) muestras.push(posiciones(new Date(+desde + i * DIA), planetas));
    var pts = puntosNatales(natal), out = [];
    planetas.forEach(function (pl) {
      pts.forEach(function (pt) {
        if (pt.id === pl) { /* retorno: solo conjunción */ }
        ANG_LUNA.forEach(function (ang) {
          if (pt.id === pl && ang !== 0) return;
          var obj = norm(pt.lon + ang), exactos = [], ini = null, fin = null, minO = 999;
          for (i = 0; i <= dias; i++) {
            var f = dif(muestras[i][pl].lon, obj), af = Math.abs(f);
            if (af <= orbe) { if (ini === null) ini = i; fin = i; }
            if (af < minO) minO = af;
            if (i > 0) {
              var f0 = dif(muestras[i - 1][pl].lon, obj);
              if ((f0 < 0) !== (f < 0) && Math.abs(f0) < 20 && af < 20) {
                exactos.push(biseccion(function (ms) { return dif(lonDe(P[pl].body, A.MakeTime(new Date(ms))), obj); }, +desde + (i - 1) * DIA, +desde + i * DIA));
              }
            }
          }
          if (ini === null) return;
          out.push({
            planeta: pl, punto: pt.id, nPunto: pt.n, asp: aspDeAngulo(ang), exactos: exactos, orbeMin: minO,
            desde: new Date(+desde + ini * DIA), hasta: new Date(+desde + fin * DIA),
            abiertoIni: ini === 0, abiertoFin: fin === dias
          });
        });
      });
    });
    // un mismo aspecto puede aparecer por los dos ángulos (p. ej. 60 y 300): quedan como entradas separadas, es correcto
    return out.sort(function (a, b) { return (a.exactos[0] || a.desde) - (b.exactos[0] || b.desde); });
  }

  function lunaciones(desde, hasta) {
    var out = [];
    [[0, 'Luna nueva'], [180, 'Luna llena']].forEach(function (f) {
      var t = A.MakeTime(new Date(+desde - DIA));
      for (;;) {
        var r = A.SearchMoonPhase(f[0], t, 40);
        if (!r || r.date > hasta) break;
        if (r.date >= desde) out.push({ tipo: f[1], fecha: r.date, lon: lonDe('Moon', r) });
        t = r.AddDays(1);
      }
    });
    return out.sort(function (a, b) { return a.fecha - b.fecha; });
  }
  function eclipses(desde, hasta) {
    var out = [], t = A.MakeTime(new Date(+desde - DIA));
    var nom = { total: 'total', partial: 'parcial', annular: 'anular', penumbral: 'penumbral' };
    var e = A.SearchLunarEclipse(t);
    while (e.peak.date <= hasta) {
      if (e.peak.date >= desde) out.push({ tipo: 'Eclipse lunar ' + (nom[e.kind] || e.kind), fecha: e.peak.date, lon: lonDe('Moon', e.peak) });
      e = A.NextLunarEclipse(e.peak);
    }
    e = A.SearchGlobalSolarEclipse(t);
    while (e.peak.date <= hasta) {
      if (e.peak.date >= desde) out.push({ tipo: 'Eclipse solar ' + (nom[e.kind] || e.kind), fecha: e.peak.date, lon: lonDe('Sun', e.peak) });
      e = A.NextGlobalSolarEclipse(e.peak);
    }
    return out.sort(function (a, b) { return a.fecha - b.fecha; });
  }
  /** Cambios de dirección (estaciones) entre dos fechas. */
  function estaciones(desde, hasta) {
    var ids = ['mercurio', 'venus', 'marte', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton'], out = [];
    var dias = Math.ceil((hasta - desde) / DIA), prev = posiciones(desde, ids);
    for (var i = 1; i <= dias; i++) {
      var d = new Date(+desde + i * DIA), cur = posiciones(d, ids);
      ids.forEach(function (id) {
        if (prev[id].retro !== cur[id].retro) out.push({ planeta: id, fecha: d, retro: cur[id].retro, lon: cur[id].lon });
      });
      prev = cur;
    }
    return out;
  }

  /** Profección anual (signo entero): casa, signo y señor del año. */
  function profeccion(natal, nacimiento, fecha) {
    var edad = fecha.getUTCFullYear() - nacimiento.getUTCFullYear();
    var cumple = new Date(nacimiento); cumple.setUTCFullYear(fecha.getUTCFullYear());
    if (fecha < cumple) { edad--; cumple.setUTCFullYear(fecha.getUTCFullYear() - 1); }
    var fin = new Date(cumple); fin.setUTCFullYear(cumple.getUTCFullYear() + 1);
    var signo = (natal.signoAsc + edad) % 12;
    return { edad: edad, casa: (edad % 12) + 1, signo: signo, senor: SIGNOS[signo].reg, desde: cumple, hasta: fin };
  }

  return {
    PLANETAS: PLANETAS, P: P, SIGNOS: SIGNOS, ASPECTOS: ASPECTOS, CLASICOS: CLASICOS, LENTOS: LENTOS, RAPIDOS: RAPIDOS,
    norm: norm, dif: dif, sep: sep, signoDe: signoDe, gradoEnSigno: gradoEnSigno, fmtLon: fmtLon,
    posiciones: posiciones, angulos: angulos, carta: carta, dignidad: dignidad,
    aspectoEntre: aspectoEntre, aplicativo: aplicativo, aspectosNatales: aspectosNatales,
    localAUTC: localAUTC, desfaseZona: desfaseZona,
    proximosAspectosLuna: proximosAspectosLuna, estadoLuna: estadoLuna,
    horaPlanetaria: horaPlanetaria, tramoSolar: tramoSolar,
    transitos: transitos, lunaciones: lunaciones, eclipses: eclipses, estaciones: estaciones, profeccion: profeccion
  };
});
