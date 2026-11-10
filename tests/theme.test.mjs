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

test('Roboto predeterminada se sirve localmente con sus tres pesos y archivos WOFF2', async () => {
  assert.deepEqual(themeModule.themeFontStylesheets(), []);
  const css = await readFile(resolve(root, 'src/styles/roboto.css'), 'utf8');
  assert.doesNotMatch(css, /https?:\/\//);
  for (const weight of [400, 600, 700]) {
    assert.match(css, new RegExp(`font-weight: ${weight};`));
  }
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
  assert.equal(faces.length, 27);
  for (const [, face] of faces) {
    assert.match(face, /font-display: optional;/);
  }
  const paths = new Set(
    [...css.matchAll(/url\(['"]?([^)'"\s]+)/g)].map((match) => match[1]),
  );
  assert.equal(paths.size, 9);
  for (const path of paths) {
    assert.ok(path.startsWith('/fonts/roboto/'));
    const font = await readFile(resolve(root, `public${path}`));
    assert.equal(font.subarray(0, 4).toString(), 'wOF2');
  }
});

test('la precarga prioriza una sola fuente latina cuando Roboto forma parte del tema', () => {
  const latinFont = ['/fonts/roboto/roboto-v51-latin.woff2'];
  assert.deepEqual(themeModule.themeFontPreloads(), latinFont);
  assert.deepEqual(
    themeModule.themeFontPreloads({
      headingFont: 'roboto',
      bodyFont: 'roboto',
    }),
    latinFont,
  );
  assert.deepEqual(
    themeModule.themeFontPreloads({
      headingFont: 'georgia',
      bodyFont: 'roboto',
    }),
    latinFont,
  );
  assert.deepEqual(
    themeModule.themeFontPreloads({
      headingFont: 'invalid',
      bodyFont: 'arial',
    }),
    latinFont,
  );
  assert.deepEqual(
    themeModule.themeFontPreloads({
      headingFont: 'georgia',
      bodyFont: 'arial',
      headingCustomFont: customHeading,
    }),
    [],
  );
  assert.deepEqual(
    themeModule.themeFontPreloads({
      headingFont: 'georgia',
      bodyFont: 'arial',
      bodyCustomFont: {
        family: 'Roboto',
        stylesheetUrl:
          'https://fonts.googleapis.com/css2?family=Roboto:wght@400;600;700',
      },
    }),
    latinFont,
  );
});

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

test('las hojas de fuentes se deduplican y Google Fonts evita cambios de fuente tardíos', () => {
  const stylesheets = themeModule.themeFontStylesheets({
    headingCustomFont: customHeading,
    bodyCustomFont: {
      ...customHeading,
      stylesheetUrl: `${customHeading.stylesheetUrl}&display=block`,
    },
  });
  assert.equal(stylesheets.length, 1);
  const custom = new URL(stylesheets[0]);
  assert.equal(
    custom.searchParams.get('family'),
    'Playfair Display:wght@400;600;700',
  );
  assert.equal(custom.searchParams.get('display'), 'optional');
  assert.equal(
    themeModule.themeFontStylesheets({
      headingCustomFont: {
        family: 'Roboto',
        stylesheetUrl:
          'https://fonts.googleapis.com/css2?display=swap&family=Roboto:wght@400;600;700',
      },
    }).length,
    0,
  );
  assert.deepEqual(
    themeModule.themeFontStylesheets({
      headingCustomFont: {
        family: 'Mi Fuente',
        stylesheetUrl: '/fonts/mi-fuente.css',
      },
    }),
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
    assert.equal(themeModule.themeFontStylesheets(theme).length, 0);
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
      0,
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
  assert.match(
    headers,
    /script-src 'self' https:\/\/www.googletagmanager.com;/,
  );
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
    assert.match(invalid, /--color-bg:#FFECE0/);
    assert.match(invalid, /--color-text:#233A4B/);
    assert.match(invalid, /--color-accent:#75465D/);
    assert.match(invalid, /--color-surface:#FFF7F1/);
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

test('el tema separa enlaces y filtros ciruela de los controles azules y textos secundarios', async () => {
  const [css, cms] = await Promise.all([
    readFile(resolve(root, 'src/styles/global.css'), 'utf8'),
    readFile(resolve(root, '.pages.yml'), 'utf8'),
  ]);
  const site = JSON.parse(
    await readFile(resolve(root, 'src/data/site.json'), 'utf8'),
  );

  assert.equal(site.theme.text, '#233A4B');
  assert.equal(site.theme.background, '#FFECE0');
  assert.equal(site.theme.accent, '#75465D');
  assert.match(themeModule.themeStyle(site.theme), /--color-accent:#75465D/);
  assert.match(css, /--color-action: var\(--color-text\)/);
  assert.match(css, /--color-muted:[^;]*var\(--color-bg\) 25%/);
  assert.match(cms, /default: '#75465D'/);
  assert.match(css, /--color-link: var\(--color-accent\)/);
  assert.match(css, /--color-filter: var\(--color-accent\)/);
  assert.match(
    cms,
    /Color de los enlaces subrayados[\s\S]*textos descriptivos/,
  );
  assert.doesNotMatch(css, /text-decoration-thickness: 2px/);
});

test('los botones usan el azul predeterminado y heredan el fondo para su texto ante colores ausentes o inválidos', () => {
  for (const value of [
    undefined,
    '',
    '#12',
    'red',
    'url(https://example.invalid)',
  ]) {
    const style = themeModule.themeStyle({
      accent: '#75465D',
      background: '#F7F3EC',
      buttonBackground: value,
      buttonText: value,
    });
    assert.match(style, /--color-button-bg:#233A4B;/);
    assert.match(style, /--color-button-text:#F7F3EC;/);
  }
  const defaults = themeModule.themeStyle();
  assert.match(defaults, /--color-button-bg:#233A4B;/);
  assert.match(defaults, /--color-button-text:#FFECE0;/);
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
