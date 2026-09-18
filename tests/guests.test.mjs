import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { transform as compileAstro } from '@astrojs/compiler';
import { transform } from 'esbuild';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

const moduleUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const compileTs = async (path) => {
  const source = (await read(path)).replace(
    "'astro/zod'",
    JSON.stringify(import.meta.resolve('astro/zod')),
  );
  return moduleUrl(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
};
const helpersUrl = await compileTs('../src/lib/guests.ts');
const {
  guestsSchema,
  visibleGuests,
  groupGuestsByMonth,
  guestDays,
  guestDateRange,
  guestDateColor,
} = await import(helpersUrl);
const formsUrl = await compileTs('../src/config/forms.ts');
const siteUrl = moduleUrl(
  `export default ${await read('../src/data/site.json')};`,
);
const compileComponent = async (path, dependencies) => {
  const compiled = await compileAstro(await read(path), {
    internalURL: import.meta.resolve('astro/compiler-runtime'),
    resolvePath: (specifier) => dependencies[specifier] ?? specifier,
  });
  // El contenedor prueba el HTML; los estilos virtuales se comprueban en el build y el navegador.
  const code = compiled.code
    .replace(
      /(from\s+)(['"])([^'"]+)\2/g,
      (statement, prefix, _quote, specifier) =>
        dependencies[specifier]
          ? `${prefix}${JSON.stringify(dependencies[specifier])}`
          : statement,
    )
    .replace(/^import\s+["'][^"']+\?astro&type=style[^"']*["'];?$/gm, '');
  return moduleUrl(
    (await transform(code, { loader: 'ts', format: 'esm' })).code,
  );
};
const tallyUrl = await compileComponent('../src/components/TallyLink.astro', {
  '../config/forms': formsUrl,
  '../data/site.json': siteUrl,
});
const { default: GuestAgenda } = await import(
  await compileComponent('../src/components/GuestAgenda.astro', {
    '../lib/guests': helpersUrl,
    '../config/forms': formsUrl,
    './TallyLink.astro': tallyUrl,
  })
);
const { default: GuestFooter } = await import(
  await compileComponent('../src/components/GuestFooter.astro', {
    '../lib/guests': helpersUrl,
  })
);
const configured = JSON.parse(await read('../src/data/guests.json'));
// Las pruebas de comportamiento no deben impedir editar o retirar las visitas reales.
const config = guestsSchema.parse({
  ...configured,
  entries: [
    {
      id: 'barcelona-octubre',
      city: 'Barcelona',
      studio: '',
      description: '',
      startDate: '2026-10-08',
      endDate: '2026-10-10',
      color: '#deb9a0',
      visible: true,
    },
  ],
});
const guest = config.entries[0];
const container = await AstroContainer.create();
const renderAgenda = (value) =>
  container.renderToString(GuestAgenda, { props: { config: value } });
const renderFooter = (value, pathname = '/') =>
  container.renderToString(GuestFooter, { props: { config: value, pathname } });

test('la configuración editable cumple el esquema de guests', () => {
  assert.equal(guestsSchema.safeParse(configured).success, true);
});

test('valida fechas reales, rangos, colores seguros e identificadores únicos', () => {
  for (const changes of [
    { startDate: '2026-02-29' },
    { endDate: '2026-10-32' },
    { endDate: '2026-10-07' },
    { startDate: '08/10/2026' },
    { color: 'red; background: url(evil)' },
    { id: '../unsafe' },
    { city: '  ' },
  ]) {
    assert.equal(
      guestsSchema.safeParse({ ...config, entries: [{ ...guest, ...changes }] })
        .success,
      false,
    );
  }
  assert.equal(
    guestsSchema.safeParse({ ...config, entries: [guest, guest] }).success,
    false,
  );
  assert.equal(
    guestsSchema.safeParse({
      ...config,
      entries: [{ ...guest, startDate: '2028-02-29', endDate: '2028-02-29' }],
    }).success,
    true,
  );
});

test('ordena sin mutar los datos y separa el mismo mes de distintos años', () => {
  const entries = [
    { ...guest, id: 'later', startDate: '2027-10-01', endDate: '2027-10-02' },
    { ...guest, id: 'hidden', visible: false },
    { ...guest, id: 'earlier' },
  ];
  assert.deepEqual(
    visibleGuests(entries).map((item) => item.id),
    ['earlier', 'later'],
  );
  assert.deepEqual(
    entries.map((item) => item.id),
    ['later', 'hidden', 'earlier'],
  );
  const groups = groupGuestsByMonth(entries);
  assert.deepEqual(
    groups.map((group) => group.key),
    ['2026-10', '2027-10'],
  );
  assert.match(groups[0].label, /2026/);
  assert.match(groups[1].label, /2027/);
});

test('el enlace opcional admite Google Maps completo o corto y rechaza URLs inseguras', () => {
  const parseGuest = (mapsUrl) =>
    guestsSchema.safeParse({ ...config, entries: [{ ...guest, mapsUrl }] });
  for (const mapsUrl of [
    '',
    undefined,
    null,
    '   ',
    'https://www.google.com/maps/place/Estudio',
    'https://maps.google.es/?q=Estudio',
    'https://maps.app.goo.gl/Prueba123',
    'https://goo.gl/maps/Prueba123',
  ]) {
    assert.equal(parseGuest(mapsUrl).success, true, String(mapsUrl));
  }
  for (const mapsUrl of [
    'javascript:alert(1)',
    'data:text/html,test',
    'http://maps.google.com/',
    '//maps.google.com/',
    'https:maps.google.com',
    'https://usuario:clave@maps.google.com/',
    'no-es-un-enlace',
  ]) {
    assert.equal(parseGuest(mapsUrl).success, false, mapsUrl);
  }
});

test('dirección y Maps se muestran de forma independiente, sin enlaces anidados en el pie', async () => {
  const address = 'Calle de prueba, 12 <local>\nPlanta 2';
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Estudio';
  for (const render of [renderAgenda, renderFooter]) {
    const html = await render({
      ...config,
      entries: [{ ...guest, address, mapsUrl }],
    });
    assert.match(html, /Calle de prueba, 12 &lt;local&gt;/);
    assert.match(html, /class="guest-map(?:\s|")/);
    assert.match(
      html,
      /href="https:\/\/www.google.com\/maps\/search\/\?api=1&(?:amp;)?query=Estudio"/,
    );
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    const addressOnly = await render({
      ...config,
      entries: [{ ...guest, address, mapsUrl: '' }],
    });
    assert.match(addressOnly, /Calle de prueba/);
    assert.doesNotMatch(addressOnly, /class="guest-map(?:\s|")/);
    const mapOnly = await render({
      ...config,
      entries: [{ ...guest, address: '', mapsUrl }],
    });
    assert.match(mapOnly, /class="guest-map(?:\s|")/);
    assert.doesNotMatch(mapOnly, /class="guest-address(?:\s|")/);
  }
  const footer = await renderFooter({
    ...config,
    entries: [{ ...guest, address, mapsUrl }],
  });
  assert.match(footer, /<\/a>\s*<a class="guest-map/);
});

test('representa un día, rangos de días y cambios de mes o año sin desfase horario', () => {
  assert.equal(guestDays(guest), '08–10');
  assert.equal(guestDays({ ...guest, endDate: guest.startDate }), '08');
  const yearChange = {
    ...guest,
    startDate: '2026-12-31',
    endDate: '2027-01-02',
  };
  assert.equal(guestDays(yearChange), '31/12–02/01');
  assert.match(guestDateRange(yearChange), /2026.*2027/);
});

test('la agenda omite guests ocultos y escapa estudio y descripción', async () => {
  const html = await renderAgenda({
    ...config,
    entries: [
      {
        ...guest,
        studio: '<script>estudio</script>',
        description: '<img src=x onerror=alert(1)>',
      },
      { ...guest, id: 'hidden', city: 'Ciudad oculta', visible: false },
    ],
  });
  assert.match(html, /Barcelona/);
  assert.match(html, /guest-barcelona-octubre/);
  assert.match(html, /portfolio-guest-barcelona-octubre/);
  assert.match(html, /&lt;script&gt;estudio&lt;\/script&gt;/);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('Ciudad oculta'));
  assert.match(html, /portfolio-guests-alerts/);
});

test('los campos vacíos del CMS se omiten y el estado sin fechas conserva los avisos', async () => {
  const parsed = guestsSchema.parse({
    ...config,
    entries: [
      {
        ...guest,
        studio: null,
        description: '   ',
        address: null,
        mapsUrl: '   ',
      },
    ],
  });
  const populated = await renderAgenda(parsed);
  assert.doesNotMatch(populated, /class="guest-studio(?:\s|")/);
  assert.doesNotMatch(populated, /class="guest-description(?:\s|")/);
  assert.doesNotMatch(populated, /class="guest-address(?:\s|")/);
  assert.doesNotMatch(populated, /class="guest-map(?:\s|")/);
  const footer = await renderFooter(parsed);
  assert.doesNotMatch(footer, /class="guest-address(?:\s|")/);
  assert.doesNotMatch(footer, /class="guest-map(?:\s|")/);
  const empty = await renderAgenda({ ...config, entries: [] });
  assert.ok(empty.includes(config.emptyMessage));
  assert.match(empty, /portfolio-guests-alerts/);
  assert.doesNotMatch(empty, /class="guest-event(?:\s|")/);
});

