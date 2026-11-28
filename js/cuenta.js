/* Cuenta de usuario: inicio de sesión por correo y llamadas al servidor propio (Supabase).
   La clave de abajo es la "publicable": está pensada para ir en la app y no da acceso privilegiado. */
(function () {
  'use strict';
  var URL_SERVIDOR = 'https://mptlqsvtlhxhpuhvbicw.supabase.co', CLAVE_PUBLICA = 'sb_publishable_KLeNNdTzX8-DzVc047QV_w_CmD4t97I';
  var cli = null, sesion = null, oyentes = [];
  try { if (window.supabase && /^(https?|capacitor):/.test(location.protocol)) cli = window.supabase.createClient(URL_SERVIDOR, CLAVE_PUBLICA); } catch (e) { cli = null; }
  function avisar() { oyentes.forEach(function (f) { try { f(); } catch (e) { /* nada */ } }); }
  if (cli) {
    cli.auth.getSession().then(function (r) { sesion = r.data.session; avisar(); });
    cli.auth.onAuthStateChange(function (ev, s) { var antes = !!sesion; sesion = s; if (antes !== !!s) avisar(); });
  }
  // Dentro de la app del teléfono, el enlace del correo vuelve a la app con esta dirección propia.
  var NATIVA = !!window.Capacitor, VUELTA = 'uraluna://entrar';
  function abrirEnlace(url) {
    if (!cli || !url || url.indexOf(VUELTA) !== 0) return;
    var p = new URLSearchParams((url.split('#')[1] || url.split('?')[1] || '')), a = p.get('access_token'), r = p.get('refresh_token');
    if (a && r) cli.auth.setSession({ access_token: a, refresh_token: r }).then(function (x) { if (!x.error) { sesion = x.data.session; avisar(); } });
  }
  if (NATIVA && cli && window.Capacitor.Plugins && window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.addListener('appUrlOpen', function (e) { abrirEnlace(e && e.url); });
  /** Envía al correo un enlace para entrar. */
  function entrar(correo) {
    if (!cli) return Promise.reject(new Error('Las cuentas no están disponibles abriendo la app como archivo. Usa la dirección web.'));
    return cli.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: NATIVA ? VUELTA : location.origin + location.pathname } }).then(function (r) {
      if (r.error) throw new Error(/rate limit/i.test(r.error.message) ? 'Se enviaron demasiados correos en poco tiempo. Prueba de nuevo en un rato.' : r.error.message);
    });
  }
  function salir() { return cli ? cli.auth.signOut().then(function () { sesion = null; avisar(); }) : Promise.resolve(); }
  /** Llama a una función del servidor con la sesión de la persona. */
  function llamar(funcion, cuerpo) {
    return cli.auth.getSession().then(function (r) {
      sesion = r.data.session;
      if (!sesion) throw new Error('Tu sesión venció. Vuelve a entrar con tu correo.');
      return fetch(URL_SERVIDOR + '/functions/v1/' + funcion, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.access_token, apikey: CLAVE_PUBLICA }, body: JSON.stringify(cuerpo) });
    }).then(function (r) {
      return r.json().then(function (j) {
        if (r.ok) return j;
        var e = j && j.error, err = new Error((e && (e.message || e)) || ('Error ' + r.status)); err.tope = !!(j && j.tope); throw err;
      });
    });
  }
  window.Cuenta = {
    disponible: function () { return !!cli; }, activa: function () { return !!sesion; },
    correo: function () { return sesion && sesion.user ? sesion.user.email : ''; },
    entrar: entrar, salir: salir, llamar: llamar, alCambiar: function (f) { oyentes.push(f); }
  };
})();
