import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(
  new URL('../src/pages/obra/index.astro', import.meta.url),
  'utf8',
);
const card = await readFile(
  new URL('../src/components/WorkCard.astro', import.meta.url),
  'utf8',
);
const filterScript = await readFile(
  new URL('../public/scripts/gallery-filters.js', import.meta.url),
  'utf8',
);

test('los filtros de obra usan el motor compartido y exponen las tarjetas al filtro', () => {
  assert.match(page, /<GalleryFilters/);
  assert.match(page, /urlParam="collection"/);
  assert.match(page, /defaultStatus="disponible"/);
  assert.match(page, /id: 'vendida'/);
  assert.match(page, /id: 'disponible'[\s\S]*id: 'all'[\s\S]*id: 'vendida'/);
  assert.match(page, /src="\/scripts\/gallery-filters\.js"/);
  assert.match(filterScript, /window\.history\.replaceState/);
  assert.match(filterScript, /data-gallery-taxonomy-option/);
  assert.match(filterScript, /data-gallery-featured/);
  assert.match(card, /data-work-card/);
  assert.match(card, /data-gallery-card/);
  assert.match(card, /data-gallery-taxonomies=\{work\.data\.collection/);
  assert.match(card, /data-gallery-status=\{work\.data\.status\}/);
  assert.match(card, /data-collection=\{work\.data\.collection\}/);
  assert.match(card, /data-status=\{work\.data\.status\}/);
});
