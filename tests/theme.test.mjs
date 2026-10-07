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

const customHeading = {
  family: 'Playfair Display',
  stylesheetUrl:
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700',
};

test('las fuentes personalizadas son independientes y conservan la selección como alternativa', () => {
  const style = themeModule.themeStyle({
    headingFont: 'georgia',
    bodyFont: 'arial',
    headingCustomFont: customHeading,
    bodyCustomFont: {
      family: 'Mi Fuente',
      stylesheetUrl: '/fonts/mi-fuente.css',
    },
  });
  assert.match(style, /--font-heading:"Playfair Display", Georgia/);
  assert.match(style, /--font-body:"Mi Fuente", Arial/);
  const headingsOnly = themeModule.themeStyle({
    headingCustomFont: customHeading,
  });
  assert.match(headingsOnly, /--font-heading:"Playfair Display", Roboto/);
  assert.match(headingsOnly, /--font-body:Roboto/);
});

test('las hojas de fuentes se deduplican y Google Fonts muestra texto durante la carga', () => {
  const stylesheets = themeModule.themeFontStylesheets({
    headingCustomFont: customHeading,
    bodyCustomFont: {
      ...customHeading,
      stylesheetUrl: `${customHeading.stylesheetUrl}&display=block`,
    },
  });
  assert.equal(stylesheets.length, 2);
  const custom = new URL(stylesheets[1]);
  assert.equal(
    custom.searchParams.get('family'),
    'Playfair Display:wght@400;600;700',
  );
  assert.equal(custom.searchParams.get('display'), 'swap');
  assert.equal(
    themeModule.themeFontStylesheets({
      headingCustomFont: {
        family: 'Roboto',
        stylesheetUrl:
          'https://fonts.googleapis.com/css2?display=swap&family=Roboto:wght@400;600;700',
      },
    }).length,
    1,
  );
  assert.deepEqual(
    themeModule
      .themeFontStylesheets({
        headingCustomFont: {
          family: 'Mi Fuente',
          stylesheetUrl: '/fonts/mi-fuente.css',
        },
      })
      .slice(1),
    ['/fonts/mi-fuente.css'],
  );
});

test('fuentes incompletas y nombres que contienen código conservan la alternativa sin cargar enlaces', () => {
  for (const custom of [
    undefined,
    null,
    {},
    { family: 'Lato' },
    { stylesheetUrl: customHeading.stylesheetUrl },
    ...[
      '',
      '   ',
      'Bad";color:red;',
      'A\\B',
      'A\nB',
      'A, serif',
      '<style>',
      'A'.repeat(101),
    ].map((family) => ({ ...customHeading, family })),
  ]) {
    const theme = {
      headingFont: 'georgia',
      bodyFont: 'arial',
      headingCustomFont: custom,
      bodyCustomFont: custom,
    };
    assert.match(themeModule.themeStyle(theme), /--font-heading:Georgia/);
    assert.match(themeModule.themeStyle(theme), /--font-body:Arial/);
    assert.equal(themeModule.themeFontStylesheets(theme).length, 1);
  }
});

test('las fuentes solo aceptan enlaces de Google Fonts o CSS local en /fonts/', () => {
  for (const stylesheetUrl of [
    '',
    'invalid',
    'javascript:alert(1)',
    'data:text/css,body{}',
    'http://fonts.googleapis.com/css2?family=Lato',
    'https://fonts.googleapis.com.evil.test/css2?family=Lato',
    'https://fonts.googleapis.com@evil.test/css2?family=Lato',
    'https://user:password@fonts.googleapis.com/css2?family=Lato',
    'https://fonts.googleapis.com:8443/css2?family=Lato',
    'https://fonts.googleapis.com/css2',
    'https://fonts.googleapis.com/css2?family=',
    'https://fonts.googleapis.com/other?family=Lato',
    'https://fonts.googleapis.com/css2?family=Lato#fragment',
    '//evil.test/fonts/font.css',
    '/fonts/../other.css',
    '/fonts/%2e%2e/other.css',
    '/fonts/a\\b.css',
    '/fonts/font.woff2',
    'https://use.typekit.net/example.css',
  ]) {
    const theme = { headingCustomFont: { family: 'Lato', stylesheetUrl } };
    assert.match(themeModule.themeStyle(theme), /--font-heading:Roboto/);
    assert.equal(
      themeModule.themeFontStylesheets(theme).length,
      1,
      stylesheetUrl,
    );
  }
});

test('la política de publicación permite únicamente los servicios de fuentes previstos', async () => {
  const headers = await readFile(resolve(root, 'public/_headers'), 'utf8');
  assert.match(
    headers,
    /style-src 'self' 'unsafe-inline' https:\/\/fonts.googleapis.com;/,
  );
  assert.match(headers, /font-src 'self' https:\/\/fonts.gstatic.com;/);
  assert.match(headers, /script-src 'self';/);
});

test('el tema admite valores válidos y reserva valores seguros ante datos inválidos', () => {
  const valid = themeModule.themeStyle({
    background: '#ffffff',
    text: '#101010',
    accent: '#315779',
    surface: '#edf2e8',
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
      headingFont: 'custom',
      bodyFont: 'custom',
    });
    assert.match(invalid, /--color-bg:#F7F3EC/);
    assert.match(invalid, /--color-text:#252821/);
    assert.match(invalid, /--color-accent:#923E30/);
    assert.match(invalid, /--color-surface:#E6E9DF/);
    assert.match(
      invalid,
      /--font-heading:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif/,
    );
    assert.match(
      invalid,
      /--font-body:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif/,
    );
    assert.equal(warnings.length, 0);
    themeModule.themeStyle({
      buttonBackground: '#ffffff',
      buttonText: '#ffffff',
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /texto\/fondo de botones/);
    themeModule.themeStyle({ background: '#ffffff', text: '#ffffff' });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /contraste/);
  } finally {
    console.warn = originalWarn;
  }
});

test('los botones heredan acento y fondo cuando sus colores faltan, están vacíos o son inválidos', () => {
  for (const value of [
    undefined,
    '',
    '#12',
    'red',
    'url(https://example.invalid)',
  ]) {
    const style = themeModule.themeStyle({
      accent: '#233A4B',
      background: '#F7F3EC',
      buttonBackground: value,
      buttonText: value,
    });
    assert.match(style, /--color-button-bg:#233A4B;/);
    assert.match(style, /--color-button-text:#F7F3EC;/);
  }
  const defaults = themeModule.themeStyle();
  assert.match(defaults, /--color-button-bg:#923E30;/);
  assert.match(defaults, /--color-button-text:#F7F3EC;/);
});

test('los colores de botones se pueden personalizar de forma independiente', () => {
  const theme = { accent: '#233A4B', background: '#F7F3EC' };
  const customBackground = themeModule.themeStyle({
    ...theme,
    buttonBackground: '#315779',
  });
  assert.match(customBackground, /--color-button-bg:#315779;/);
  assert.match(customBackground, /--color-button-text:#F7F3EC;/);

  const customText = themeModule.themeStyle({
    ...theme,
    buttonText: '#ffffff',
  });
  assert.match(customText, /--color-button-bg:#233A4B;/);
  assert.match(customText, /--color-button-text:#ffffff;/);

  const customPair = themeModule.themeStyle({
    ...theme,
    buttonBackground: '#315779',
    buttonText: '#ffffff',
  });
  assert.match(customPair, /--color-button-bg:#315779;/);
  assert.match(customPair, /--color-button-text:#ffffff;/);
  assert.match(customPair, /--color-accent:#233A4B;/);
  assert.match(customPair, /--color-bg:#F7F3EC;/);
});
