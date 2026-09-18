import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform as compileAstro } from '@astrojs/compiler';
import { transform } from 'esbuild';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

const source = await readFile(
  new URL('../src/components/Eyebrow.astro', import.meta.url),
  'utf8',
);
const compiled = await compileAstro(source, {
  internalURL: import.meta.resolve('astro/compiler-runtime'),
  resolvePath: (specifier) => specifier,
});
const { code } = await transform(compiled.code, {
  loader: 'ts',
  format: 'esm',
});
const { default: Eyebrow } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);
const container = await AstroContainer.create();
const render = (props) => container.renderToString(Eyebrow, { props });

test('omite el párrafo y los separadores si no se configura el antetítulo', async () => {
  for (const text of [undefined, null, '', '   ', '\n\t']) {
    const html = await render({
      text,
      prefix: 'Ilustración',
      suffix: 'Colección',
    });
    assert.equal(html.trim(), '');
  }
});

test('solo añade separadores entre textos configurados', async () => {
  for (const [props, expected] of [
    [{ text: ' Obra ' }, 'Obra'],
    [{ text: 'Obra', suffix: ' Colección ' }, 'Obra / Colección'],
    [{ text: 'Proyecto', prefix: 'Ilustración' }, 'Ilustración / Proyecto'],
    [{ text: 'Obra', prefix: ' ', suffix: null }, 'Obra'],
  ]) {
    assert.equal(
      (await render(props)).trim(),
      `<p class="eyebrow">${expected}</p>`,
    );
  }
});

test('escapa el contenido del CMS como texto', async () => {
  const html = await render({ text: '<script>alert(1)</script>' });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
