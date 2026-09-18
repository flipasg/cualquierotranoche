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

test('los filtros de obra son controles y filtran las tarjetas por sus datos', () => {
  assert.match(
    page,
    /<button type="button" data-filter="all" aria-pressed="true">/,
  );
  assert.match(
    page,
    /data-filter="collection"\s+data-collection=\{collection\}/,
  );
  assert.match(page, /data-filter="available"/);
  assert.match(page, /site\.ui\.artwork\.available/);
  assert.match(page, /card\.hidden =/);
  assert.match(card, /data-work-card/);
  assert.match(card, /data-collection=\{work\.data\.collection\}/);
  assert.match(card, /data-status=\{work\.data\.status\}/);
});
