/* Biblioteca de consulta: textos clásicos de astrología en dominio público, cortados en pasajes.
   Se descarga recién cuando el astrólogo la necesita y se busca dentro del navegador (BM25), sin servicios externos. */
(function () {
  'use strict';
  var catalogo = null, cargada = null, docs = [], indice = Object.create(null), largoMedio = 0;
  var VACIAS = {}; 'the and for that with this from are was were not but have has had his her its their they them you your shall will may can which who whom what when where there here then than into unto upon also such any all one two our out very more most some other these those being been doth hath thee thou thy him she he'.split(' ').forEach(function (w) { VACIAS[w] = 1; });

  function palabras(t) {
    var m = t.toLowerCase().match(/[a-zà-ÿ]{3,}/g) || [], out = [];
    for (var i = 0; i < m.length; i++) { var w = m[i]; if (VACIAS[w]) continue; if (w.length > 4 && w.charAt(w.length - 1) === 's') w = w.slice(0, -1); out.push(w); }
    return out;
  }
  /** Lee el catálogo (liviano). Si no existe, la biblioteca queda como no disponible. */
  function iniciar() {
    return fetch('biblioteca/catalogo.json').then(function (r) { if (!r.ok) throw new Error('sin biblioteca'); return r.json(); })
      .then(function (c) { catalogo = c && c.length ? c : null; return catalogo; }).catch(function () { catalogo = null; return null; });
  }
  function cargar() {
    if (cargada) return cargada;
    cargada = Promise.all(catalogo.map(function (o) { return fetch('biblioteca/' + o.id + '.json').then(function (r) { return r.json(); }).catch(function () { return null; }); })).then(function (libros) {
      var suma = 0;
      libros.forEach(function (l) {
        if (!l) return;
        l.pasajes.forEach(function (p) {
          var id = docs.length, ws = palabras(p), tf = Object.create(null);
          docs.push({ obra: l.titulo, autor: l.autor, anio: l.anio, libro: l.id, texto: p, n: ws.length });
          suma += ws.length;
          ws.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
          for (var w in tf) (indice[w] || (indice[w] = [])).push(id, tf[w]);
        });
      });
      largoMedio = suma / Math.max(1, docs.length);
    });
    return cargada;
  }
  /** Devuelve los pasajes más pertinentes para una consulta (en inglés: los textos están en inglés). */
  function buscar(consulta, autor, cuantos) {
    return cargar().then(function () {
      var qs = palabras(String(consulta || '')), puntaje = Object.create(null), N = docs.length, k1 = 1.4, b = 0.75;
      var filtro = autor ? String(autor).toLowerCase() : '';
      qs.forEach(function (w) {
        var lista = indice[w]; if (!lista) return;
        var idf = Math.log(1 + (N - lista.length / 2 + 0.5) / (lista.length / 2 + 0.5));
        for (var i = 0; i < lista.length; i += 2) {
          var d = docs[lista[i]], tf = lista[i + 1];
          puntaje[lista[i]] = (puntaje[lista[i]] || 0) + idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * d.n / largoMedio));
        }
      });
      var ids = Object.keys(puntaje).filter(function (id) { return !filtro || docs[id].autor.toLowerCase().indexOf(filtro) >= 0 || docs[id].obra.toLowerCase().indexOf(filtro) >= 0; });
      ids.sort(function (x, y) { return puntaje[y] - puntaje[x]; });
      var vistos = {}, out = [];
      for (var i = 0; i < ids.length && out.length < (cuantos || 4); i++) {
        var d = docs[ids[i]];
        vistos[d.libro] = (vistos[d.libro] || 0) + 1;
        if (vistos[d.libro] > 2) continue; // variedad: no más de dos pasajes del mismo libro
        out.push({ obra: d.obra, autor: d.autor, anio: d.anio, pasaje: d.texto });
      }
      return out;
    });
  }
  window.Biblioteca = { iniciar: iniciar, buscar: buscar, disponible: function () { return !!catalogo; }, catalogo: function () { return catalogo || []; } };
})();
