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
