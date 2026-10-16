import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
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
const guest = {
  id: 'ciudad-prueba',
  city: 'Ciudad de prueba',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  color: '#b7c3a7',
  visible: true,
};

async function renderContact(entries) {
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
      else if (specifier === '../data')
        replacement = moduleUrl(`export const site = ${JSON.stringify(site)};`);
      else if (specifier === '../data/site.json')
        replacement = moduleUrl(`export default ${JSON.stringify(site)};`);
      else if (specifier.endsWith('BaseLayout.astro'))
        replacement = await compile(
          resolve(root, 'BaseLayout.astro'),
          '<slot />',
        );
      else if (specifier.startsWith('.')) {
        const dependency = resolve(dirname(path), specifier);
        replacement = await compile(
          dependency.endsWith('.astro') ? dependency : `${dependency}.ts`,
        );
      } else if (specifier === 'astro/zod')
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
  const { default: Contact } = await import(
    await compile(resolve(root, 'src/pages/contacto.astro'))
  );
  const container = await AstroContainer.create();
  return container.renderToString(Contact);
}

for (const [name, entries] of [
  ['sin visitas', []],
  ['con todas las visitas ocultas', [{ ...guest, visible: false }]],
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
  ]);
  assert.equal((html.match(/portfolio-guests-alerts/g) ?? []).length, 1);
  assert.match(html, /id="guests-heading"/);
  assert.match(html, /Ciudad de prueba/);
  assert.doesNotMatch(html, /Ciudad oculta/);
  assert.doesNotMatch(html, /class="contact-city-alerts(?:\s|")/);
  assert.ok(
    html.indexOf('class="guest-event') <
      html.indexOf('portfolio-guests-alerts'),
  );
});
