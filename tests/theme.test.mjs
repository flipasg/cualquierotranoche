import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'src/lib/theme.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const themeModule = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('el tema admite valores válidos y reserva valores seguros ante datos inválidos', () => {
  const valid = themeModule.themeStyle({
    background: '#ffffff',
    text: '#101010',
    accent: '#315779',
    surface: '#edf2e8',
    decorative: '#d09c00',
    headingFont: 'system',
    bodyFont: 'georgia',
  });
  assert.match(valid, /--color-bg:#ffffff/);
  assert.match(
    valid,
    /--font-heading:"Helvetica Neue", Helvetica, Arial, sans-serif/,
  );
  assert.match(valid, /--font-body:Georgia, "Times New Roman", serif/);
  const roboto = themeModule.themeStyle({
    headingFont: 'roboto',
    bodyFont: 'roboto',
  });
  assert.match(
    roboto,
    /--font-heading:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif/,
  );
  assert.match(
    roboto,
    /--font-body:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif/,
  );

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const invalid = themeModule.themeStyle({
      background: 'url(https://example.invalid)',
      text: '#12',
      accent: 'red',
      surface: '#xyz',
      decorative: 'rgb(1, 2, 3)',
      headingFont: 'custom',
      bodyFont: 'custom',
    });
    assert.match(invalid, /--color-bg:#F7F3EC/);
    assert.match(invalid, /--color-text:#252821/);
    assert.match(invalid, /--color-accent:#923E30/);
    assert.match(invalid, /--color-surface:#E6E9DF/);
    assert.match(invalid, /--color-decorative:#E4B54D/);
    assert.match(
      invalid,
      /--font-heading:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif/,
    );
    assert.match(
      invalid,
      /--font-body:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif/,
    );
    assert.equal(warnings.length, 0);
    themeModule.themeStyle({ background: '#ffffff', text: '#ffffff' });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /contraste/);
  } finally {
    console.warn = originalWarn;
  }
});
