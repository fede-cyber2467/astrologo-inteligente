/* Pantalla de prueba de voces de Google Cloud Text-to-Speech.
   La clave de Google queda solo en este navegador y viaja únicamente a texttospeech.googleapis.com (en un encabezado, no en la dirección). */
(function () {
  'use strict';
  var A = window.App, BASE = 'https://texttospeech.googleapis.com/';
  var TIPOS = [
    { id: 'wavenet', n: 'WaveNet (la más económica)', re: /Wavenet/i, precio: 4 },
    { id: 'standard', n: 'Standard (básica)', re: /Standard/i, precio: 4 },
    { id: 'neural2', n: 'Neural2', re: /Neural2/i, precio: 16 },
    { id: 'chirp', n: 'Chirp 3 HD', re: /Chirp3-HD/i, precio: 30 },
    { id: 'gemini31', n: 'Gemini 3.1 Flash TTS (la del probador de Google)', modelo: 'gemini-3.1-flash-tts-preview' },
    { id: 'gemini25', n: 'Gemini 2.5 Flash TTS', modelo: 'gemini-2.5-flash-tts' }
  ];
  var GEM_M = ['Algenib', 'Charon', 'Puck', 'Fenrir', 'Orus', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Rasalgethi', 'Alnilam', 'Schedar', 'Achird', 'Zubenelgenubi', 'Sadachbia', 'Sadaltager'];
  var GEM_F = ['Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome', 'Laomedeia', 'Achernar', 'Gacrux', 'Pulcherrima', 'Vindemiatrix', 'Sulafat'];
  var ESTILO = {
    augusto: 'Voz de hombre maduro, grave, sobria y firme. Ritmo pausado y seguro, sin dramatizar. Español latinoamericano neutro.',
    alma: 'Voz de mujer cálida, serena y cercana, con pausas suaves, como quien acompaña. Español latinoamericano neutro.',
    tomas: 'Voz de hombre joven, clara, ágil y práctica, tono cotidiano y directo. Español latinoamericano neutro.',
    bruno: 'Voz de hombre profesional, medida y segura, tono de asesor de negocios. Español latinoamericano neutro.',
    vera: 'Voz de mujer dulce y contenedora, hablando despacio y con ternura. Español latinoamericano neutro.'
  };
  var voces = null, sonando = null;
  /* Voz por defecto de cada astrólogo (WaveNet, español latino); se puede cambiar desde esta pantalla */
  var DEFECTO = {
    augusto: { tipo: 'wavenet', voz: 'es-US-Wavenet-B', lang: 'es-US', pitch: -3, rate: 0.96 },
    alma: { tipo: 'wavenet', voz: 'es-US-Wavenet-A', lang: 'es-US', pitch: -1, rate: 0.95 },
    tomas: { tipo: 'wavenet', voz: 'es-US-Wavenet-C', lang: 'es-US', pitch: 0, rate: 1.06 },
    bruno: { tipo: 'wavenet', voz: 'es-US-Wavenet-B', lang: 'es-US', pitch: 0.5, rate: 1 },
    vera: { tipo: 'wavenet', voz: 'es-US-Wavenet-A', lang: 'es-US', pitch: 1.5, rate: 0.97 }
  };
  function config(id) { return (A.leer('astro.voces', {}) || {})[id] || DEFECTO[id]; }
  function tipoDe(id) { return TIPOS.filter(function (x) { return x.id === id; })[0]; }
  function sintetizar(c, texto) {
    var x = tipoDe(c.tipo);
    function intento(cod) {
      var cuerpo = { input: { text: texto.slice(0, 4500) }, voice: { languageCode: c.lang, name: c.voz }, audioConfig: { audioEncoding: cod } };
      if (x.modelo) { cuerpo.voice.modelName = x.modelo; if (c.estilo) cuerpo.input.prompt = c.estilo; }
      else if (x.id !== 'chirp') { cuerpo.audioConfig.pitch = +c.pitch || 0; cuerpo.audioConfig.speakingRate = +c.rate || 1; }
      return pedir((x.modelo ? 'v1beta1' : 'v1') + '/text:synthesize', cuerpo).then(function (j) { return 'data:audio/' + (cod === 'MP3' ? 'mpeg' : 'wav') + ';base64,' + j.audioContent; });
    }
    return intento('MP3').catch(function (e) { if (x.modelo && /encod|MP3/i.test(e.message)) return intento('LINEAR16'); throw e; });
  }
  function callar() { if (sonando) { sonando.pause(); sonando = null; } }
  /** Lee un texto con la voz del astrólogo. Devuelve una promesa que falla si no hay clave o Google rechaza el pedido. */
  function hablar(per, texto) {
    callar();
    return sintetizar(config(per.id), texto).then(function (src) { callar(); sonando = new Audio(src); return sonando.play(); });
  }

  function pedir(ruta, cuerpo) {
    var clave = A.leer('astro.gclave', '');
    return fetch(BASE + ruta, { method: cuerpo ? 'POST' : 'GET', headers: { 'X-Goog-Api-Key': clave, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || ('Error ' + r.status)); return j; }); });
  }

  function render(el) {
    var clave = A.leer('astro.gclave', '');
    if (!clave) {
      el.innerHTML = '<div class="tarjeta"><h2>Probar voces</h2><p>Esta pantalla es de prueba: sirve para escuchar a cada astrólogo con los distintos tipos de voz de Google y comparar calidad y precio antes de elegir.</p>' +
        '<p>Necesita una clave de API de Google Cloud con el servicio Text-to-Speech habilitado.</p>' +
        '<div class="fila"><input id="vClave" type="password" autocomplete="off" placeholder="Clave de API de Google (empieza con AIza…)"><button id="vGuardar">Guardar</button></div>' +
        '<p class="nota">La clave queda solo en este navegador y se envía únicamente a Google, junto con el texto que quieras escuchar.</p></div>';
      el.querySelector('#vGuardar').onclick = function () { var v = el.querySelector('#vClave').value.trim(); if (v) { A.guardar('astro.gclave', v); voces = null; render(el); } };
      return;
    }
    el.innerHTML = '<div class="tarjeta"><h2>Probar voces</h2><p class="suave">Pantalla de prueba. Elige astrólogo y tipo de voz, y escucha la misma frase con cada uno.</p>' +
      '<div class="fila"><label>Astrólogo<select id="vPer">' + Personas.LISTA.map(function (p) { return '<option value="' + p.id + '">' + p.n + ' · ' + p.rol + '</option>'; }).join('') + '</select></label>' +
      '<label>Tipo de voz<select id="vTipo">' + TIPOS.map(function (t) { return '<option value="' + t.id + '">' + t.n + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="fila"><label>Voz<select id="vVoz"></select></label></div>' +
      '<div class="fila" id="vAjustes"><label>Tono: <b id="vPitchN"></b><input type="range" id="vPitch" min="-8" max="8" step="0.5"></label><label>Velocidad: <b id="vRateN"></b><input type="range" id="vRate" min="0.8" max="1.25" step="0.01"></label></div>' +
      '<label>Texto<textarea id="vTxt" style="height:96px"></textarea></label>' +
      '<label id="vEstiloL">Indicaciones de tono (solo Gemini)<input id="vEstilo"></label>' +
      '<div class="fila" style="align-items:center"><button id="vOir">Escuchar</button><button id="vUsar" class="sec">Usar esta voz</button><span class="nota" id="vInfo" style="margin:0;flex:1"></span></div>' +
      '<audio id="vAudio" controls style="width:100%;margin-top:10px" hidden></audio>' +
      '<p class="nota" style="margin-top:12px"><a href="#" id="vQuitar">Quitar la clave de Google de este navegador</a></p></div>';
    var $ = function (s) { return el.querySelector(s); }, per = $('#vPer'), tipo = $('#vTipo'), voz = $('#vVoz'), txt = $('#vTxt'), info = $('#vInfo'), estilo = $('#vEstilo');
    var actual = A.persona(); if (actual) per.value = actual.id;
    function p() { return Personas.POR_ID[per.value]; }
    function t() { return TIPOS.filter(function (x) { return x.id === tipo.value; })[0]; }
    var pitch = $('#vPitch'), rate = $('#vRate');
    function numeros() { $('#vPitchN').textContent = (+pitch.value > 0 ? '+' : '') + (+pitch.value).toString().replace('.', ','); $('#vRateN').textContent = (+rate.value).toFixed(2).replace('.', ','); }
    pitch.oninput = rate.oninput = numeros;
    function ponerTexto() {
      var c = config(p().id);
      txt.value = p().muestra.replace(/"/g, '') + ' ' + p().clima.neutro + ' ' + p().clima.exige; estilo.value = c.estilo || ESTILO[p().id];
      tipo.value = c.tipo; pitch.value = c.pitch || 0; rate.value = c.rate || 1; numeros();
      $('#vUsar').textContent = 'Usar esta voz para ' + p().n;
    }
    function elegida() {
      var o = voz.options[voz.selectedIndex]; if (!o || !o.value) return null;
      return { tipo: tipo.value, voz: o.value, lang: o.dataset.lang, pitch: +pitch.value, rate: +rate.value, estilo: t().modelo ? estilo.value.trim() : '' };
    }
    function costo() {
      var n = txt.value.length, x = t();
      info.textContent = n + ' caracteres. ' + (x.precio ? 'Costo aproximado de esta frase: USD ' + (n * x.precio / 1e6).toFixed(5) + ' (USD ' + x.precio + ' por millón de caracteres).' : 'Gemini se cobra por duración del audio: alrededor de USD 0,015 por minuto, a confirmar.');
    }
    function ponerVoces() {
      var x = t(), fem = p().genero === 'f', ops = [];
      $('#vEstiloL').hidden = !x.modelo;
      if (x.modelo) ops = (fem ? GEM_F : GEM_M).map(function (n) { return { v: n, n: n, lang: 'es-419' }; });
      else if (voces) {
        ops = voces.filter(function (v) { return x.re.test(v.name) && (v.ssmlGender === (fem ? 'FEMALE' : 'MALE')); })
          .sort(function (a, b) { return (/es-US/.test(b.name) - /es-US/.test(a.name)) || a.name.localeCompare(b.name); })
          .map(function (v) { return { v: v.name, n: v.name + ' (' + v.languageCodes[0] + ')', lang: v.languageCodes[0] }; });
      }
      $('#vAjustes').hidden = !!x.modelo || x.id === 'chirp';
      voz.innerHTML = ops.map(function (o) { return '<option value="' + o.v + '" data-lang="' + o.lang + '">' + o.n + '</option>'; }).join('') || '<option value="">No hay voces de este tipo para ese género</option>';
      var guardada = config(p().id); if (guardada.tipo === x.id) voz.value = guardada.voz; if (voz.selectedIndex < 0) voz.selectedIndex = 0;
      costo();
    }
    per.onchange = function () { ponerTexto(); ponerVoces(); }; tipo.onchange = ponerVoces; txt.oninput = costo;
    ponerTexto(); ponerVoces();
    if (!voces) {
      info.textContent = 'Cargando la lista de voces…';
      pedir('v1/voices').then(function (j) { voces = (j.voices || []).filter(function (v) { return /^es/i.test(v.languageCodes[0]); }); ponerVoces(); })
        .catch(function (e) { info.textContent = 'No pude cargar las voces: ' + e.message; });
    }
    $('#vOir').onclick = function () {
      var c = elegida(), b = this, audio = $('#vAudio');
      if (!c || !txt.value.trim()) return;
      b.disabled = true; info.textContent = 'Generando el audio…'; callar();
      sintetizar(c, txt.value).then(function (src) { audio.src = src; audio.hidden = false; costo(); return audio.play(); })
        .catch(function (e) { info.textContent = 'No se pudo generar: ' + e.message; })
        .then(function () { b.disabled = false; });
    };
    $('#vUsar').onclick = function () {
      var c = elegida(); if (!c) return;
      var todas = A.leer('astro.voces', {}) || {}; todas[p().id] = c; A.guardar('astro.voces', todas);
      info.textContent = 'Listo: ' + p().n + ' va a hablar con esta voz en toda la app.';
    };
    $('#vQuitar').onclick = function (ev) { ev.preventDefault(); try { localStorage.removeItem('astro.gclave'); } catch (e) { /* nada */ } voces = null; render(el); };
  }

  window.Voces = { render: render, hablar: hablar, callar: callar, disponible: function () { return !!A.leer('astro.gclave', ''); }, config: config };
})();
