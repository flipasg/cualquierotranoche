import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { transform } from '@astrojs/compiler-rs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(resolve(root, path), 'utf8');
const moduleUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const site = JSON.parse(await read('src/data/site.json'));
const configured = JSON.parse(await read('src/data/guests.json'));
const analytics = JSON.parse(await read('src/data/analytics.json'));
const guest = {
  id: 'ciudad-prueba',
  city: 'Ciudad de prueba',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  color: '#b7c3a7',
  visible: true,
};

test.beforeEach((context) => {
  context.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-10-02T12:00:00Z'),
  });
});

async function renderComponent(
  componentPath,
  entries,
  content = site,
  props = {},
) {
  const config = { ...configured, entries };
  const cache = new Map();
  const compile = async (path, source) => {
    if (cache.has(path)) return cache.get(path);
    let code = source ?? (await readFile(path, 'utf8'));
    if (path.endsWith('.astro')) {
      // Match Astro's installed compiler/runtime and its resolved-module mode.
      code = transform(code, {
        filename: path,
        internalURL: import.meta.resolve('astro/compiler-runtime'),
        resolvePath: (specifier) => specifier,
        resultScopedSlot: true,
      }).code;
      // Styles are validated in the build/browser, not needed for HTML rendering.
      code = code.replace(
        /^import\s+['"][^'"]+\?astro&type=style[^'"]*['"];?$/gm,
        '',
      );
    }
    const imports = [...code.matchAll(/\bfrom\s+(['"])([^'"]+)\1/g)];
    for (const match of imports) {
      const specifier = match[2];
      let replacement;
      if (specifier === '../config/guests')
        replacement = moduleUrl(
          `export const guests = ${JSON.stringify(config)};`,
        );
      else if (specifier === '../config/analytics')
        replacement = moduleUrl(
          `export const analytics = ${JSON.stringify({ ...analytics, enabled: true, measurementId: 'G-TEST123456' })};`,
        );
      else if (specifier === '../data')
        replacement = moduleUrl(
          `export const site = ${JSON.stringify(content)};`,
        );
      else if (specifier === '../data/site.json')
        replacement = moduleUrl(`export default ${JSON.stringify(content)};`);
      else if (specifier.endsWith('BaseLayout.astro'))
        replacement = await compile(
          resolve(root, 'BaseLayout.astro'),
          '<main><slot /></main><slot name="footer" />',
        );
      else if (specifier.startsWith('.')) {
        const dependency = resolve(dirname(path), specifier);
        replacement = await compile(
          extname(dependency) ? dependency : `${dependency}.ts`,
        );
      } else if (specifier === 'astro/zod')
        replacement = import.meta.resolve(specifier);
      else if (specifier === 'marked')
        replacement = import.meta.resolve(specifier);
      if (replacement)
        code = code.replace(match[0], `from ${JSON.stringify(replacement)}`);
    }
    const url = moduleUrl(
      ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    );
    cache.set(path, url);
    return url;
  };
  const { default: Component } = await import(
    await compile(resolve(root, componentPath))
  );
  const container = await AstroContainer.create();
  return container.renderToString(Component, { props });
}

const renderContact = (entries, content) =>
  renderComponent('src/pages/contacto.astro', entries, content);

test('Contacto muestra las tres primeras fechas en móvil y escritorio, sin paginación', async () => {
  const dates = [
    '2026-10-03',
    '2026-11-01',
    '2026-11-02',
    '2026-12-01',
    '2026-12-02',
  ];
  const entries = dates.map((date, index) => ({
    ...guest,
    id: `prueba-${index}`,
    startDate: date,
    endDate: date,
  }));
  const html = await renderContact(entries.toReversed());
  assert.match(html, /data-guest-limit="3"/);
  const cards = [...html.matchAll(/<li\b[^>]*id="guest-prueba-\d"[^>]*>/g)].map(
    ([tag]) => tag,
  );
  assert.equal(cards.length, 5);
  cards.forEach((card, index) => {
    assert.match(card, new RegExp(`id="guest-prueba-${index}"`));
    assert.equal(/\shidden(?:\s|=|>)/.test(card), index >= 3);
  });
  assert.match(
    html,
    /<section\b[^>]*\shidden(?:\s|=)[^>]*aria-labelledby="month-2026-12"/,
  );
  assert.doesNotMatch(
    html,
    /data-guest-(?:pagination|previous|next|page-status)/,
  );
});

test('el pie muestra el mes y las tarjetas de Contacto incluyen la fecha accesible y sus dos formatos', async () => {
  const footer = await renderComponent('src/components/Footer.astro', [guest]);
  assert.match(
    footer,
    /class="guest-range(?:\s[^"]*)?"[^>]*>1–3 de octubre de 2026<\/span>/,
  );
  const contact = await renderContact([guest]);
  assert.match(contact, /id="month-2026-10"[^>]*>\s*octubre de 2026\s*<\/h3>/);
  assert.match(contact, /<time\b[^>]*aria-label="1–3 de octubre de 2026"/);
  assert.match(contact, /class="guest-card-days\b[^>]*>01–03<\/span>/);
  assert.match(contact, /class="guest-card-weekdays\b[^>]*>jue–sáb<\/span>/);
  assert.match(
    contact,
    /class="guest-card-date-compact\b[^>]*>\s*1–3 oct · 2026\s*<\/span>/,
  );
});

test('el resumen del pie muestra ciudad y fecha de los tres próximos guests, sin datos del estudio', async () => {
  const dates = [
    '2026-10-03',
    '2026-10-10',
    '2026-11-01',
    '2026-12-01',
    '2027-01-01',
  ];
  const entries = dates.map((date, index) => ({
    ...guest,
    id: `resumen-${index}`,
    city: `Ciudad ${index}`,
    startDate: date,
    endDate: date,
    studio: 'Estudio que solo aparece en Contacto',
    address: 'Dirección detallada',
    description: 'Descripción detallada',
    mapsUrl: 'https://example.com/maps',
  }));
  entries.push({
    ...guest,
    id: 'oculta',
    city: 'Ciudad oculta',
    visible: false,
  });
  entries.push({
    ...guest,
    id: 'pasada',
    city: 'Ciudad pasada',
    endDate: '2026-10-01',
  });
  const html = await renderComponent(
    'src/components/GuestFooter.astro',
    entries,
    site,
    {
      config: { ...configured, entries: entries.toReversed() },
      pathname: '/sobre-mi/',
    },
  );
  assert.match(html, /data-guest-limit="3"/);
  const rows = [
    ...html.matchAll(/<li\b[^>]*data-guest-end[^>]*>[\s\S]*?<\/li>/g),
  ].map(([row]) => row);
  assert.equal(rows.length, 5);
  rows.forEach((row, index) => {
    assert.match(row, new RegExp(`Ciudad ${index}`));
    assert.equal(/<li\b[^>]*\shidden(?:\s|=|>)/.test(row), index >= 3);
  });
  assert.match(rows[0], /3 de octubre de 2026/);
  assert.doesNotMatch(
    html,
    /Ciudad oculta|Ciudad pasada|Estudio que|Dirección detallada|Descripción detallada|https:\/\/example\.com\/maps|<a\b/,
  );
});

test('la tarjeta enlaza la dirección a Maps y ofrece Consultar cita sin flechas', async () => {
  const html = await renderContact([
    {
      ...guest,
      studio: 'Estudio de prueba',
      address: 'Calle de prueba, 26\n28004 Madrid',
      mapsUrl: 'https://example.com/maps',
    },
  ]);
  const card = html.match(
    /<li\b[^>]*id="guest-ciudad-prueba"[\s\S]*?<\/li>/,
  )?.[0];
  assert.ok(card);
  assert.match(card, /class="guest-card-studio\b[^>]*>Estudio de prueba<\/p>/);
  const map = card.match(/<a\b[^>]*class="guest-card-map\b[\s\S]*?<\/a>/)?.[0];
  assert.ok(map);
  assert.match(map, /href="https:\/\/example.com\/maps"/);
  assert.match(map, /target="_blank"\s+rel="noopener noreferrer"/);
  assert.match(map, /Calle de prueba, 26\n28004 Madrid<\/span>/);
  assert.match(map, /<svg\b[^>]*aria-hidden="true"/);
  assert.match(
    card,
    /<a\b[^>]*class="button guest-card-inquiry\b[^>]*source=portfolio-guest-ciudad-prueba/,
  );
  assert.match(card, /Consultar cita/);
  assert.doesNotMatch(card, /[→↗]/);
});

test('sin URL la dirección es texto; con solo URL se conserva el enlace; los campos vacíos se omiten', async () => {
  const plain = await renderContact([
    {
      ...guest,
      address: 'Dirección sin enlace\nSegunda línea',
    },
  ]);
  assert.match(
    plain,
    /<p\b[^>]*class="guest-card-address\b[^>]*>Dirección sin enlace\nSegunda línea<\/p>/,
  );
  assert.doesNotMatch(plain, /class="guest-card-map\b/);
  const mapOnly = await renderContact([
    {
      ...guest,
      mapsUrl: 'https://example.com/maps',
    },
  ]);
  assert.match(
    mapOnly,
    /class="guest-card-map\b[^>]*href="https:\/\/example.com\/maps"/,
  );
  assert.match(mapOnly, /<span\b[^>]*>Ver en Google Maps<\/span>/);
  const minimal = await renderContact([guest]);
  assert.doesNotMatch(minimal, /class="guest-card-meta\b/);
  assert.doesNotMatch(
    minimal,
    /class="guest-card-(?:map|address|studio|description)\b/,
  );
});

test('sin dirección se conservan el estudio con la ciudad y la descripción en su propia fila', async () => {
  const html = await renderContact([
    {
      ...guest,
      studio: 'Estudio sin dirección',
      description: 'La dirección se confirmará al reservar.',
    },
  ]);
  assert.match(
    html,
    /class="guest-card-info\b[^>]*>[\s\S]*class="guest-card-studio\b[^>]*>Estudio sin dirección<\/p>\s*<\/div>/,
  );
  assert.match(
    html,
    /class="guest-card-meta\b[^>]*>\s*<p\b[^>]*class="guest-card-description\b[^>]*>La dirección se confirmará al reservar\.<\/p>/,
  );
  assert.doesNotMatch(html, /class="guest-card-(?:address|map)\b/);
});

test('Contacto conserva el formato del CMS y muestra la dirección como un único enlace continuo', async () => {
  const content = structuredClone(site);
  content.ui.contact.intro = 'Una **idea**. {{accent}}Hablemos.{{/accent}}';
  content.ui.contact.studio = {
    address: '**Estudio de prueba**\nCalle de prueba 1\nCiudad de prueba',
    mapText: '**Cómo llegar**',
    mapUrl: 'https://example.com/mapa',
  };
  const html = await renderContact([], content);
  assert.match(
    html,
    /Una <strong>idea<\/strong>\. <span class="text-accent">Hablemos\.<\/span>/,
  );
  assert.match(
    html,
    /<strong>Estudio de prueba<\/strong> Calle de prueba 1 Ciudad de prueba/,
  );
  assert.match(
    html,
    /href="https:\/\/example\.com\/mapa"[^>]*aria-label="Cómo llegar: Estudio de prueba Calle de prueba 1 Ciudad de prueba"/,
  );
  assert.doesNotMatch(html, /\{\{accent\}\}|\*\*/);
});

test('los dos pies comparten identidad, dirección y preferencias dentro del footer', async () => {
  const normal = await renderComponent('src/components/Footer.astro', []);
  const contact = await renderContact([]);
  for (const html of [normal, contact]) {
    const footer = html.slice(
      html.indexOf('<footer'),
      html.indexOf('</footer>'),
    );
    assert.equal((footer.match(/data-analytics-settings/g) ?? []).length, 1);
    assert.equal((html.match(/data-measurement-id=/g) ?? []).length, 1);
    for (const content of [
      site.artisticName,
      site.ui.footer.disciplines,
      site.ui.contact.studio.address,
      site.ui.footer.sampleNotice,
    ]) {
      assert.ok(footer.includes(content), content);
    }
    assert.match(footer, /query_place_id=ChIJ_12O3G_CTw0RArWC0OgzYTA/);
  }
  assert.ok(contact.indexOf('</main>') < contact.indexOf('<footer'));
});

test('el pie conserva la dirección si no hay mapa y no inventa una ubicación vacía', async () => {
  const content = structuredClone(site);
  content.ui.contact.studio = { address: 'Estudio de prueba' };
  const withoutMap = await renderComponent(
    'src/components/Footer.astro',
    [],
    content,
  );
  assert.match(withoutMap, /Estudio de prueba/);
  assert.doesNotMatch(withoutMap, /google\.com\/maps/);
  content.ui.contact.studio = {};
  const withoutAddress = await renderComponent(
    'src/components/Footer.astro',
    [],
    content,
  );
  assert.doesNotMatch(withoutAddress, /class="studio-address/);
});

for (const [name, entries] of [
  ['sin visitas', []],
  ['con todas las visitas ocultas', [{ ...guest, visible: false }]],
  [
    'con todas las visitas terminadas pero activas',
    [{ ...guest, endDate: '2026-10-01' }],
  ],
]) {
  test(`Contacto ${name} muestra un solo aviso después de los formularios`, async () => {
    const html = await renderContact(entries);
    assert.equal((html.match(/portfolio-guests-alerts/g) ?? []).length, 1);
    assert.match(
      html,
      /id="proximos-guests"[^>]*class="contact-city-alerts(?:\s|")/,
    );
    assert.doesNotMatch(html, /id="guests-heading"/);
    assert.doesNotMatch(html, /class="guest-event(?:\s|")/);
    assert.equal((html.match(/source=portfolio-contacto/g) ?? []).length, 4);
    const formsEnd = html.indexOf('</ul>');
    const alerts = html.indexOf('portfolio-guests-alerts');
    const footer = html.indexOf('class="contact-footer');
    assert.ok(formsEnd >= 0 && formsEnd < alerts && alerts < footer);
    assert.ok(html.includes(configured.alertsLabel));
  });
}

test('Contacto con visitas conserva el aviso en la agenda, sin duplicarlo bajo los formularios', async () => {
  const html = await renderContact([
    guest,
    { ...guest, id: 'oculta', city: 'Ciudad oculta', visible: false },
    { ...guest, id: 'pasada', city: 'Ciudad pasada', endDate: '2026-10-01' },
  ]);
  assert.equal((html.match(/portfolio-guests-alerts/g) ?? []).length, 1);
  assert.match(html, /id="guests-heading"/);
  assert.match(html, /Ciudad de prueba/);
  assert.doesNotMatch(html, /Ciudad oculta/);
  assert.doesNotMatch(html, /Ciudad pasada/);
  assert.doesNotMatch(html, /class="contact-city-alerts(?:\s|")/);
  assert.ok(
    html.indexOf('class="guest-event') <
      html.indexOf('portfolio-guests-alerts'),
  );
});
