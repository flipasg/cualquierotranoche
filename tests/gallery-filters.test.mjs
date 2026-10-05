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
  assert.match(component, /flex-wrap: nowrap/);
  assert.match(component, /gap: var\(--gallery-filter-divider-gap\)/);
  assert.match(component, /padding-left: var\(--gallery-filter-divider-gap\)/);
  assert.match(
    component,
    /@media \(min-width: 1024px\)[\s\S]*\.gallery-filter-root[\s\S]*display: flex/,
  );
  assert.match(
    component,
    /flex: 0 0 auto;[\s\S]*width: max-content;[\s\S]*min-width: max-content;/,
  );
  assert.match(
    component,
    /@media \(min-width: 768px\) and \(max-width: 1023px\)/,
  );
  assert.match(
    component,
    /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.gallery-filter-root[\s\S]*width: 100%;[\s\S]*\.gallery-global-search,[\s\S]*width: 100%/,
  );
  assert.match(component, /data-gallery-result-count/);
  assert.match(component, /data-gallery-item-label=\{itemLabel\}/);
  assert.match(component, /\.gallery-filter-summary > div\[hidden\]/);
  assert.match(component, /summary::after/);
  assert.match(component, /\.gallery-filters\[open\] > summary::after/);
  assert.match(component, /:global\(\[data-gallery-filter-chips\] button\)/);
  assert.match(component, /appearance: none/);
  assert.match(component, /input\[type='checkbox'\]:checked/);
  assert.match(component, /margin: 2rem 0 clamp\(1\.5rem, 4vw, 3rem\)/);
});

test('los filtros compartidos configuran búsquedas, secciones y controles opcionales', async () => {
  const [component, script, artworkPage, flashPage, cms, types] =
    await Promise.all([
      read('src/components/GalleryFilters.astro'),
      read('public/scripts/gallery-filters.js'),
      read('src/pages/obra/index.astro'),
      read('src/pages/tattoo/flash.astro'),
      read('.pages.yml'),
      read('src/types/content.ts'),
    ]);

  assert.match(component, /showActiveFilters\?: boolean/);
  assert.match(component, /showClearButton\?: boolean/);
  assert.match(component, /showTaxonomySearch\?: boolean/);
  assert.match(component, /showGlobalSearch\?: boolean/);
  assert.match(component, /data-gallery-taxonomy-selected/);
  assert.match(component, /data-gallery-taxonomy-unselected/);
  assert.match(component, /data-gallery-search/);
  assert.match(component, /placeholder=\{taxonomySearchLabel\}/);
  assert.match(component, /\.gallery-taxonomy-search input:focus-visible/);
  assert.match(script, /searchParams\.get\(searchParam\)/);
  assert.match(script, /searchParams\.set\(searchParam/);
  assert.match(script, /searchParams\.delete\(searchParam\)/);
  assert.match(
    script,
    /normalize\(title\)\.includes\(normalize\(searchTerm\.trim\(\)\)\)/,
  );
  assert.match(script, /activeCount[\s\S]*selected\.size[\s\S]*searchTerm/);
  assert.match(
    artworkPage,
    /showClearButton=\{site\.ui\.artwork\.showClearButton/,
  );
  assert.match(flashPage, /showClearButton=\{site\.ui\.flash\.showClearButton/);
  assert.match(cms, /name: showActiveFilters[\s\S]*type: boolean/);
  assert.match(cms, /name: showGlobalSearch[\s\S]*type: boolean/);
  assert.match(types, /showTaxonomySearch\?: boolean/);
  assert.match(types, /searchParam\?: string/);
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
  assert.match(page, /data-page-size="12"/);
  assert.match(page, /data-mode="load-more"/);
  assert.match(script, /pagination\.dataset\.mode === 'load-more'/);
  assert.doesNotMatch(page, /data-flash-page-size/);
  assert.match(script, /querySelector\('\[data-gallery-pagination\]'\)/);
  assert.match(script, /paginationLayout\.hidden = pageCount === 1/);
  assert.match(page, /\.pagination-layout\[hidden\][\s\S]*display: none/);
  assert.match(page, /:global\(\[data-flash-pagination\] button\)/);
});

test('Flash muestra doce diseños por tanda y ofrece carga progresiva responsive', async () => {
  const [page, script, component] = await Promise.all([
    read('src/pages/tattoo/flash.astro'),
    read('public/scripts/gallery-filters.js'),
    read('src/components/GalleryFilters.astro'),
  ]);

  assert.match(page, /data-page-size="12"/);
  assert.match(page, /data-mode="load-more"/);
  assert.match(page, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(page, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(page, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(script, /pagination\.dataset\.mode === 'load-more'/);
  assert.match(script, /pagination\.append\(next\)/);
  assert.match(script, /nextBatchButton\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /newlyVisible\.at\(-1\)[\s\S]*focus\(\{/);
  assert.match(component, /data-gallery-result-count aria-live="polite"/);
  assert.match(script, /resultCount\.textContent[\s\S]*visible\.length/);
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

test('en móvil los cambios de filtro se confirman y cerrar descarta el borrador', async () => {
  const [component, script] = await Promise.all([
    read('src/components/GalleryFilters.astro'),
    read('public/scripts/gallery-filters.js'),
  ]);

  assert.match(component, /data-gallery-apply/);
  assert.match(component, /applyLabel = 'Ver resultados'/);
  assert.match(script, /let pendingStatus = status/);
  assert.match(script, /let pendingSelected = new Set\(selected\)/);
  assert.match(
    script,
    /const hasPendingSelection = \(\) => compact\.matches && filterPanel\?\.open/,
  );
  assert.match(
    script,
    /status = pendingStatus;[\s\S]*selected = new Set\(pendingSelected\)/,
  );
  assert.match(
    script,
    /if \(!filterPanel\.open\)[\s\S]*pendingStatus = status[\s\S]*pendingSelected = new Set\(selected\)/,
  );
  assert.match(script, /activeContext\.filter\(Boolean\)\.join\(', '\)/);
});
