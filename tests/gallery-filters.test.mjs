import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('el componente compartido cubre selector múltiple, destacados y filtros activos', async () => {
  const component = await read('src/components/GalleryFilters.astro');

  assert.match(component, /data-gallery-taxonomy-option/);
  assert.match(component, /type="checkbox"/);
  assert.match(component, /data-gallery-featured/);
  assert.match(component, /data-gallery-active-filters/);
  assert.match(component, /data-gallery-clear/);
  assert.match(component, /data-gallery-default-status=\{defaultStatus\}/);
  assert.doesNotMatch(component, /data-gallery-result-count/);
  assert.match(component, /\.gallery-filter-summary > div\[hidden\]/);
  assert.match(component, /summary::after/);
  assert.match(component, /\.gallery-filters\[open\] > summary::after/);
  assert.match(component, /:global\(\[data-gallery-filter-chips\] button\)/);
  assert.match(component, /appearance: none/);
  assert.match(component, /input\[type='checkbox'\]:checked/);
  assert.match(component, /margin: 2rem 0 clamp\(1\.5rem, 4vw, 3rem\)/);
});

test('flash usa el motor compartido con categorías y parámetros compartibles', async () => {
  const [page, script] = await Promise.all([
    read('src/pages/tattoo/flash.astro'),
    read('public/scripts/gallery-filters.js'),
  ]);

  assert.match(page, /<GalleryFilters/);
  assert.match(page, /urlParam="category"/);
  assert.match(page, /defaultStatus="disponible"/);
  assert.match(page, /id: 'vendido'/);
  assert.match(page, /id: 'disponible'[\s\S]*id: 'all'[\s\S]*id: 'vendido'/);
  assert.match(page, /data-gallery-taxonomies=\{item\.data\.categories/);
  assert.match(script, /searchParams\.get\(taxonomyParam\)/);
  assert.match(script, /searchParams\.set\(taxonomyParam/);
  assert.match(script, /selected\.has\(button\.dataset\.galleryFeatured\)/);
  assert.match(script, /status === defaultStatus/);
  assert.match(script, /labelWithoutCount/);
  assert.match(script, /button\[data-gallery-status\]/);
  assert.match(script, /taxonomySelect\?\.open/);
  assert.match(page, /data-gallery-pagination/);
  assert.match(page, /data-page-size="6"/);
  assert.doesNotMatch(page, /data-flash-page-size/);
  assert.match(script, /querySelector\('\[data-gallery-pagination\]'\)/);
  assert.match(script, /paginationLayout\.hidden = pageCount === 1/);
  assert.match(page, /\.pagination-layout\[hidden\][\s\S]*display: none/);
  assert.match(page, /:global\(\[data-flash-pagination\] button\)/);
});

test('el CMS permite destacar y elegir la imagen de cada taxonomía', async () => {
  const [cms, types] = await Promise.all([
    read('.pages.yml'),
    read('src/types/content.ts'),
  ]);

  assert.match(cms, /name: featured, label: Destacada/);
  assert.match(cms, /name: image, label: Imagen personalizada/);
  assert.match(cms, /name: imageFrom/);
  assert.match(cms, /collection: flash/);
  assert.match(cms, /collection: obras/);
  assert.match(types, /interface FlashCategory[\s\S]*featured\?: boolean/);
  assert.match(types, /interface ArtworkCollection[\s\S]*imageFrom\?: string/);
});
