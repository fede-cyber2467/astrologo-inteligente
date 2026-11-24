#!/usr/bin/env python3
"""Arma la biblioteca de consulta del astrólogo a partir de textos de dominio público.

Lee biblioteca/fuentes/catalogo.json (lista de obras con su archivo .txt), limpia cada texto,
lo corta en pasajes y escribe biblioteca/<id>.json y biblioteca/catalogo.json para la app.
Uso: python3 herramientas/armar_biblioteca.py
"""
import json, os, re, sys

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FUENTES = os.path.join(RAIZ, 'biblioteca', 'fuentes')
SALIDA = os.path.join(RAIZ, 'biblioteca')
MIN, MAX = 500, 1400  # caracteres por pasaje


def limpiar(t):
    t = t.replace('\r\n', '\n').replace('\r', '\n').replace('﻿', '')
    # encabezado y pie de Project Gutenberg
    m = re.search(r'\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\n', t)
    if m: t = t[m.end():]
    m = re.search(r'\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG', t)
    if m: t = t[:m.start()]
    t = re.sub(r'(\w)-\n(\w)', r'\1\2', t)            # palabras cortadas al final del renglón
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t


def tei(t):
    """Transcripciones EEBO-TCP (XML TEI): quita el encabezado y las etiquetas, moderniza la s larga."""
    import html
    t = re.sub(r'<teiHeader.*?</teiHeader>', '', t, flags=re.S)
    t = re.sub(r'<(note|fw|figure)\b.*?</\1>', ' ', t, flags=re.S)          # notas al margen, encabezados de página
    t = re.sub(r'</(p|head|lg|div\d?|item|row|closer|opener|trailer|salute|signed)>', '\n\n', t)
    t = re.sub(r'</l>|<lb ?/>', '\n', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = html.unescape(t).replace('ſ', 's').replace('∣', '').replace('•', '').replace('〈…〉', '')
    return re.sub(r'(?<!\n)\n(?!\n)', ' ', t)                              # los versos y renglones sueltos se unen


def legible(p):
    letras = sum(c.isalpha() or c == ' ' for c in p)
    if letras / max(1, len(p)) < 0.82: return False     # tablas, efemérides, OCR roto
    palabras = re.findall(r'[A-Za-zÀ-ÿ]+', p)
    if len(palabras) < 40: return False
    cortas = sum(len(w) <= 2 for w in palabras) / len(palabras)
    return cortas < 0.42


def pasajes(t):
    parrafos = [re.sub(r'\s*\n\s*', ' ', p).strip() for p in t.split('\n\n')]
    out, actual = [], ''
    for p in parrafos:
        if not p: continue
        while len(p) > MAX:                               # párrafos larguísimos: cortar por oración
            corte = p.rfind('. ', 0, MAX)
            corte = corte + 1 if corte > MIN else MAX
            if actual: out.append(actual); actual = ''
            out.append(p[:corte].strip()); p = p[corte:].strip()
        if len(actual) + len(p) + 1 <= MAX: actual = (actual + ' ' + p).strip()
        else:
            if actual: out.append(actual)
            actual = p
        if len(actual) >= MIN and actual.endswith(('.', '?', '!', '"', '”')):
            out.append(actual); actual = ''
    if actual: out.append(actual)
    return [p for p in out if legible(p)]


def main():
    cat = json.load(open(os.path.join(FUENTES, 'catalogo.json'), encoding='utf-8'))
    publico, total = [], 0
    for o in cat:
        ruta = os.path.join(FUENTES, o['archivo'])
        if not os.path.exists(ruta):
            print('FALTA', o['archivo']); continue
        t = open(ruta, encoding='utf-8', errors='replace').read()
        if ruta.endswith('.xml'): t = tei(t)
        t = limpiar(t)
        if o.get('desde') and o['desde'] in t: t = t[t.index(o['desde']):]
        if o.get('hasta') and o['hasta'] in t: t = t[:t.index(o['hasta'])]
        ps = pasajes(t)
        ficha = {k: o[k] for k in ('id', 'titulo', 'autor', 'anio') if k in o}
        json.dump(dict(ficha, pasajes=ps), open(os.path.join(SALIDA, o['id'] + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        publico.append(dict(ficha, pasajes=len(ps)))
        total += len(ps)
        print('%-28s %5d pasajes  %7d caracteres' % (o['id'], len(ps), sum(map(len, ps))))
    json.dump(publico, open(os.path.join(SALIDA, 'catalogo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('TOTAL', len(publico), 'obras,', total, 'pasajes')


if __name__ == '__main__':
    sys.exit(main())
