import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Obra y Flash vuelven a mostrar sus buscadores desde el CMS', async () => {
  const site = JSON.parse(await read('src/data/site.json'));
  assert.equal(site.ui.flash.showGlobalSearch, true);
  assert.equal(site.ui.flash.showTaxonomySearch, true);
  assert.equal(site.ui.artwork.showGlobalSearch, true);
  assert.equal(site.ui.artwork.showTaxonomySearch, true);
});

test('tatuajes y flash conservan la lupa sin escalar al hover, y Flash usa superficie sin borde', async () => {
  const css = await read('src/styles/global.css');
  assert.match(
    css,
    /\.tattoo-gallery-page \.card \.gallery-image-link:hover[\s\S]*transform: none/,
  );
  assert.match(
    css,
    /\.flash-page \.card \.gallery-image-link:hover[\s\S]*transform: none/,
  );
  assert.match(
    css,
    /\.carousel \.card \.gallery-image-link:hover[\s\S]*transform: none/,
  );
  assert.match(
    css,
    /\.carousel \.flash-card__image[\s\S]*background: var\(--color-surface\)/,
  );
  assert.match(css, /\.flash-card__image \{\s*border: 0/);
});

test('la superficie del tema separa footer y tarjetas de la portada', async () => {
  const site = JSON.parse(await read('src/data/site.json'));
  const css = await read('src/styles/global.css');
  assert.equal(site.theme.surface, '#FFF7F1');
  assert.match(css, /footer \{\s*background: var\(--color-surface\)/);
  assert.match(
    css,
    /\.disciplines-section \.discipline-card \{\s*background: var\(--color-surface\)/,
  );
});

test('la ficha de proyecto quita el antetítulo y destaca la línea editorial en ciruela', async () => {
  const detail = await read('src/pages/proyectos/[id].astro');
  assert.doesNotMatch(detail, /project\.data\.services\s*\}\s*\/?>\s*<h1/);
  assert.match(detail, /class="project-meta"/);
  assert.match(detail, /\.project-meta\s*\{\s*color: var\(--color-accent\)/);
});
