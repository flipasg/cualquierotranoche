import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { guestToday } from '../public/scripts/guest-dates.js';

const moduleUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const compileTs = async (path) => {
  const source = (await read(path))
    .replace("'astro/zod'", JSON.stringify(import.meta.resolve('astro/zod')))
    .replace(
      "'../../public/scripts/guest-dates.js'",
      JSON.stringify(
        new URL('../public/scripts/guest-dates.js', import.meta.url).href,
      ),
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
const [agendaSource, footerSource] = await Promise.all([
  read('../src/components/GuestAgenda.astro'),
  read('../src/components/GuestFooter.astro'),
]);
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
const now = new Date('2026-10-09T12:00:00Z');

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
    visibleGuests(entries, now).map((item) => item.id),
    ['earlier', 'later'],
  );
  assert.deepEqual(
    entries.map((item) => item.id),
    ['later', 'hidden', 'earlier'],
  );
  const groups = groupGuestsByMonth(entries, now);
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

test('dirección y Maps son independientes y el pie evita enlaces anidados', () => {
  assert.match(agendaSource, /guest\.address && <p class="guest-address">/);
  assert.match(agendaSource, /guest\.mapsUrl && \(\s*<a\s+class="guest-map"/);
  assert.match(
    footerSource,
    /guest\.address && \(\s*<span class="guest-address">/,
  );
  assert.match(footerSource, /guest\.mapsUrl && \(\s*<a\s+class="guest-map"/);
  assert.match(footerSource, /target="_blank"[\s\S]*rel="noopener noreferrer"/);
  assert.match(footerSource, /<\/div>\s*\{guest\.mapsUrl && \(/);
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

test('la agenda omite visitas ocultas y escapa campos editoriales', () => {
  const visible = visibleGuests(
    [guest, { ...guest, id: 'hidden', city: 'Ciudad oculta', visible: false }],
    now,
  );
  assert.deepEqual(
    visible.map(({ city }) => city),
    ['Barcelona'],
  );
  assert.match(agendaSource, /groupGuestsByMonth\(config\.entries\)/);
  assert.match(agendaSource, /<p class="guest-studio">\{guest\.studio\}<\/p>/);
  assert.match(
    agendaSource,
    /<p class="guest-description">\{guest\.description\}<\/p>/,
  );
  assert.match(agendaSource, /<GuestAlerts label=\{config.alertsLabel\}/);
});

test('los campos vacíos del CMS se omiten y la agenda conserva los avisos sin visitas', () => {
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
  assert.ok(parsed.entries[0].studio === '');
  assert.match(agendaSource, /guest\.studio &&/);
  assert.match(agendaSource, /guest\.description &&/);
  assert.match(agendaSource, /guest\.address &&/);
  assert.match(agendaSource, /guest\.mapsUrl &&/);
  assert.match(agendaSource, /config\.emptyMessage/);
  assert.match(agendaSource, /<GuestAlerts label=\{config.alertsLabel\}/);
});

test('el pie muestra las ciudades como texto y se oculta en Contacto o sin contenido', () => {
  assert.match(footerSource, /visibleGuests\(config\.entries\)/);
  assert.match(footerSource, /config\.showInFooter[\s\S]*entries\.length > 0/);
  assert.match(footerSource, /pathname\.replace\([\s\S]*!== '\/contacto'/);
  assert.match(
    footerSource,
    /<h2 id="footer-guests-heading">\s*\{config\.footerHeading\}/,
  );
  assert.match(footerSource, /<div class="footer-guest">/);
  assert.doesNotMatch(footerSource, /href=\{`\/contacto\/#guest-/);
  assert.match(footerSource, /class="guest-city"/);
  assert.match(footerSource, /guest\.studio &&/);
  assert.match(footerSource, /guest\.description &&/);
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

test('retira visitas terminadas aunque estén activas, conserva las de hoy y futuras', () => {
  const entries = [
    { ...guest, id: 'past', endDate: '2026-10-08' },
    { ...guest, id: 'today', endDate: '2026-10-09' },
    { ...guest, id: 'ongoing' },
    { ...guest, id: 'future', startDate: '2026-11-01', endDate: '2026-11-03' },
    { ...guest, id: 'hidden', visible: false },
  ];
  assert.deepEqual(
    visibleGuests(entries, now).map(({ id }) => id),
    ['today', 'ongoing', 'future'],
  );
  assert.deepEqual(
    groupGuestsByMonth(entries, now).map(({ key }) => key),
    ['2026-10', '2026-11'],
  );
  assert.deepEqual(
    groupGuestsByMonth(entries, new Date('2026-11-04T00:00:00Z')),
    [],
  );
});

test('caduca después del último día completo en Madrid, en verano e invierno', () => {
  for (const [endDate, before, after] of [
    ['2026-10-10', '2026-10-10T21:59:59Z', '2026-10-10T22:00:00Z'],
    ['2026-12-31', '2026-12-31T22:59:59Z', '2026-12-31T23:00:00Z'],
    ['2028-02-29', '2028-02-29T22:59:59Z', '2028-02-29T23:00:00Z'],
  ]) {
    const entries = [{ ...guest, startDate: endDate, endDate }];
    assert.equal(guestToday(new Date(before)), endDate);
    assert.equal(visibleGuests(entries, new Date(before)).length, 1);
    assert.equal(visibleGuests(entries, new Date(after)).length, 0);
  }
});
