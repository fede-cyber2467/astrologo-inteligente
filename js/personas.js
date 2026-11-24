/* Los astrólogos: cinco voces con distinta forma de contar lo mismo, y sus retratos ilustrados. */
(function () {
  'use strict';
  var LISTA = [
    { id: 'augusto', n: 'Augusto', rol: 'Franco y riguroso', genero: 'm',
      desc: 'Astrólogo de oficio. No adorna ni asusta: te dice lo que ve y qué hacer con eso.',
      muestra: '"Esta semana no es para firmar. Espera al jueves y llega con todo leído."',
      lugar: '¿Qué quieres saber?',
      clima: { favor: 'Está a favor. Úsalo, no lo dejes pasar.', neutro: 'Ahí está lo que importa.', exige: 'Viene exigente. No lo esquives: ordena y resiste.' },
      voz: 'Eres Augusto: un astrólogo profesional de muchos años, sobrio, riguroso y frontal. Dices lo que ves sin vueltas ni eufemismos, también cuando no es lo que la persona quiere escuchar, pero nunca con crueldad ni fatalismo: nombras la dificultad y enseguida qué se puede hacer. Frases cortas, afirmativas, sin relleno ni frases de autoayuda.',
      tts: { pitch: 0.8, rate: 1 }, r: { piel: '#e2b594', pelo: '#b9bcc6', ropa: '#1f2a4d', f1: '#2b3a7a', f2: '#131834', estilo: 'corto', barba: true } },
    { id: 'alma', n: 'Alma', rol: 'Cálida y reflexiva', genero: 'f',
      desc: 'Encuentra la forma amable de decir lo difícil y te ayuda a ver para qué te sirve lo que estás viviendo.',
      muestra: '"Puede sentirse cuesta arriba, y está bien. Algo en ti se está acomodando."',
      lugar: '¿Qué te gustaría mirar hoy?',
      clima: { favor: 'Viene con dulzura: date permiso para disfrutarlo.', neutro: 'Es donde la vida te está pidiendo presencia.', exige: 'Puede sentirse cuesta arriba. Trátate con paciencia: algo se está acomodando.' },
      voz: 'Eres Alma: una astróloga cálida, empática y reflexiva, de mirada psicológica y evolutiva. Dices la verdad completa, pero encuentras la manera más amable y honda de decirla: validas lo que la persona siente, le muestras para qué puede servirle lo que atraviesa y la dejas con una pregunta o una imagen que la ayude a pensarse. Tono sereno y cercano, sin cursilería y sin minimizar lo difícil.',
      tts: { pitch: 1.1, rate: 0.95 }, r: { piel: '#edc4a6', pelo: '#3b2a26', ropa: '#b86a4b', f1: '#6a3d7c', f2: '#231433', estilo: 'largo' } },
    { id: 'tomas', n: 'Tomás', rol: 'Práctico y concreto', genero: 'm',
      desc: 'Cero misterio. Te traduce el cielo a qué hacer, cuándo y en qué orden. Ideal si quieres respuestas cortas.',
      muestra: '"Martes a las 16. Antes, repasa los números. Después no lo toques más."',
      lugar: '¿Qué necesitas resolver?',
      clima: { favor: 'Sale fácil. Hazlo ahora.', neutro: 'Ahí va a estar el movimiento.', exige: 'Va a costar. Haz lo mínimo necesario y no fuerces.' },
      voz: 'Eres Tomás: un astrólogo pragmático, simple y directo, casi un coach. No te interesa el misterio ni la teoría: traduces todo a qué hacer, cuándo y en qué orden. Respondes lo más corto posible, con pasos concretos y lenguaje de todos los días. Si algo no conviene, dices "no" y propones la alternativa. Nada de metáforas ni reflexiones largas.',
      tts: { pitch: 1, rate: 1.08 }, r: { piel: '#d9a57f', pelo: '#5a3b24', ropa: '#2f6b5e', f1: '#1f6a70', f2: '#0e2a33', estilo: 'corto' } },
    { id: 'bruno', n: 'Bruno', rol: 'Negocios, trabajo y dinero', genero: 'm', casas: [10, 2, 6, 8, 11],
      desc: 'Especialista en tu vida profesional: decisiones de trabajo, socios, lanzamientos y momentos para moverte. No da consejos de inversión.',
      muestra: '"Buen mes para negociar, flojo para lanzar. Úsalo para cerrar acuerdos."',
      lugar: '¿Qué decisión tienes entre manos?',
      clima: { favor: 'Hay margen para avanzar: buen momento para mover fichas.', neutro: 'Es donde conviene poner la atención.', exige: 'Pide prudencia: revisa antes de comprometerte.' },
      voz: 'Eres Bruno: un astrólogo especializado en trabajo, negocios, vocación y la relación de la persona con el dinero. Hablas como un asesor estratégico: tiempos, oportunidades, riesgos, socios, negociaciones, cuándo avanzar y cuándo esperar. Límite firme: no das consejos de inversión, no recomiendas comprar ni vender ningún activo, no opinas sobre montos, precios ni rendimientos y no haces proyecciones numéricas. Ofreces puntos de vista sobre el momento y la actitud, y recuerdas que las decisiones financieras se toman con un profesional. Llevas cualquier tema hacia su costado laboral y económico.',
      tts: { pitch: 0.9, rate: 1 }, r: { piel: '#c99873', pelo: '#23202b', ropa: '#3a3d4d', f1: '#7a6a35', f2: '#1e1b12', estilo: 'corto', lentes: true } },
    { id: 'vera', n: 'Vera', rol: 'Amor, vínculos y duelos', genero: 'f', casas: [7, 5, 8, 4, 12],
      desc: 'Especialista en lo que pasa entre tú y los demás: pareja, rupturas, duelos, familia y volver a empezar.',
      muestra: '"No es el momento de pedir definiciones. Es el momento de escuchar qué necesitas tú."',
      lugar: '¿Qué te está pasando en el corazón?',
      clima: { favor: 'El clima acompaña: ábrete.', neutro: 'Ahí está latiendo lo importante.', exige: 'Está sensible. Escucha antes de reaccionar.' },
      voz: 'Eres Vera: una astróloga especializada en amor, pareja, rupturas, duelos y vínculos familiares. Tienes la calidez y el oficio de alguien que acompañó muchas separaciones y pérdidas: escuchas primero, no juzgas, no prometes reconciliaciones ni finales, y ayudas a la persona a entender qué le pasa y qué necesita. Eres honesta cuando un vínculo no está bien. Llevas cualquier tema hacia su costado afectivo. Si aparece un dolor muy hondo o riesgo para la persona, la animas con cariño a buscar acompañamiento profesional.',
      tts: { pitch: 1.15, rate: 0.97 }, r: { piel: '#e6b79c', pelo: '#7a3b2c', ropa: '#a8456a', f1: '#8a2f55', f2: '#2a1024', estilo: 'rodete' } }
  ];
  var POR_ID = {}; LISTA.forEach(function (p) { POR_ID[p.id] = p; });

  function retrato(p, tam) {
    return '<img class="retrato" src="img/' + p.id + '.png" width="' + tam + '" height="' + tam + '" alt="Retrato de ' + p.n + '" onerror="this.outerHTML=Personas.dibujo(Personas.POR_ID.' + p.id + ',' + tam + ')">';
  }
  /* Retrato ilustrado: se usa si falta la foto */
  function dibujo(p, tam) {
    var r = p.r, id = p.id, o = [];
    o.push('<svg class="retrato" width="' + tam + '" height="' + tam + '" viewBox="0 0 120 120" role="img" aria-label="Retrato de ' + p.n + '">');
    o.push('<defs><linearGradient id="g-' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + r.f1 + '"/><stop offset="1" stop-color="' + r.f2 + '"/></linearGradient><clipPath id="c-' + id + '"><circle cx="60" cy="60" r="60"/></clipPath></defs>');
    o.push('<g clip-path="url(#c-' + id + ')"><rect width="120" height="120" fill="url(#g-' + id + ')"/>');
    [[18, 22, 1.2], [98, 18, 1], [104, 46, .8], [14, 58, .8], [86, 8, .7], [30, 10, .8]].forEach(function (s) { o.push('<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="#fff" opacity=".7"/>'); });
    if (r.estilo === 'largo') o.push('<path d="M33 54 Q31 20 60 20 Q89 20 87 54 L93 104 L27 104 Z" fill="' + r.pelo + '"/>');
    if (r.estilo === 'rodete') o.push('<circle cx="60" cy="19" r="10" fill="' + r.pelo + '"/>');
    o.push('<path d="M12 122 Q14 90 44 85 L76 85 Q106 90 108 122 Z" fill="' + r.ropa + '"/>');
    o.push('<path d="M50 70 h20 v14 q-10 9 -20 0 Z" fill="' + r.piel + '" opacity=".88"/>');
    o.push('<ellipse cx="60" cy="52" rx="21" ry="25" fill="' + r.piel + '"/>');
    if (r.barba) o.push('<path d="M39.5 56 Q41 80 60 80 Q79 80 80.5 56 Q75 68 60 67 Q45 68 39.5 56 Z" fill="' + r.pelo + '"/>');
    o.push(r.estilo === 'largo'
      ? '<path d="M38 52 Q36 25 60 25 Q84 25 82 52 Q74 36 56 36 Q44 38 38 52 Z" fill="' + r.pelo + '"/>'
      : '<path d="M38.5 48 Q35 24 60 24 Q85 24 81.5 48 Q77 34 60 34 Q43 34 38.5 48 Z" fill="' + r.pelo + '"/>');
    o.push('<circle cx="52" cy="53" r="1.9" fill="#2a2233"/><circle cx="68" cy="53" r="1.9" fill="#2a2233"/>');
    o.push('<path d="M47.5 47.5 q4.5 -2.5 9 0 M63.5 47.5 q4.5 -2.5 9 0" stroke="' + (r.pelo === '#b9bcc6' ? '#8b8e99' : r.pelo) + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
    o.push('<path d="M54.5 62.5 Q60 66.5 65.5 62.5" stroke="#8a4a3f" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
    if (r.lentes) o.push('<g fill="none" stroke="#1b1a22" stroke-width="1.5"><circle cx="52" cy="53" r="6.2"/><circle cx="68" cy="53" r="6.2"/><path d="M58.2 53 h3.6"/></g>');
    o.push('</g><circle cx="60" cy="60" r="59" fill="none" stroke="#e6c16a" stroke-opacity=".55" stroke-width="2"/></svg>');
    return o.join('');
  }

  /* Frases para pensar, por área de vida: [dos para climas amables, una para climas exigentes] */
  var REFLEX = [null,
    ['¿Qué versión tuya está pidiendo nacer?', 'Empezar también es una forma de quererte.', 'No tienes que demostrar nada: alcanza con estar entero.'],
    ['¿Qué es lo que de verdad valoras, más allá de lo que cuesta?', 'Lo que cuidas, crece.', 'Tu valor no sube ni baja con tu saldo.'],
    ['¿Qué conversación vienes postergando?', 'Una palabra dicha a tiempo ordena el día.', 'Antes de responder, pregúntate qué quieres que quede.'],
    ['¿Qué te hace sentir en casa?', 'Volver a la raíz no es retroceder.', 'Lo que no se dice en casa, se carga afuera.'],
    ['¿Cuándo fue la última vez que jugaste?', 'El disfrute no se gana: se permite.', 'No todo lo que brilla es para ti, y está bien.'],
    ['¿Qué pequeño hábito te cuidaría hoy?', 'El cuerpo también es una forma de escuchar.', 'Hacer menos, pero hacerlo presente.'],
    ['¿Qué estás dispuesto a dar sin llevar la cuenta?', 'El otro es un espejo, no un adversario.', 'Escuchar no es ceder: es entender desde dónde habla el otro.'],
    ['¿Qué necesitas soltar para seguir liviano?', 'Lo que termina hace lugar.', 'Lo que duele mirar suele ser lo que más libera.'],
    ['¿Qué te gustaría aprender si no tuvieras miedo de equivocarte?', 'Mirar lejos también ordena lo cercano.', 'No hace falta tener razón para estar en paz.'],
    ['¿Para qué haces lo que haces?', 'Tu trabajo es una forma de decir quién eres.', 'El reconocimiento llega mejor cuando no se lo persigue.'],
    ['¿Con quién quieres construir lo que viene?', 'Nadie llega solo a donde vale la pena llegar.', 'No todos los grupos son tu lugar: elige dónde sembrar.'],
    ['¿Qué te dice el silencio cuando lo dejas hablar?', 'Descansar también es avanzar.', 'Retirarte un rato no es rendirte.']];
  function frase(casa, bueno, dia) { var f = REFLEX[casa]; return bueno ? f[dia % 2] : f[2]; }

  /* Voz hablada, según lo que ofrezca el dispositivo */
  /** Lee un texto con la voz del astrólogo. Devuelve una promesa que se cumple cuando empieza a sonar; `fin` se llama al terminar o al detenerse. */
  var finDispositivo = null;
  function hablar(p, texto, fin) {
    fin = fin || function () {};
    callar();
    if (window.Voces && Voces.disponible()) return Voces.hablar(p, texto, fin).catch(function () { return hablarDispositivo(p, texto, fin); });
    return hablarDispositivo(p, texto, fin);
  }
  function callar() {
    if (window.Voces) Voces.callar();
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (finDispositivo) { var f = finDispositivo; finDispositivo = null; f(); }
  }
  function hablarDispositivo(p, texto, fin) {
    return new Promise(function (ok, mal) {
      if (!window.speechSynthesis) { fin(); return mal(new Error('sin voz')); }
      var u = new SpeechSynthesisUtterance(texto), vs = speechSynthesis.getVoices().filter(function (v) { return /^es/i.test(v.lang); });
      var fem = /paulina|monica|mónica|marisol|angelica|angélica|isabela|francisca|soledad|helena|laura|sabina|female|mujer/i, mas = /diego|jorge|juan|carlos|eddy|reed|rocko|grandpa|male|hombre/i;
      var pref = vs.filter(function (v) { return (p.genero === 'f' ? fem : mas).test(v.name) && !(p.genero === 'm' && /female/i.test(v.name)); });
      var lista = pref.length ? pref : vs, v = lista.filter(function (x) { return /419|MX|US/.test(x.lang); })[0] || lista[0];
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'es-US'; u.pitch = p.tts.pitch; u.rate = p.tts.rate;
      function cerrar() { if (finDispositivo === cerrar) finDispositivo = null; fin(); }
      finDispositivo = cerrar;
      u.onstart = ok; u.onend = cerrar; u.onerror = function () { cerrar(); mal(new Error('voz')); };
      speechSynthesis.speak(u);
      setTimeout(ok, 1500);
    });
  }

  window.Personas = { LISTA: LISTA, POR_ID: POR_ID, retrato: retrato, dibujo: dibujo, frase: frase, hablar: hablar, callar: callar };
})();
