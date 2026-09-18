import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Usar el compilador ya instalado mantiene los tests compatibles con Node 20.
const source = await readFile(
  new URL('../src/config/forms.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { formUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const base = 'https://tally.so/r/Test123';

test('no ofrece enlaces vacíos, provisionales, de edición o externos', () => {
  for (const url of [
    '',
    'no-url',
    'https://tally.so/r/REEMPLAZAR',
    'https://tally.so/r/reemplazar/',
    'http://tally.so/r/Test123',
    'https://tally.so.ejemplo.com/r/Test123',
    'https://tally.so/forms/Test123/edit',
    'https://usuario:clave@tally.so/r/Test123',
    'javascript:alert(1)',
  ]) {
    assert.equal(formUrl(url), null, url);
  }
});

test('conserva la referencia exacta de cada flash y su origen', () => {
  for (const flashCode of ['F-001', 'F-002', 'F & 03/ñ']) {
    const url = new URL(
      formUrl(base, { flashCode, source: 'portfolio-flash' }),
    );
    assert.equal(url.searchParams.get('flashCode'), flashCode);
    assert.equal(url.searchParams.get('source'), 'portfolio-flash');
    assert.equal(url.searchParams.has('artworkId'), false);
  }
});

test('conserva la referencia de la obra sin mezclarla con un flash', () => {
  const url = new URL(
    formUrl(base, { artworkId: 'obra-02', source: 'portfolio-obra' }),
  );
  assert.deepEqual(
    [...url.searchParams],
    [
      ['artworkId', 'obra-02'],
      ['source', 'portfolio-obra'],
    ],
  );
});

test('la consulta general no inventa una referencia', () => {
  assert.equal(formUrl(base), base);
  assert.equal(
    formUrl(base, { flashCode: '', source: 'portfolio-contacto' }),
    `${base}?source=portfolio-contacto`,
  );
});

test('no propaga datos privados ni parámetros no permitidos de una URL copiada', () => {
  const url = formUrl(
    `${base}?email=prueba@example.com&flashCode=antiguo#privado`,
    {
      source: 'portfolio-tattoo',
      email: 'prueba@example.com',
      notes: 'No publicar',
    },
  );
  assert.equal(url, `${base}?source=portfolio-tattoo`);
});
