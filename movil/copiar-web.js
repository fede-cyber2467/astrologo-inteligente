/* Copia la web (la carpeta de arriba) a movil/www, que es lo que Capacitor empaqueta en la app. */
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), destino = path.join(__dirname, 'www');
const QUE = ['index.html', 'css', 'js', 'img', 'datos', 'biblioteca'];
const SALTAR = [path.join('biblioteca', 'fuentes')];
fs.rmSync(destino, { recursive: true, force: true });
for (const q of QUE) fs.cpSync(path.join(raiz, q), path.join(destino, q), {
  recursive: true,
  filter: (src) => !SALTAR.some((s) => src.startsWith(path.join(raiz, s))) && path.basename(src) !== '.DS_Store'
});
console.log('Web copiada a movil/www');
