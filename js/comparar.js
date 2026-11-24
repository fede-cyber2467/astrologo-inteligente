/* Pantalla de prueba: las mismas preguntas respondidas por tres modelos, lado a lado, con tiempo y costo medidos. */
(function () {
  'use strict';
  var A = window.App, C = window.Confidente;
  // precios por millón de unidades: entrada, salida, lectura de caché
  var MODELOS = [
    { id: 'claude-opus-5-5', n: 'Opus 5.5', p: [4, 20, 0.2] },
    { id: 'claude-sonnet-5-5', n: 'Sonnet 5.5', p: [2, 10, 0.1] },
    { id: 'claude-haiku-5-5', n: 'Haiku 5.5', p: [0.1, 0.5, 0.01] }
  ];
  var PREGUNTAS = [
    '¿Cómo viene mi semana?',
    'Estoy pensando en dejar mi trabajo para empezar algo propio. ¿Es buen momento?',
    'Me separé hace poco y me está costando. ¿Qué estoy atravesando?',
    '¿Cuándo me conviene firmar un contrato este mes?',
    '¿Qué dice mi carta sobre mi relación con el dinero?'
  ];
  var resultados = null, corriendo = false;
  function costo(m, u) { return (u.entrada * m.p[0] + u.cacheEscrita * m.p[0] * 1.25 + u.cacheLeida * m.p[2] + u.salida * m.p[1]) / 1e6; }
  function fmt(t) { return A.h(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(«"])\*([^*\n]+?)\*/g, '$1<i>$2</i>'); }

  function pintar(el) {
    var per = A.persona();
    var h = '<div class="tarjeta"><h2>Comparar modelos</h2><p class="suave">Pantalla de prueba. Hace las mismas cinco preguntas a tres modelos de Claude, con la carta de <b>' + A.h(A.est.perfil.nombre) + '</b> y la voz de <b>' + (per ? per.n : '—') + '</b>, y muestra las respuestas lado a lado con el tiempo y el costo real de cada una. Correrla completa cuesta alrededor de 60 centavos de dólar.</p>' +
      '<button id="cmpCorrer"' + (corriendo ? ' disabled' : '') + '>' + (resultados ? 'Volver a correr' : 'Correr la comparación') + '</button> <span class="nota" id="cmpEstado"></span></div>';
    if (resultados) {
      var tot = MODELOS.map(function (m, i) { var c = 0, s = 0, n = 0; resultados.forEach(function (r) { if (r[i] && !r[i].error) { c += r[i].costo; s += r[i].seg; n++; } }); return { c: c, s: s, n: n }; });
      h += '<div class="tarjeta"><h3>Resumen</h3><div class="tabla-scroll"><table><tr><th>Modelo</th><th>Costo por consulta</th><th>Tiempo por consulta</th><th>1.000 usuarios, 1 por día</th><th>1.000 usuarios, tope de 5 por día</th></tr>' +
        MODELOS.map(function (m, i) { var t = tot[i]; if (!t.n) return '<tr><td>' + m.n + '</td><td colspan="4">sin datos</td></tr>'; var pc = t.c / t.n;
          return '<tr><td><b>' + m.n + '</b></td><td>' + (pc * 100).toFixed(2).replace('.', ',') + ' centavos</td><td>' + Math.round(t.s / t.n) + ' s</td><td>USD ' + Math.round(pc * 30000).toLocaleString('es') + '</td><td>USD ' + Math.round(pc * 150000).toLocaleString('es') + '</td></tr>'; }).join('') + '</table></div></div>';
      resultados.forEach(function (r, q) {
        h += '<div class="tarjeta"><h3>' + (q + 1) + '. ' + A.h(PREGUNTAS[q]) + '</h3><div class="cmp">' + MODELOS.map(function (m, i) {
          var x = r[i]; if (!x) return '<div class="cmp-col"><b>' + m.n + '</b><p class="suave">Pendiente…</p></div>';
          if (x.error) return '<div class="cmp-col"><b>' + m.n + '</b><p class="neg">' + A.h(x.error) + '</p></div>';
          return '<div class="cmp-col"><b>' + m.n + '</b><div class="suave">' + x.seg + ' s · ' + (x.costo * 100).toFixed(2).replace('.', ',') + ' centavos · ' + x.palabras + ' palabras</div><div class="cmp-txt">' + fmt(x.texto) + '</div></div>';
        }).join('') + '</div></div>';
      });
    }
    el.innerHTML = h;
    el.querySelector('#cmpCorrer').onclick = function () { correr(el); };
  }
  function correr(el) {
    if (corriendo) return; corriendo = true;
    resultados = PREGUNTAS.map(function () { return []; });
    var cola = []; PREGUNTAS.forEach(function (_, q) { MODELOS.forEach(function (_, i) { cola.push([q, i]); }); });
    function sig() {
      if (!cola.length) { corriendo = false; pintar(el); return; }
      var t = cola.shift(), q = t[0], i = t[1], m = MODELOS[i], hilo = [{ role: 'user', content: PREGUNTAS[q] }], t0 = Date.now();
      hilo.modelo = m.id;
      pintar(el); el.querySelector('#cmpEstado').textContent = 'Pregunta ' + (q + 1) + ' de ' + PREGUNTAS.length + ', ' + m.n + '…';
      C.conversar(hilo, function () {}).then(function (txt) {
        resultados[q][i] = { texto: txt, seg: Math.round((Date.now() - t0) / 1000), costo: costo(m, hilo.uso || { entrada: 0, salida: 0, cacheLeida: 0, cacheEscrita: 0 }), palabras: txt.split(/\s+/).length };
      }, function (e) { resultados[q][i] = { error: e.message }; }).then(sig);
    }
    sig();
  }
  window.Comparar = { render: pintar, resultados: function () { return resultados; }, corriendo: function () { return corriendo; } };
})();
