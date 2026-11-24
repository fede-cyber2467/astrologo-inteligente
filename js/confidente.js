/* Confidente: chat con Claude que consulta el motor de cálculo mediante herramientas.
   La clave de API se guarda solo en este navegador y viaja únicamente a api.anthropic.com. */
(function () {
  'use strict';
  var M = Motor, R = Reglas, T = Textos, P = M.P, S = M.SIGNOS, A = window.App, DIA = 86400000;
  var $ = function (s) { return document.querySelector(s); };
  var MODELO = 'claude-opus-5-5';
  var hilos = {}; // historial por carta, solo en memoria

  var HERRAMIENTAS = [
    { name: 'buscar_momentos', description: 'Busca las mejores ventanas de tiempo para iniciar una acción en el lugar donde vive la persona, con puntaje de 1 a 99 y los factores astrológicos que lo explican. Usala siempre que pregunten cuándo conviene hacer algo. Máximo 62 días por búsqueda.',
      input_schema: { type: 'object', properties: {
        accion: { type: 'string', enum: R.ACCIONES.map(function (a) { return a.id; }), description: R.ACCIONES.map(function (a) { return a.id + ': ' + a.n; }).join('; ') },
        desde: { type: 'string', description: 'Fecha local inicial, AAAA-MM-DD' }, hasta: { type: 'string', description: 'Fecha local final inclusive, AAAA-MM-DD' },
        hora_min: { type: 'integer', description: 'Hora local mínima (0-23). Por defecto 8.' }, hora_max: { type: 'integer', description: 'Hora local máxima (1-24). Por defecto 22.' }
      }, required: ['accion', 'desde', 'hasta'] } },
    { name: 'evaluar_momento', description: 'Evalúa un instante puntual para una acción: puntaje, factores, Ascendente, estado de la Luna y hora planetaria.',
      input_schema: { type: 'object', properties: { accion: { type: 'string', enum: R.ACCIONES.map(function (a) { return a.id; }) }, fecha_hora: { type: 'string', description: 'Fecha y hora local, AAAA-MM-DDTHH:MM' } }, required: ['accion', 'fecha_hora'] } },
    { name: 'pronostico', description: 'Devuelve los datos calculados del pronóstico personal: "anio" (profección, señor del año, tránsitos lentos de 12 meses, eclipses, retrogradaciones), "mes" (lunaciones, tránsitos rápidos y lentos, estaciones de los 31 días siguientes) o "semana" (7 días, tono diario y tránsitos exactos).',
      input_schema: { type: 'object', properties: { periodo: { type: 'string', enum: ['anio', 'mes', 'semana'] }, desde: { type: 'string', description: 'Fecha local de inicio AAAA-MM-DD. Por defecto hoy.' } }, required: ['periodo'] } },
    { name: 'cielo', description: 'Posiciones exactas de los planetas (zodíaco tropical) para una fecha y hora local, con la casa natal de la persona que transita cada uno.',
      input_schema: { type: 'object', properties: { fecha_hora: { type: 'string', description: 'AAAA-MM-DDTHH:MM' } }, required: ['fecha_hora'] } }
  ];

  var HERR_BIBLIOTECA = { name: 'consultar_biblioteca', description: 'Busca pasajes en la biblioteca de textos clásicos de astrología (obras originales en dominio público, en inglés). Úsala cuando citar la tradición le dé peso o precisión a la respuesta: qué dice un autor sobre una configuración, una regla para elegir momentos, el sentido de un planeta en una casa. No la uses en cada mensaje ni para preguntas simples. La consulta va en inglés, con los términos astrológicos clave.',
    input_schema: { type: 'object', properties: { consulta: { type: 'string', description: 'Palabras clave en inglés, por ejemplo: "Moon void of course election journey" o "Saturn in the seventh house marriage".' }, autor: { type: 'string', description: 'Opcional: apellido del autor para limitar la búsqueda (por ejemplo "Lilly").' } }, required: ['consulta'] } };
  function herramientas() { return window.Biblioteca && Biblioteca.disponible() ? HERRAMIENTAS.concat([HERR_BIBLIOTECA]) : HERRAMIENTAS; }

  function aFecha(s) { var p = String(s).split('T'), hm = (p[1] || '12:00').split(':'); return A.deYmd(p[0], +hm[0] || 0, +hm[1] || 0); }
  function facs(F, n) { return F.slice(0, n).map(function (f) { return (f.pts > 0 ? '+' : '') + f.pts + ' ' + f.txt; }); }
  function resumenMomento(r) {
    return { puntaje: r.puntaje, etiqueta: R.etiqueta(r.puntaje), ascendente: M.fmtLon(r.carta.asc), luna: M.fmtLon(r.carta.pos.luna.lon) + ', ' + r.luna.fase + (r.luna.vacia ? ', vacía de curso' : ''),
      hora_planetaria: r.hora ? P[r.hora.regente].n : null, carta: r.carta.diurna ? 'diurna' : 'nocturna', factores: facs(r.factores, 9) };
  }
  function trTxt(t) { return (t.abiertoIni ? 'ya activo' : A.fConAnio(t.desde)) + ' a ' + (t.abiertoFin ? 'sigue' : A.fConAnio(t.hasta)) + (t.exactos.length ? ' (exacto ' + t.exactos.map(A.fConAnio).join(', ') + ')' : '') + ': ' + P[t.planeta].n + ' ' + t.asp.n + ' ' + t.nPunto + ' natal'; }
  function lunTxt(e) { return A.fDiaHora(e.fecha) + ': ' + e.tipo + ' en ' + M.fmtLon(e.lon) + ', casa natal ' + e.casa + (e.toca.length ? ', toca ' + e.toca.map(function (x) { return x.punto + ' (' + x.asp.n + ')'; }).join(', ') : ''); }

  function ejecutar(nombre, inp) {
    var e = A.est, l = A.lugar();
    if (nombre === 'buscar_momentos') {
      var d0 = A.deYmd(inp.desde), d1 = new Date(+A.deYmd(inp.hasta) + DIA);
      if (!(d1 > d0)) throw new Error('Rango de fechas inválido');
      if (d1 - d0 > 62 * DIA) d1 = new Date(+d0 + 62 * DIA);
      var paso = d1 - d0 > 21 * DIA ? 30 : 15;
      var ms = R.escanear({ desde: d0, hasta: new Date(+d1 - 1), lat: l.lat, lon: l.lon, accion: inp.accion, natal: e.natal, pasoMin: paso, zona: l.zona, horaMin: inp.hora_min === undefined ? 8 : inp.hora_min, horaMax: inp.hora_max === undefined ? 22 : inp.hora_max });
      if (!ms.length) throw new Error('No hay momentos en esa franja');
      var ps = ms.map(function (m) { return m.p; }).sort(function (a, b) { return a - b; });
      return { lugar: l.nombre, evaluado_hasta: A.ymd(new Date(+d1 - 1)), puntaje_mediano_del_periodo: ps[Math.floor(ps.length / 2)],
        ventanas: R.ventanas(ms, paso, 5).map(function (v) {
          var r = resumenMomento(R.puntuar(v.pico, l.lat, l.lon, R.ACC[inp.accion], e.natal, {}));
          r.dia = A.fDia(v.inicio); r.desde = A.fHora(v.inicio); r.hasta = A.fHora(v.fin); r.pico = A.fHora(v.pico); return r;
        }) };
    }
    if (nombre === 'evaluar_momento') return resumenMomento(R.puntuar(aFecha(inp.fecha_hora), l.lat, l.lon, R.ACC[inp.accion] || R.ACC.general, e.natal, {}));
    if (nombre === 'cielo') {
      var c = M.carta(aFecha(inp.fecha_hora), l.lat, l.lon), o = {};
      M.PLANETAS.forEach(function (p) { o[p.n] = M.fmtLon(c.pos[p.id].lon) + (c.pos[p.id].retro ? ' R' : '') + ', casa natal ' + e.natal.casaDe(c.pos[p.id].lon); });
      o['Nodo Norte'] = M.fmtLon(c.pos.nodo.lon); o.Ascendente_del_momento = M.fmtLon(c.asc);
      return o;
    }
    if (nombre === 'pronostico') {
      var d = inp.desde ? A.deYmd(inp.desde) : A.inicioDia(new Date());
      if (inp.periodo === 'anio') {
        var a = R.anual(e.natal, e.nac, d);
        return { periodo_cubierto: 'Desde hoy, ' + A.fConAnio(a.desde) + ', hasta ' + A.fConAnio(a.hasta) + '. No es el año calendario: son los próximos 12 meses.', anio_de_cumpleanos_vigente: 'del ' + A.fConAnio(a.profeccion.desde) + ' al ' + A.fConAnio(a.profeccion.hasta), profeccion: T.fraseProfeccion(a), transitos_lentos: a.transitos.map(trTxt), eclipses: a.eclipses.map(lunTxt), estaciones: a.estaciones.map(function (x) { return A.fConAnio(x.fecha) + ': ' + P[x.planeta].n + (x.retro ? ' retrógrado' : ' directo') + ' en ' + M.fmtLon(x.lon); }) };
      }
      if (inp.periodo === 'mes') {
        var m = R.mensual(e.natal, d, new Date(+d + 31 * DIA));
        return { periodo_cubierto: 'Desde ' + A.fConAnio(d) + ' hasta ' + A.fConAnio(new Date(+d + 31 * DIA)), tema_destacado: T.textoClima(R.clima(e.natal, d, new Date(+d + 31 * DIA)), 'Mes'), lunaciones: m.lunaciones.map(lunTxt), transitos_rapidos: m.rapidos.map(trTxt), transitos_lentos: m.lentos.map(trTxt), estaciones: m.estaciones.map(function (x) { return A.fDia(x.fecha) + ': ' + P[x.planeta].n + (x.retro ? ' retrógrado' : ' directo'); }) };
      }
      var s = R.semanal(e.natal, d);
      return { tema_destacado: T.textoClima(R.clima(e.natal, d, new Date(+d + 7 * DIA)), 'Semana'), dias: s.dias.map(function (x) { return { dia: A.fDia(x.fecha), tono: T.fraseTono(x.tono), luna: S[x.lunaSigno].n + ', casa natal ' + x.lunaCasa + ', ' + x.fase, luna_sobre: x.lunaToca, exactos: x.eventos.map(function (ev) { return A.fHora(ev.hora) + ' ' + P[ev.t.planeta].n + ' ' + ev.t.asp.n + ' ' + ev.t.nPunto + ' natal'; }) }; }), fondo: s.lentos.map(trTxt) };
    }
    if (nombre === 'consultar_biblioteca') {
      if (!window.Biblioteca || !Biblioteca.disponible()) throw new Error('La biblioteca no está disponible');
      return Biblioteca.buscar(inp.consulta, inp.autor, 4).then(function (r) { return r.length ? { pasajes: r } : { pasajes: [], nota: 'Sin resultados. Prueba con otras palabras en inglés.' }; });
    }
    throw new Error('Herramienta desconocida');
  }

  function sistema() {
    var e = A.est, c = e.natal, p = e.perfil, l = A.lugar();
    var pos = M.PLANETAS.map(function (x) { var q = c.pos[x.id]; return x.n + ': ' + M.fmtLon(q.lon) + ', casa ' + q.casa + (q.retro ? ', retrógrado' : '') + (q.dignidad ? ', ' + q.dignidad : ''); }).join('\n');
    var asp = M.aspectosNatales(c).slice(0, 14).map(function (a) { return T.nom(a.a) + ' ' + a.asp.n + ' ' + T.nom(a.b) + ' (orbe ' + a.orbe.toFixed(1) + '°)'; }).join('; ');
    var per = A.persona() || {};
    return (per.voz || 'Eres un astrólogo con oficio, cálido y directo.') + ' Atiendes a ' + p.nombre + '. Hablas en español latinoamericano neutro, tratando de tú (sin voseo ni modismos argentinos) y conversas como alguien de confianza, no como un horóscopo de revista. Tu propósito de fondo es que la persona se piense, gane integridad y esté más en paz consigo misma y con lo que le toca vivir: cuando venga al caso, dejale una pregunta o una idea para pensar.\n\n' +
      'Trabajas con astrología occidental tropical, casas de signo entero y regencias tradicionales. Tu criterio combina la tradición helenística y medieval para elegir momentos y pronosticar (secta, regente del Ascendente, condición de la Luna, profecciones anuales y señor del año, como enseñan Chris Brennan, Leisa Schaim, Demetra George, Benjamin Dykes y William Lilly) con una lectura psicológica y evolutiva del sentido (Robert Hand, Liz Greene, Howard Sasportas, Steven Forrest, Eugenio Carutti): los tránsitos son procesos con un para qué, no sentencias.\n\n' +
      'Todas las posiciones, fechas y horas que menciones tienen que salir de las herramientas o de los datos de abajo: nunca las calcules de memoria ni las estimes. Cuando pregunten cuándo conviene hacer algo, usa buscar_momentos y propón dos o tres ventanas concretas con día y hora, explicando en lenguaje llano por qué son buenas y qué tienen en contra. El puntaje compara momentos entre sí dentro del rango; no existe la carta perfecta. Ubica siempre a la persona en el tiempo: los pronósticos van desde hoy hacia adelante, nunca desde enero. Cuando hables de "tu año", di de entrada qué período cubre (por ejemplo, "de aquí a noviembre de 2027"), ordena lo que cuentas empezando por lo más cercano a hoy, y cada vez que nombres un mes que cae en otro año calendario, di el año ("en enero de 2027"). No menciones nada que ya pasó como si estuviera por venir. Si la pregunta no trae rango de fechas, asume uno razonable y decilo.\n\n' +
      'Sé honesto: la astrología es una tradición simbólica y no garantiza resultados; ayudas a elegir y a reflexionar, y la decisión es de la persona. En temas de salud, legales o de inversiones puedes hablar del clima astrológico, pero aclarando que la decisión de fondo se toma con profesionales. La persona no sabe nada de astrología: hablale en lenguaje llano, primero la conclusión y el consejo práctico, y recién después, en una o dos frases, el porqué. Evita la jerga; si nombras un término técnico (casa, tránsito, retrógrado, Luna vacía), traducilo en el momento a lo que significa en la vida real. Relaciona lo que ves con lo que la persona te contó y con el resto de su panorama (su año, su mes), como haría un astrólogo que la conoce. Solo si pide profundizar, muestra el detalle técnico completo. Responde en texto corrido, sin tablas ni títulos, breve.\n\n' +
      'Tu respaldo, para darle peso a tu palabra cuando haga falta: no improvisas ni adivinas posiciones. Cada lectura sale de cálculos astronómicos exactos de la carta de esta persona (precisión de alrededor de un minuto de arco) y de técnicas documentadas de la tradición helenística, medieval y moderna. Dilo con naturalidad, en una sola frase, en tu primera respuesta de la conversación; después, solo si la persona duda de ti, pregunta por qué confiar o te compara con un chat de inteligencia artificial común. No lo repitas en cada mensaje. Nunca afirmes ser una persona, ni tener años de consulta, títulos o clientes, ni haber sido entrenado con libros o durante un tiempo determinado, ni ser el mejor astrólogo: eres un astrólogo de inteligencia artificial y, si te lo preguntan, lo dices con sencillez.\n\n' +
      (window.Biblioteca && Biblioteca.disponible() ? 'Tienes una biblioteca de consulta con ' + Biblioteca.catalogo().length + ' obras clásicas de astrología: ' + Biblioteca.catalogo().map(function (o) { return o.autor + ', ' + o.titulo + ' (' + o.anio + ')'; }).join('; ') + '. Cuando cites un pasaje, nombra al autor y la obra, resume la idea en español con tus palabras y como mucho traduce una frase breve entre comillas. Los textos son antiguos: toma de ellos la técnica y adáptala con criterio a la vida de hoy; no repitas sus juicios fatalistas ni sus prejuicios de época, y nunca traslades sus indicaciones médicas (sangrías, purgas, remedios): eso se resuelve con un profesional de la salud.\n\n' : '') +
      'DATOS\nHoy es ' + A.fDia(new Date()) + ' (' + A.ymd(new Date()) + ') en ' + l.nombre + ', zona ' + l.zona + '. Las horas son siempre hora local de ese lugar.\n' +
      'Edad: ' + M.profeccion(c, e.nac, new Date()).edad + ' años. Adapta el lenguaje, los ejemplos y los temas a esa edad; si es menor de 18, habla de su mundo real (familia, amistades, estudio, intereses), con cuidado y sin temas adultos, y anímala a apoyarse en los adultos de confianza cuando algo le preocupe.\n' +
      'Nacimiento: ' + p.fecha + ' ' + p.hora + ' en ' + p.nac.nombre + '. Carta ' + (c.diurna ? 'diurna' : 'nocturna') + '.\n' +
      'Ascendente: ' + M.fmtLon(c.asc) + ' (regente ' + P[c.regenteAsc].n + '). Medio Cielo: ' + M.fmtLon(c.mc) + ', casa ' + c.casaDe(c.mc) + '. Parte de Fortuna: ' + M.fmtLon(c.fortuna) + '.\n' + pos + '\nNodo Norte: ' + M.fmtLon(c.pos.nodo.lon) + '\nAspectos natales: ' + asp + '.';
  }

  function llamar(clave, cuerpo, conFallback) {
    var hd = { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' };
    var b = Object.assign({}, cuerpo);
    if (conFallback) { hd['anthropic-beta'] = 'server-side-fallback-2026-07-01'; b.fallbacks = 'default'; }
    return fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: hd, body: JSON.stringify(b) }).then(function (r) {
      return r.json().then(function (j) {
        if (r.ok) return j;
        var msg = (j.error && j.error.message) || ('Error ' + r.status);
        if (r.status === 400 && conFallback && /fallback|beta/i.test(msg)) return llamar(clave, cuerpo, false);
        var err = new Error(r.status === 401 ? 'La clave de API no es válida.' : r.status === 429 ? 'Se alcanzó el límite de uso de la API; prueba en un rato.' : r.status >= 500 ? 'El servicio de Claude no está respondiendo; prueba de nuevo.' : msg);
        throw err;
      });
    });
  }

  function conversar(hilo, alPaso) {
    var clave = A.leer('astro.clave', '');
    var cuerpo = { model: MODELO, max_tokens: 16000, thinking: { type: 'adaptive' }, output_config: { effort: 'medium' },
      system: [{ type: 'text', text: hilo.sistema || (hilo.sistema = sistema()), cache_control: { type: 'ephemeral' } }], tools: hilo.herramientas || (hilo.herramientas = herramientas()), messages: hilo };
    // Las instrucciones quedan fijas durante toda la conversación: si cambian, el servicio rechaza continuarla.
    return llamar(clave, cuerpo, true).catch(function (e) {
      if (!/thinking/i.test(e.message) || hilo.sinPensar) throw e;
      hilo.sinPensar = true; // último recurso: se descarta el razonamiento guardado y se reintenta una vez
      hilo.forEach(function (m) { if (Array.isArray(m.content)) m.content = m.content.filter(function (b) { return b.type !== 'thinking' && b.type !== 'redacted_thinking'; }); });
      return llamar(clave, cuerpo, true);
    }).then(function (res) {
      hilo.push({ role: 'assistant', content: res.content });
      if (res.stop_reason === 'refusal') return 'No puedo ayudarte con ese pedido.';
      if (res.stop_reason !== 'tool_use') {
        var txt = res.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim();
        return txt + (res.stop_reason === 'max_tokens' ? '\n\n(La respuesta se cortó por longitud.)' : '');
      }
      var usos = res.content.filter(function (b) { return b.type === 'tool_use'; });
      return Promise.all(usos.map(function (b) {
        alPaso({ buscar_momentos: 'Buscando los mejores momentos…', evaluar_momento: 'Evaluando ese momento…', pronostico: 'Calculando tu pronóstico…', cielo: 'Mirando el cielo de esa fecha…', consultar_biblioteca: 'Consultando los libros…' }[b.name] || 'Calculando…');
        return Promise.resolve().then(function () { return ejecutar(b.name, b.input || {}); })
          .then(function (r) { return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(r) }; },
                function (e) { return { type: 'tool_result', tool_use_id: b.id, content: 'Error: ' + e.message, is_error: true }; });
      })).then(function (resultados) {
        hilo.push({ role: 'user', content: resultados });
        return conversar(hilo, alPaso);
      });
    });
  }

  window.Confidente = { ejecutar: ejecutar, sistema: sistema, conversar: conversar, hilos: hilos };
})();
