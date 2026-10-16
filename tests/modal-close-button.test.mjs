import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('el visor y los filtros comparten el cierre con texto, icono y color de control', async () => {
  const [closeButton, viewer, filters, css] = await Promise.all([
    read('src/components/ModalCloseButton.astro'),
    read('src/components/ImageViewer.astro'),
    read('src/components/GalleryFilters.astro'),
    read('src/styles/global.css'),
  ]);

  assert.match(viewer, /<ModalCloseButton viewer label="Cerrar" autofocus/);
  assert.match(
    filters,
    /<ModalCloseButton[\s\S]*?gallery[\s\S]*?className="gallery-filter-close"/,
  );
  assert.match(closeButton, /data-viewer-close=/);
  assert.match(closeButton, /data-gallery-close=/);
  assert.match(closeButton, /<span>\{label\}<\/span>/);
  assert.match(closeButton, /<svg aria-hidden="true"/);
  assert.match(closeButton, /min-height: 44px/);
  assert.match(closeButton, /color: var\(--color-action\)/);
  assert.match(css, /\.modal-shell::backdrop/);
  assert.match(
    css,
    /\.modal-shell__header[\s\S]*border-bottom: 1px solid var\(--color-border\)/,
  );
});
