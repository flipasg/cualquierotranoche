import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('las migas son una navegación semántica con todos los niveles enlazados', async () => {
  const [component, styles] = await Promise.all([
    read('src/components/Breadcrumbs.astro'),
    read('src/styles/global.css'),
  ]);

  assert.match(
    component,
    /<nav class="breadcrumbs" aria-label="Migas de pan">/,
  );
  assert.match(component, /<ol class="eyebrow breadcrumbs__list">/);
  assert.match(component, /items\.map\(\(item, index\)/);
  assert.match(component, /<a\s+href=\{item\.href\}/);
  assert.match(component, /aria-current=\{index === items\.length - 1/);
  assert.match(styles, /\.breadcrumbs__list li \+ li::before \{/);
  assert.match(styles, /content: '·';/);
  assert.match(
    styles,
    /\.breadcrumbs__list a \{[^}]*font-weight: 400;[^}]*text-decoration: underline;/s,
  );
});

test('obra, proyectos y tattoo integran las rutas de vuelta', async () => {
  const pages = await Promise.all([
    read('src/pages/obra/[collection]/[id].astro'),
    read('src/pages/obra/[id].astro'),
    read('src/pages/obra/[collection]/index.astro'),
    read('src/pages/proyectos/[id].astro'),
    read('src/pages/tattoo/tatuajes.astro'),
    read('src/pages/tattoo/flash.astro'),
  ]);

  for (const page of pages) {
    assert.match(page, /import Breadcrumbs from/);
    assert.match(page, /<Breadcrumbs/);
  }

  assert.match(pages[0], /href: '\/obra\/'/);
  assert.match(pages[0], /href: `\/obra\/\$\{work\.data\.collection\}\//);
  assert.match(pages[3], /href: '\/proyectos\/'/);
  assert.match(pages[4], /href: '\/tattoo\/'/);
  assert.match(pages[4], /href: '\/tattoo\/tatuajes\/'/);
  assert.match(pages[4], /site\.ui\.tattoos\.eyebrow/);
  assert.match(pages[5], /href: '\/tattoo\/'/);
  assert.match(pages[5], /href: '\/tattoo\/flash\/'/);
  assert.match(pages[5], /site\.ui\.flash\.eyebrow/);
});

test('los antetítulos de Tatuajes y Flash son editables desde el CMS', async () => {
  const [site, cms] = await Promise.all([
    read('src/data/site.json'),
    read('.pages.yml'),
  ]);

  const data = JSON.parse(site);
  assert.equal(data.ui.tattoos.eyebrow, 'Galería');
  assert.equal(data.ui.flash.eyebrow, 'Flashbook');
  assert.doesNotMatch(site, /tattoosEyebrow/);
  assert.doesNotMatch(cms, /tattoosEyebrow/);
  assert.match(cms, /name: tattoos[\s\S]*label: Página de tatuajes/);
  assert.match(cms, /name: eyebrow, label: Antetítulo, type: string/);
});
