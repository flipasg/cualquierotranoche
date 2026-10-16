import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform } from 'esbuild';

const source = await readFile(
  new URL('../src/lib/eyebrow.ts', import.meta.url),
  'utf8',
);
const { code } = await transform(source, {
  loader: 'ts',
  format: 'esm',
});
const { eyebrowContent } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);
const component = await readFile(
  new URL('../src/components/Eyebrow.astro', import.meta.url),
  'utf8',
);

test('omite el antetítulo cuando el texto principal está vacío', () => {
  for (const text of [undefined, null, '', '   ', '\n\t']) {
    assert.equal(eyebrowContent(text, 'Ilustración', 'Colección'), undefined);
  }
});

test('limpia los textos y añade separadores solo entre partes presentes', () => {
  for (const [args, expected] of [
    [[' Obra '], 'Obra'],
    [['Obra', undefined, ' Colección '], 'Obra / Colección'],
    [['Proyecto', 'Ilustración'], 'Ilustración / Proyecto'],
    [['Obra', ' ', null], 'Obra'],
  ]) {
    assert.equal(eyebrowContent(...args)?.content, expected);
  }
});

test('el componente imprime el contenido como texto escapado por Astro', () => {
  assert.match(component, /<p class="eyebrow">\{eyebrow\.content\}<\/p>/);
});
