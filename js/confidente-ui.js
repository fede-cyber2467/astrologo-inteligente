/* Caja de consulta de la pantalla de inicio.
   Con clave de API responde Claude; sin clave, un intérprete local resuelve las preguntas más comunes. */
(function () {
  'use strict';
  var M = Motor, R = Reglas, T = Textos, A = window.App, C = window.Confidente, DIA = 86400000;
  var registro = {}; // burbujas mostradas, por carta

  function plano(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var CLAVES = [
    ['contrato', /contrato|firm|acuerdo/], ['viaje', /viaj|vuelo|vacacion/], ['propuesta', /propon|propuesta|casar|casamiento|pareja|cita|declarar|novi/],
    ['negocio', /negocio|lanz|emprend|inaugur|abrir/], ['trabajo', /entrevista|trabajo|empleo|ascenso|aumento/], ['mudanza', /mud|alquil|departamento/],
    ['comunicar', /public|anunci|enviar|mandar/], ['creativo', /grab|cancion|disco|estren|arte|creativ|show/], ['cerrar', /termin|cerrar|renunci|soltar|cortar/],
    ['conversacion', /hablar|charla|conversa|pedir|decirle/]
  ];
  function rango(t) {
    var hoy = A.inicioDia(new Date()), l = A.lugar();
    if (/mes que viene|proximo mes/.test(t)) {
      var y = +A.ymd(hoy).slice(0, 4), m = +A.ymd(hoy).slice(5, 7) + 1; if (m > 12) { m = 1; y++; }
      var d0 = M.localAUTC(y, m, 1, 0, 0, l.zona);
      return [d0, M.localAUTC(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1, 0, 0, l.zona), 'el mes que viene'];
    }
    if (/esta semana|estos dias/.test(t)) return [hoy, new Date(+hoy + 7 * DIA), 'los próximos 7 días'];
    if (/\bhoy\b/.test(t)) return [hoy, new Date(+hoy + DIA), 'lo que queda de hoy'];
    if (/\bmanana\b/.test(t)) return [new Date(+hoy + DIA), new Date(+hoy + 2 * DIA), 'mañana'];
    return [hoy, new Date(+hoy + 30 * DIA), 'los próximos 30 días'];
  }
  function htmlMomentos(acc, rg) {
    var l = A.lugar(), e = A.est, paso = rg[1] - rg[0] > 21 * DIA ? 30 : 15, desde = new Date(Math.max(+rg[0], Date.now()));
    var ms = R.escanear({ desde: desde, hasta: new Date(+rg[1] - 1), lat: l.lat, lon: l.lon, accion: acc.id, natal: e.natal, pasoMin: paso, zona: l.zona, horaMin: 8, horaMax: 22 });
    if (!ms.length) return '<p>En ' + rg[2] + ' ya no queda horario diurno para evaluar. Prueba con un rango más largo.</p>';
    var vs = R.ventanas(ms, paso, 3);
    var intro = vs[0].puntaje >= 62 ? 'Para <b>' + A.h(acc.n.toLowerCase()) + '</b>, en ' + rg[2] + ' estos son tus mejores momentos:'
      : 'No es un gran período para <b>' + A.h(acc.n.toLowerCase()) + '</b>. Si no puedes esperar, lo mejor disponible en ' + rg[2] + ' es:';
    return '<p>' + intro + '</p>' + vs.map(function (v) {
      var r = R.puntuar(v.pico, l.lat, l.lon, acc, e.natal, {}), rl = T.resumenLlano(r.factores);
      return '<div class="vent"><b style="text-transform:capitalize">' + A.fDia(v.inicio) + '</b>, de ' + A.fHora(v.inicio) + ' a ' + A.fHora(v.fin) +
        ' <span class="chip ' + (v.puntaje >= 62 ? 'bien' : v.puntaje < 45 ? 'mal' : '') + '">' + R.etiqueta(v.puntaje) + ' · ' + v.puntaje + '</span>' +
        (rl.favor.length ? '<div>A favor: ' + A.h(rl.favor.join('. ')) + '.</div>' : '') + (rl.contra.length ? '<div class="suave">A tener en cuenta: ' + A.h(rl.contra.join('. ')) + '.</div>' : '') +
        '<details><summary>Ver el detalle astrológico</summary>' + A.htmlFactores(r.factores) + '</details></div>';
    }).join('') + '<p class="suave">' + A.h(acc.desc) + ' En "Elegir momento" puedes afinar fechas y horarios.</p>';
  }
  function htmlClima(que, d0, d1, conLuna) {
    var tx = T.textoClima(R.clima(A.est.natal, d0, d1, conLuna), que, A.persona());
    return '<p><b>' + A.h(tx.titulo) + '.</b> ' + A.h(tx.texto) + '</p><p class="suave">Más abajo, en "¿Por qué?", está de dónde sale.</p>';
  }
  /** Respuesta sin IA para las consultas más comunes; null si no la entiende. */
  function local(txt) {
    var t = plano(txt), hoy = A.inicioDia(new Date()), e = A.est;
    if (/como (viene|va|pinta|esta|estoy)|que me espera|energia|tema (central )?de/.test(t)) {
      if (/\bano\b/.test(t)) return '<p class="suave">De hoy a 12 meses (hasta ' + A.fConAnio(new Date(+hoy + 365 * DIA)) + ').</p>' + T.fraseProfeccion(R.anual(e.natal, e.nac, hoy)).map(function (p) { return '<p>' + A.h(p) + '</p>'; }).join('') + '<p class="suave">El detalle de tránsitos y eclipses está en "Pronóstico".</p>';
      if (/\bmes\b/.test(t)) return htmlClima('Mes', hoy, new Date(+hoy + 30 * DIA));
      if (/semana/.test(t)) return htmlClima('Semana', hoy, new Date(+hoy + 7 * DIA));
      return htmlClima('Día', hoy, new Date(+hoy + DIA), true);
    }
    for (var i = 0; i < CLAVES.length; i++) if (CLAVES[i][1].test(t)) return htmlMomentos(R.ACC[CLAVES[i][0]], rango(t));
    if (/cuando|conviene|mejor (dia|momento|fecha)|empezar|iniciar|arrancar/.test(t)) return htmlMomentos(R.ACC.general, rango(t));
    return null;
  }

  function fmt(t) { return A.h(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function montar(el) {
    var id = A.est.perfil.id + ':' + ((A.persona() || {}).id || ''), clave = A.leer('astro.clave', ''), activo = !!clave && A.leer('astro.ia', true) !== false, reg = registro[id] = registro[id] || [], hilo = C.hilos[id] = C.hilos[id] || [];
    el.innerHTML =
      '<form class="entrada" id="cForm"><textarea id="cTxt" placeholder="' + A.h((A.persona() || {}).lugar || 'Escribe tu consulta') + '"></textarea><button type="button" id="cMic" class="mic" title="Hablar en vez de escribir" aria-label="Hablar en vez de escribir"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button id="cEnviar" class="enviar" title="Consultar" aria-label="Consultar"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg></button></form>' +
      '<div class="modo"><label class="perilla"><input type="checkbox" id="cModo"' + (activo ? ' checked' : '') + '><span class="pista"></span><b>Modo inteligente</b></label>' +
      '<span class="nota" id="cModoTxt">' + (activo ? 'Conversa de lo que quieras: relaciono todo tu panorama.' : 'Apagado: respondo cuándo conviene algo y cómo viene tu día, semana, mes o año.') + '</span>' +
      (clave ? '<a href="#" class="nota" id="cInvitar2">Invitar</a><a href="#" class="nota" id="cVerClave">Clave</a>' : '') + '</div>' +
      '<div class="sugerencias" id="cSug">' + ['¿Cómo viene mi semana?', '¿Cuándo me conviene firmar un contrato?', 'Quiero viajar el mes que viene', '¿Cuál es el tema de mi año?'].map(function (s) { return '<button type="button">' + s + '</button>'; }).join('') + '</div>' +
      '<div class="chat" id="cChat"></div>' +
      '<div class="config" id="cPanel" hidden>' +
      (clave ? '<p class="nota">Con el modo inteligente, tus mensajes y tu carta se envían a Anthropic para generar cada respuesta. <a href="#" id="cQuitar">Quitar la clave de este navegador</a></p>' +
          '<div class="fila" style="align-items:center"><button type="button" class="sec" id="cInvitar">Copiar invitación</button><span class="nota" id="cInvTxt" style="margin:0;flex:1">Copia un mensaje con el enlace y un código. Quien lo use tendrá el modo inteligente y las voces con tus claves: pásalo solo a quien quieras que la pruebe.</span></div>'
        : '<p class="nota">Para encenderlo hace falta una clave de API de Claude (se crea en platform.claude.com y se paga por uso). Queda guardada solo en este navegador y viaja únicamente a Anthropic, junto con tu carta y tus mensajes.</p>' +
          '<div class="fila"><input id="cClave" type="password" autocomplete="off" placeholder="Clave sk-ant-… o mensaje de invitación"><button type="button" id="cGuardar">Encender</button></div>') + '</div>';
    var chat = el.querySelector('#cChat'), txtEl = el.querySelector('#cTxt'), btn = el.querySelector('#cEnviar');
    var porVoz = false;
    el.classList.add('czona'); el.classList.toggle('conversando', reg.length > 0);
    if (reg.length) txtEl.placeholder = 'Sigue la conversación…';
    function hablable(d) { var c = d.cloneNode(true); c.querySelectorAll('details, .oir, .chip, .suave').forEach(function (x) { x.remove(); }); return c.textContent; }
    function burbuja(cls, html, guardar) { var d = document.createElement('div'); d.className = 'msj ' + cls; d.innerHTML = html; chat.appendChild(d); if (guardar !== false) reg.push([cls, html]);
      if (/^ia/.test(cls) && A.persona() && (window.speechSynthesis || (window.Voces && Voces.disponible()))) {
        var o = document.createElement('button'); o.type = 'button'; o.className = 'oir'; o.textContent = 'Escuchar';
        o.onclick = function () {
          if (o.dataset.estado === 'sonando') { Personas.callar(); return; }
          if (o.dataset.estado === 'cargando') return;
          function soltar() { o.disabled = false; o.dataset.estado = ''; o.textContent = 'Escuchar'; }
          o.disabled = true; o.dataset.estado = 'cargando'; o.innerHTML = '<span class="girando"></span>Preparando la voz…';
          Personas.hablar(A.persona(), hablable(d), soltar).then(function () { if (o.dataset.estado === 'cargando') { o.disabled = false; o.dataset.estado = 'sonando'; o.textContent = 'Detener'; } }, soltar);
        };
        d.appendChild(o);
      }
      return d; }
    reg.slice().forEach(function (b) { burbuja(b[0], b[1], false); });
    function enviar(txt) {
      txt = txt.trim(); if (!txt || btn.disabled) return;
      txtEl.value = ''; btn.disabled = true; el.classList.add('conversando');
      burbuja('yo', A.h(txt));
      var est = burbuja('sis', 'Mirando tu cielo…', false);
      function listo(cls, html) { est.remove(); var b = burbuja(cls, html); btn.disabled = false; txtEl.placeholder = lugarTxt = 'Sigue la conversación…'; b.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (porVoz && /^ia/.test(cls) && b.querySelector('.oir')) b.querySelector('.oir').click(); porVoz = false; }
      if (activo) {
        var largo = hilo.length; hilo.push({ role: 'user', content: txt });
        C.conversar(hilo, function (p) { est.textContent = p; }).then(function (r) { listo('ia texto', fmt(r)); })
          .catch(function (e) { hilo.length = largo; listo('sis', 'No pude responder: ' + A.h(e.message === 'Failed to fetch' ? 'no hay conexión con Anthropic.' : e.message)); });
      } else {
        setTimeout(function () {
          var r; try { r = local(txt); } catch (e) { r = null; }
          listo('ia', r || '<p>Esa pregunta necesita mi parte más inteligente, que todavía no está activada. Por ahora puedo decirte <b>cuándo conviene</b> hacer algo (un viaje, una firma, una propuesta, un lanzamiento, una charla difícil) y <b>cómo viene</b> tu día, tu semana, tu mes o tu año.</p><p class="suave">Para conversar libremente, enciende la perilla "Modo inteligente" aquí arriba.</p>');
        }, 30);
      }
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = el.querySelector('#cMic'), rec = null, lugarTxt = txtEl.placeholder;
    mic.onclick = function () {
      if (!SR) { burbuja('sis', 'Este navegador no permite hablarme. Prueba en Chrome o en Safari.', false); return; }
      if (rec) { rec.stop(); return; }
      Personas.callar();
      var dicho = '';
      rec = new SR(); rec.lang = /^es/i.test(navigator.language || '') ? navigator.language : 'es-US'; rec.interimResults = true; rec.continuous = false;
      rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; txtEl.value = dicho = t; };
      rec.onerror = function (e) {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        burbuja('sis', e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Necesito permiso para usar el micrófono. Revisa el permiso del navegador para esta página.' : 'No pude escucharte (' + A.h(e.error) + '). Prueba de nuevo o escribime.', false);
      };
      rec.onend = function () { rec = null; mic.classList.remove('grabando'); txtEl.placeholder = lugarTxt; if (dicho.trim()) { porVoz = true; enviar(dicho); } };
      mic.classList.add('grabando'); txtEl.value = ''; txtEl.placeholder = 'Te escucho… toca el micrófono cuando termines.';
      try { rec.start(); } catch (err) { rec = null; mic.classList.remove('grabando'); txtEl.placeholder = lugarTxt; }
    };
    el.querySelector('#cForm').onsubmit = function (ev) { ev.preventDefault(); enviar(txtEl.value); };
    txtEl.onkeydown = function (ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(this.value); } };
    el.querySelector('#cSug').onclick = function (ev) { if (ev.target.tagName === 'BUTTON') enviar(ev.target.textContent); };
    var modo = el.querySelector('#cModo'), panel = el.querySelector('#cPanel'), ver = el.querySelector('#cVerClave');
    el.querySelector('.modo').after(panel);
    modo.onchange = function () {
      if (clave) { A.guardar('astro.ia', modo.checked); montar(el); }
      else { panel.hidden = !modo.checked; if (modo.checked) el.querySelector('#cClave').focus(); }
    };
    if (ver) ver.onclick = function (ev) { ev.preventDefault(); panel.hidden = !panel.hidden; };
    var inv = el.querySelector('#cInvitar'), inv2 = el.querySelector('#cInvitar2');
    if (inv2) inv2.onclick = function (ev) { ev.preventDefault(); el.querySelector('#cPanel').hidden = false; inv.onclick(); };
    if (inv) inv.onclick = function () {
      var u = A.enlaceInvitacion(), t = el.querySelector('#cInvTxt');
      function ok() { t.textContent = 'Mensaje copiado. Pégalo tal cual en un chat privado con la persona que va a probar.'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, function () { window.prompt('Copia este mensaje:', u); });
      else window.prompt('Copia este mensaje:', u);
    };
    var g = el.querySelector('#cGuardar'), q = el.querySelector('#cQuitar');
    if (g) g.onclick = function () { var v = el.querySelector('#cClave').value.trim(); if (v && A.aplicarInvitacion(v)) { montar(el); return; } if (v) { A.guardar('astro.clave', v); A.guardar('astro.ia', true); montar(el); } };
    if (q) q.onclick = function (ev) { ev.preventDefault(); try { localStorage.removeItem('astro.clave'); } catch (e) { /* nada */ } montar(el); };
  }

  window.ConfidenteUI = { montar: montar, local: local };
})();