test('el pie enlaza a cada visita con su estudio y descripción, y respeta visibilidad', async () => {
  const html = await renderFooter(
    {
      ...config,
      entries: [
        {
          ...guest,
          studio: 'Estudio de prueba',
          description: 'Descripción de prueba',
        },
        { ...guest, id: 'hidden', city: 'Ciudad oculta', visible: false },
      ],
    },
    '/obra/',
  );
  assert.match(html, /href="\/contacto\/#guest-barcelona-octubre"/);
  assert.match(html, /Estudio de prueba/);
  assert.match(html, /Descripción de prueba/);
  assert.ok(!html.includes('Ciudad oculta'));
  for (const pathname of ['/contacto', '/contacto/']) {
    assert.ok(
      !(await renderFooter(config, pathname)).includes('footer-guests-heading'),
    );
  }
  for (const value of [
    { ...config, entries: [] },
    { ...config, showInFooter: false },
    { ...config, entries: [{ ...guest, visible: false }] },
  ]) {
    assert.ok(!(await renderFooter(value)).includes('footer-guests-heading'));
  }
});

test('el texto mantiene contraste mínimo AA con los colores editables', () => {
  const luminance = (hex) => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((part) => parseInt(part, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const color of [
    ...config.entries.map((item) => item.color),
    '#000000',
    '#ffffff',
    '#ff0000',
    '#777777',
    '#233a4b',
  ]) {
    const values = [luminance(color), luminance(guestDateColor(color))].sort(
      (a, b) => b - a,
    );
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, color);
  }
});
