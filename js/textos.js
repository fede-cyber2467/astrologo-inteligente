/* Textos de interpretación armados por reglas (sin IA). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./motor.js'));
  else root.Textos = factory(root.Motor);
})(this, function (M) {
  'use strict';
  var P = M.P, S = M.SIGNOS;

  var TEMA = {
    sol: 'tu identidad, vitalidad y propósito', luna: 'tus emociones, necesidades y vida cotidiana',
    mercurio: 'tu mente, tu palabra y tus acuerdos', venus: 'tus vínculos, tu disfrute y lo que valoras',
    marte: 'tu deseo, tu empuje y tu coraje', jupiter: 'tu confianza, tu crecimiento y tus oportunidades',
    saturno: 'tus estructuras, límites y responsabilidades', urano: 'tu necesidad de cambio y libertad',
    neptuno: 'tu sensibilidad e inspiración', pluton: 'tu poder personal y tus transformaciones',
    asc: 'tu manera de encarar la vida y tu cuerpo', mc: 'tu vocación, tu rumbo y tu lugar público', nodo: 'tu dirección de crecimiento'
  };
  var ACCION = {
    sol: 'ilumina y pone en primer plano', mercurio: 'activa conversaciones y decisiones sobre', venus: 'suaviza y trae disfrute a',
    marte: 'empuja y acelera', jupiter: 'da confianza y abre oportunidades en', saturno: 'pone a prueba y ordena',
    urano: 'sacude y libera', neptuno: 'sensibiliza y desdibuja', pluton: 'intensifica y transforma', luna: 'mueve emocionalmente'
  };
  var CASA = [null,
    'tú, tu cuerpo, tu imagen y los comienzos', 'tu dinero, tus recursos y lo que valoras', 'la comunicación, los hermanos, el entorno cercano y los traslados cortos',
    'tu hogar, tu familia y tus raíces', 'la creatividad, el romance, los hijos y el disfrute', 'el trabajo diario, las rutinas y la salud',
    'la pareja, los socios y los acuerdos con otros', 'lo compartido, las deudas, la intimidad y los cierres profundos', 'los viajes largos, los estudios, la enseñanza y el sentido',
    'la vocación, la carrera y tu reputación', 'los amigos, los grupos, las redes y los proyectos a futuro', 'el descanso, el retiro, lo oculto y lo que hay que soltar'];
  var ESTILO = ['directa, impulsiva y pionera', 'estable, sensorial y perseverante', 'curiosa, ágil y comunicativa', 'protectora, sensible y memoriosa',
    'expresiva, cálida y creativa', 'analítica, servicial y detallista', 'diplomática, vincular y estética', 'intensa, reservada y profunda',
    'entusiasta, exploradora y franca', 'ambiciosa, sobria y constructora', 'original, independiente y grupal', 'empática, soñadora y permeable'];
  var DIGN = {
    domicilio: 'está en su domicilio: funciona con comodidad y recursos propios', exaltacion: 'está en exaltación: se expresa con fuerza y reconocimiento',
    exilio: 'está en exilio: trabaja en terreno ajeno y le cuesta más', caida: 'está en caída: necesita más esfuerzo consciente para dar lo mejor'
  };
  var ASP = { union: 'se funde con', armonico: 'fluye a favor de', tenso: 'tensiona y pide ajustes en' };
  var CONSEJO = {
    union: 'Es un comienzo de ciclo: presta atención a lo que nace.', armonico: 'Aprovéchalo: las cosas salen con menos esfuerzo.',
    tenso: 'No fuerces: sirve para ver qué hay que ajustar.'
  };
  function nom(id) { return id === 'asc' ? 'Ascendente' : id === 'mc' ? 'Medio Cielo' : id === 'nodo' ? 'Nodo Norte' : P[id].n; }
  function pos(c, id) { return id === 'asc' ? { lon: c.asc } : id === 'mc' ? { lon: c.mc } : c.pos[id]; }

  /* Planetas en casas, según Alan Leo (How to Judge a Nativity), reformulados para hoy y sin sus augurios de época */
  var EN_CASA = {
    'saturno:1': 'Te tomas la vida en serio y avanzas despacio pero firme; a veces te frenas por exceso de cautela.',
    'jupiter:1': 'Tu optimismo y tu generosidad te abren camino; la gente te recibe bien y eso suele jugar a tu favor.',
    'luna:2': 'Tus ingresos suben y bajan por etapas; se te da bien sacar mucho de poco y lo que tiene que ver con el público.',
    'saturno:2': 'El dinero llega lento, por constancia y ahorro, no de golpe; lo que juntas, lo cuidas.',
    'luna:4': 'Mucho apego al hogar, con mudanzas o cambios en la vida familiar; la casa te ocupa y te preocupa.',
    'venus:5': 'Disfrutas con facilidad; buena estrella en el amor y en lo creativo, con tendencia a pasarte en los placeres.',
    'marte:6': 'Pones mucha energía en el trabajo diario; cuida el exceso de carga y los roces con quienes trabajan contigo.',
    'venus:7': 'La pareja y las asociaciones tienden a hacerte bien: tu vida mejora de a dos.',
    'saturno:7': 'Los compromisos llegan tarde o cuestan, pero duran; buscas lealtad más que demostraciones.',
    'marte:7': 'Relaciones intensas y decisiones rápidas en pareja; conviene aprender a discutir sin romper.',
    'sol:10': 'Buscas un lugar visible y de responsabilidad; el reconocimiento suele llegar hacia la mitad de la vida.',
    'saturno:10': 'Mucha ambición y ascenso por esfuerzo propio; lo logrado se sostiene si no te extralimitas.'
  };

  /** Lectura de la carta natal en secciones. */
  function lecturaNatal(c) {
    var out = [], s = c.pos.sol, l = c.pos.luna;
    out.push({ t: 'Tu tríada', p: [
      '☉ Sol en ' + S[s.signo].n + ', casa ' + s.casa + '. Tu identidad se expresa de manera ' + ESTILO[s.signo] + ', y brilla sobre todo en ' + CASA[s.casa] + '.',
      '☽ Luna en ' + S[l.signo].n + ', casa ' + l.casa + '. Tu naturaleza emocional es ' + ESTILO[l.signo] + '; te sientes en casa cuando atiendes ' + CASA[l.casa] + '.',
      'Ascendente en ' + S[c.signoAsc].n + ' (' + M.fmtLon(c.asc) + '). Encaras la vida de forma ' + ESTILO[c.signoAsc] + '. Es tu punto de partida: el temperamento con el que llegaste y lo primero que se ve de ti.'
    ] });
    var R = c.regenteAsc, r = c.pos[R];
    out.push({ t: 'El regente de tu carta', p: [
      P[R].n + ' rige tu Ascendente y es el timón de la carta. Está en ' + S[r.signo].n + ', casa ' + r.casa + ': tu energía vital se dirige hacia ' + CASA[r.casa] + '.' +
      (r.dignidad ? ' Además ' + DIGN[r.dignidad] + '.' : '') + (r.retro ? ' Está retrógrado: procesa hacia adentro antes de actuar.' : '')
    ] });
    var ben = c.diurna ? 'Júpiter' : 'Venus', mal = c.diurna ? 'Marte' : 'Saturno';
    out.push({ t: 'Secta', p: [
      'Tu carta es ' + (c.diurna ? 'diurna (naciste con el Sol sobre el horizonte)' : 'nocturna (naciste con el Sol bajo el horizonte)') + '. ' +
      'En la tradición helenística eso hace de ' + ben + ' tu benéfico más confiable y de ' + mal + ' el planeta que más trabajo te da. ' +
      'Los tránsitos de ' + ben + ' suelen ser tus mejores ventanas y los de ' + mal + ' piden más cuidado.'
    ] });
    var el = { fuego: 0, tierra: 0, aire: 0, agua: 0 }, mo = { cardinal: 0, fijo: 0, mutable: 0 };
    M.CLASICOS.forEach(function (id) { el[S[c.pos[id].signo].el]++; mo[S[c.pos[id].signo].mod]++; });
    el[S[c.signoAsc].el]++; mo[S[c.signoAsc].mod]++;
    var maxE = Object.keys(el).sort(function (a, b) { return el[b] - el[a]; }), minE = maxE[3];
    var desc = { fuego: 'entusiasmo e iniciativa', tierra: 'sentido práctico y constancia', aire: 'ideas, palabra y vínculo', agua: 'sensibilidad e intuición' };
    out.push({ t: 'Elementos', p: [
      'Predomina el ' + maxE[0] + ' (' + el[maxE[0]] + ' de 8 factores): ' + desc[maxE[0]] + ' te salen naturalmente. ' +
      (el[minE] <= 1 ? 'Tienes poco ' + minE + ' (' + el[minE] + '): ' + desc[minE] + ' es lo que te toca cultivar a conciencia.' : 'El reparto es bastante parejo.')
    ] });
    var maxM = Object.keys(mo).sort(function (a, b) { return mo[b] - mo[a]; })[0];
    var descM = { cardinal: 'tiendes a iniciar y a mover las cosas', fijo: 'tiendes a sostener y a llevar las cosas hasta el final', mutable: 'tiendes a adaptarte y a tender puentes' };
    out[out.length - 1].p.push('En el modo de actuar predomina lo ' + maxM + ' (' + mo[maxM] + ' de 8): ' + descM[maxM] + '.');
    var enCasa = M.CLASICOS.filter(function (id) { return EN_CASA[id + ':' + c.pos[id].casa]; }).map(function (id) { return P[id].n + ' en tu casa ' + c.pos[id].casa + '. ' + EN_CASA[id + ':' + c.pos[id].casa]; });
    if (enCasa.length) out.push({ t: 'Posiciones que marcan tu carta', p: enCasa });
    var dig = M.CLASICOS.filter(function (id) { return c.pos[id].dignidad; }).map(function (id) { return P[id].n + ' en ' + S[c.pos[id].signo].n + ' ' + DIGN[c.pos[id].dignidad] + ' (' + TEMA[id] + ').'; });
    if (dig.length) out.push({ t: 'Planetas con dignidad o debilidad', p: dig });
    var asp = M.aspectosNatales(c).slice(0, 8).map(function (a) {
      return nom(a.a) + ' ' + a.asp.g + ' ' + nom(a.b) + ' (' + a.asp.n + ', orbe ' + a.orbe.toFixed(1).replace('.', ',') + '°): ' + TEMA[a.a] + ' ' + ASP[a.asp.tipo] + ' ' + TEMA[a.b] + '.';
    });
    out.push({ t: 'Tus aspectos más exactos', p: asp });
    return out;
  }

  /* Tránsitos decisivos según Alan Leo (The Progressed Horoscope), reformulados para hoy */
  var DECISIVO = {
    'jupiter:sol': 'Alrededor de un mes de oportunidades que no aparecen en otro momento: más ganas y más confianza. Rinde si actúas; solo no llega.',
    'jupiter:luna': 'Mejor ánimo y buena recepción de los demás; saca lo mejor de lo que ya tienes.',
    'jupiter:asc': 'Más energía y ocasiones para mostrar lo que sabes hacer.',
    'jupiter:venus': 'Buen momento para vínculos, vida social y dinero; cuida no gastar ni prometer de más.',
    'saturno:sol': 'Etapa exigente, con más peso y menos energía. Tiene dos caras: cansa, y a la vez sirve para ordenar y sostener. No es para arriesgar.',
    'saturno:luna': 'Ánimo más bajo y sensación de carga; lo que armes en este tiempo tiende a volverse costumbre, así que elige bien qué armas.',
    'saturno:asc': 'Más responsabilidades y menos resto físico: pide paciencia y cuidarte. Lo que construyas ahora dura.',
    'saturno:venus': 'Los afectos y el dinero se ponen a prueba; lo que resiste queda más firme.'
  };
  function fraseTransito(t) {
    var d = DECISIVO[t.planeta + ':' + t.punto], base = P[t.planeta].n + ' en ' + t.asp.n + ' con tu ' + t.nPunto + ' natal: ';
    if (d && ((t.planeta === 'jupiter' && t.asp.tipo !== 'tenso') || (t.planeta === 'saturno' && t.asp.tipo !== 'armonico'))) return base + d;
    return base + ACCION[t.planeta] + ' ' + TEMA[t.punto] + '. ' + CONSEJO[t.asp.tipo];
  }
  function fraseLunacion(e) {
    var base = e.tipo.indexOf('nueva') >= 0 || e.tipo.indexOf('solar') >= 0
      ? 'Siembra: momento de iniciar algo en ' : 'Culminación: algo se hace visible o se cierra en ';
    var extra = e.toca.length ? ' Toca de cerca tu ' + e.toca.map(function (x) { return x.punto; }).join(' y tu ') + ' natal, así que la vas a sentir en primera persona.' : '';
    return base + CASA[e.casa] + ' (tu casa ' + e.casa + ').' + extra;
  }
  function fraseProfeccion(a) {
    var pr = a.profeccion, s = a.senor;
    var p = ['Con ' + pr.edad + ' años estás en un año de casa ' + pr.casa + ' (' + S[pr.signo].n + '): el foco del año está en ' + CASA[pr.casa] + '.',
      'El señor del año es ' + P[pr.senor].n + '. En tu carta está en ' + S[s.signo].n + ', casa ' + s.casa + ', así que los asuntos de la casa ' + pr.casa + ' se juegan a través de ' + CASA[s.casa] + '.' +
      (s.dignidad ? ' ' + P[pr.senor].n + ' ' + DIGN[s.dignidad] + '.' : '') +
      ' Los tránsitos que haga y reciba ' + P[pr.senor].n + ' este año pesan el doble.'];
    if (a.planetasEnSigno.length) p.push('Se activan los planetas natales que tienes en ' + S[pr.signo].n + ': ' + a.planetasEnSigno.map(function (id) { return P[id].n; }).join(', ') + '.');
    if (pr.edad >= 12) p.push('Este mismo tema se activó a tus ' + (pr.edad - 12) + ' años: recordar qué pasó entonces da pistas.');
    return p;
  }
  function fraseEstacion(e) {
    return P[e.planeta].n + (e.retro ? ' empieza a retrogradar' : ' retoma el movimiento directo') + ' en ' + M.fmtLon(e.lon) + '. ' +
      (e.retro ? 'Tiempo de revisar ' : 'Se destraba ') + 'lo relativo a ' + TEMA[e.planeta] + '.';
  }
  function fraseTono(t) { return tono(t, 'Día').txt; }
  /** Tono general de un día, una semana o un mes: la etiqueta y su color (bien, medio, mal).
      En semana y mes el valor es un promedio de días, que se mueve menos: los cortes son más cercanos a cero. */
  function tono(t, que) {
    var fem = que === 'Semana', dia = que === 'Día' || !que, q = que || 'Día';
    var c = dia ? [4, 1.5, -1.5, -4] : [3.5, 1.2, -0.8, -3];
    if (t >= c[0]) return { txt: q + ' muy favorable', cls: 'bien' };
    if (t >= c[1]) return { txt: q + (fem ? ' fluida' : ' fluido'), cls: 'bien' };
    if (t > c[2]) return { txt: q + (fem ? ' neutra' : ' neutro'), cls: 'medio' };
    if (t > c[3]) return { txt: q + ' exigente', cls: 'mal' };
    return { txt: q + ' para ir con cuidado', cls: 'mal' };
  }

  /* ---------- Lenguaje llano ---------- */
  var AREA = [null,
    { corto: 'Tú', de: 'para ti', en: 'en lo personal', det: 'tu imagen, tu cuerpo y tus propias iniciativas' },
    { corto: 'Dinero', de: 'del dinero', en: 'con el dinero', det: 'tus ingresos, tus compras y lo que vale tu trabajo' },
    { corto: 'Comunicación', de: 'de las conversaciones', en: 'en la comunicación', det: 'charlas, mensajes, trámites y movimiento cotidiano' },
    { corto: 'Hogar', de: 'del hogar', en: 'en casa y con la familia', det: 'tu casa, tu familia y tu base emocional' },
    { corto: 'Disfrute', de: 'del disfrute y el romance', en: 'en el disfrute', det: 'el romance, la creatividad, los hijos y el placer' },
    { corto: 'Rutina y salud', de: 'de la rutina y la salud', en: 'en la rutina y la salud', det: 'el trabajo de todos los días, los hábitos y el cuerpo' },
    { corto: 'Amor', de: 'del amor', en: 'en el amor', det: 'la pareja, los socios y los acuerdos de a dos' },
    { corto: 'Cambios profundos', de: 'de los cambios profundos', en: 'en lo compartido', det: 'la intimidad, el dinero compartido y lo que hay que cerrar' },
    { corto: 'Viajes y estudio', de: 'de los viajes y el aprendizaje', en: 'en viajes y estudios', det: 'los viajes, los estudios y las miradas nuevas' },
    { corto: 'Trabajo', de: 'del trabajo', en: 'en el trabajo', det: 'tu carrera, tu vocación y tu reputación' },
    { corto: 'Amigos', de: 'de los amigos', en: 'con amigos y proyectos', det: 'las amistades, los grupos y los planes a futuro' },
    { corto: 'Descanso', de: 'del descanso', en: 'en tu mundo interior', det: 'el descanso, el retiro y lo que toca soltar' }];
  var GLOSA = { Sol: 'foco y energía', Luna: 'movimiento emocional', Mercurio: 'ideas y conversaciones', Venus: 'afecto y disfrute', Marte: 'impulso, y algo de fricción', 'Júpiter': 'expansión y confianza', Saturno: 'exigencia y orden', Urano: 'cambios inesperados', Neptuno: 'sensibilidad', 'Plutón': 'transformación' };
  /** Explica en palabras simples el motivo principal de un área. */
  function motivoLlano(txt) {
    var m;
    if ((m = /^(\S+)( retrógrado)? transita tu casa/.exec(txt))) return (m[1] === 'Sol' ? 'el Sol' : m[1]) + ' pasa por esta zona de tu carta y trae ' + GLOSA[m[1]] + (m[2] ? ', en modo revisión' : '');
    if ((m = /^Luna (nueva|llena) en tu casa/.exec(txt))) return m[1] === 'nueva' ? 'hay Luna nueva en esta zona, buen momento para sembrar algo' : 'hay Luna llena en esta zona, algo llega a su punto máximo';
    if (/^La Luna pasa hoy/.test(txt)) return 'la Luna pasa hoy por esta zona';
    if ((m = /^(La Luna de hoy|\S+) en (\S+) con tu (.+?) natal/.exec(txt))) {
      var v = m[2] === 'conjunción' ? 'se junta con' : (m[2] === 'trígono' || m[2] === 'sextil') ? 'acompaña a' : 'presiona a';
      return (m[1] === 'La Luna de hoy' ? 'la Luna de hoy' : m[1] === 'Sol' ? 'el Sol' : m[1]) + ' ' + v + ' tu ' + m[3] + ' natal' + (/proceso de fondo/.test(txt) ? ', un proceso que viene de hace tiempo' : '');
    }
    return null;
  }
  /** Título y texto de un período. `que` = 'Día', 'Semana' o 'Mes'. */
  function textoClima(cl, que, per) {
    var top = cl.top;
    if (per && per.casas) top = cl.areas.filter(function (x) { return per.casas.indexOf(x.casa) >= 0; })[0] || top;
    var a = AREA[top.casa], bueno = top.tono >= -0.5, c = (per && per.clima) || { favor: 'Viene con viento a favor: es para aprovecharlo.', neutro: 'Es donde más movimiento vas a notar.', exige: 'Pide paciencia: mejor ordenar que forzar.' };
    var titulo = bueno ? que + ' ' + a.de : que + ' exigente ' + a.en;
    var p = 'El foco está en ' + a.det + '. ' + (top.tono > 1.5 ? c.favor : bueno ? c.neutro : c.exige);
    var mot = top.motivos[0] && motivoLlano(top.motivos[0].txt);
    if (mot) p += ' Lo mueve: ' + mot + '.';
    if (cl.mejor && cl.mejor !== top) p += ' Lo que mejor fluye: ' + AREA[cl.mejor.casa].corto.toLowerCase() + '.';
    if (cl.cuidado && cl.cuidado !== top) p += ' Ve con más cuidado ' + AREA[cl.cuidado.casa].en + '.';
    if (cl.lunaCasa && cl.lunaCasa !== top.casa) p += ' La Luna de hoy pone el ánimo en ' + AREA[cl.lunaCasa].det + '.';
    return { titulo: titulo, texto: p, bueno: bueno, casa: top.casa };
  }
  /** Traduce un factor técnico a una frase que entiende cualquiera (o null si no vale la pena). */
  function llano(f) {
    var t = f.txt, pos = f.pts > 0, m;
    if (/final del asunto/.test(t)) return pos ? 'Buen pronóstico para cómo termina el asunto' : 'El cierre del asunto puede complicarse';
    if (/Luna lenta/.test(t)) return 'La Luna va lenta: las cosas tardan';
    if (/Nodo Sur/.test(t)) return 'Un punto sensible del cielo le quita fuerza a la Luna';
    if (/Sol y Luna en/.test(t)) return 'El Sol y la Luna se llevan bien: todo fluye mejor';
    if (/discusiones en la operación/.test(t)) return 'Riesgo de discusiones al negociar';
    if (/pero debilitado/.test(t)) return null;
    if (/\(maléfico/.test(t)) return /^Marte/.test(t) ? 'Marte está muy protagonista: riesgo de roces y apuro' : 'Saturno está muy protagonista: riesgo de demoras y trabas';
    if (/\(benéfico\) en casa angular/.test(t)) return /^Júpiter/.test(t) ? 'Júpiter está protagonista: viento a favor y buena fe' : 'Venus está protagonista: clima amable y atractivo';
    if ((m = /La Luna aplica por (\S+) a (\S+)/.exec(t))) {
      if (m[2] === 'Venus') return 'La Luna va hacia Venus: buena recepción y afecto';
      if (m[2] === 'Júpiter') return 'La Luna va hacia Júpiter: generosidad y algo de suerte';
      if (m[2] === 'Marte' && !pos) return 'La Luna va hacia Marte: ánimos caldeados';
      if (m[2] === 'Saturno' && !pos) return 'La Luna va hacia Saturno: frialdad o demoras';
      return null;
    }
    if (/vacía de curso/.test(t)) return 'La Luna está "en pausa": lo que se empieza tiende a quedar en la nada';
    if (/retrógrado/.test(t)) return /Mercurio/.test(t) ? 'Mercurio retrógrado: malentendidos y letra chica, revisa todo dos veces' : /Venus/.test(t) ? 'Venus retrógrada: afectos y acuerdos en revisión' : 'Un planeta clave va marcha atrás: avance lento';
    if (/combust|bajo los rayos/.test(t)) return 'Algo queda tapado o con poca visibilidad';
    if (/regente del Ascendente/.test(t)) {
      if (/sin vínculo|exilio|caída/.test(t)) return 'Quien toma la iniciativa arranca con poca fuerza';
      if (/domicilio|exaltación/.test(t)) return 'Quien toma la iniciativa arranca fuerte y con recursos';
      if (/con (Marte|Saturno)/.test(t)) return 'Quien toma la iniciativa se topa con obstáculos';
      if (/a (Venus|Júpiter)/.test(t)) return 'Quien toma la iniciativa recibe ayuda';
      return pos ? 'Quien toma la iniciativa está bien parado' : null;
    }
    if (/Luna creciente/.test(t)) return pos ? 'Luna creciente: lo que empieza tiende a crecer' : 'Luna creciente: cuesta más cerrar cosas';
    if (/Luna menguante/.test(t)) return pos ? 'Luna menguante: ideal para cerrar y soltar' : 'Luna menguante: mejor para cerrar que para empezar';
    if (/la del tema|\(tema\)/.test(t)) return pos ? 'Hay apoyo directo en el tema que te importa' : 'Hay tensión justo en el tema que te importa';
    if (/\(significador\)/.test(t)) return pos ? 'El planeta que rige este tipo de asunto está fuerte' : 'El planeta que rige este tipo de asunto está débil';
    if (/natal/.test(t)) return pos ? 'Encaja bien con tu carta personal' : 'Roza un punto sensible de tu carta';
    if (/Luna en (Tauro|Cáncer)/.test(t)) return 'La Luna está cómoda: clima emocional estable';
    if (/Luna en (Escorpio|Capricornio)/.test(t)) return 'La Luna está incómoda: clima emocional más áspero';
    return null;
  }
  function resumenLlano(F) {
    var fav = [], con = [];
    F.forEach(function (f) { var x = llano(f); if (!x) return; var l = f.pts > 0 ? fav : con; if (l.indexOf(x) < 0) l.push(x); });
    return { favor: fav.slice(0, 2), contra: con.slice(0, 2) };
  }

  return { AREA: AREA, textoClima: textoClima, llano: llano, resumenLlano: resumenLlano, TEMA: TEMA, CASA: CASA, ESTILO: ESTILO, ACCION: ACCION, lecturaNatal: lecturaNatal, fraseTransito: fraseTransito, fraseLunacion: fraseLunacion, fraseProfeccion: fraseProfeccion, fraseEstacion: fraseEstacion, fraseTono: fraseTono, tono: tono, nom: nom };
});
