import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  DESKTOP_LINK_QUERY,
  initResponsiveExternalLinks,
} from '../public/scripts/responsive-external-links.js';

class Link {
  attributes = new Map();

  constructor(rel = '') {
    if (rel) this.attributes.set('rel', rel);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

const setup = (matches) => {
  const links = [new Link('noreferrer'), new Link('me noreferrer')];
  const listeners = new Set();
  const media = {
    matches,
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };
  const cleanup = initResponsiveExternalLinks(
    { querySelectorAll: () => links },
    {
      matchMedia(query) {
        assert.equal(query, DESKTOP_LINK_QUERY);
        return media;
      },
    },
  );
  return {
    links,
    media,
    cleanup,
    change(matches) {
      media.matches = matches;
      for (const listener of listeners) listener();
    },
  };
};

test('móvil y tablet conservan formularios, email e Instagram en la misma pestaña', () => {
  const ui = setup(false);

  for (const link of ui.links) {
    assert.equal(link.getAttribute('target'), null);
    assert.doesNotMatch(link.getAttribute('rel'), /noopener/);
  }
  assert.match(ui.links[1].getAttribute('rel'), /\bme\b/);
});

test('escritorio abre una pestaña segura y responde al cambio de tamaño', () => {
  const ui = setup(true);

  for (const link of ui.links) {
    assert.equal(link.getAttribute('target'), '_blank');
    assert.match(link.getAttribute('rel'), /\bnoopener\b/);
    assert.match(link.getAttribute('rel'), /\bnoreferrer\b/);
  }

  ui.change(false);
  assert.equal(ui.links[0].getAttribute('target'), null);
  assert.doesNotMatch(ui.links[0].getAttribute('rel'), /noopener/);
  ui.cleanup();
});

test('solo se marcan los enlaces solicitados y el script se carga globalmente', async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
  const [tally, siteInfo, layout] = await Promise.all([
    read('../src/components/TallyLink.astro'),
    read('../src/components/SiteInfo.astro'),
    read('../src/layouts/BaseLayout.astro'),
  ]);

  assert.match(tally, /data-responsive-external/);
  assert.doesNotMatch(tally, /target="_blank"/);
  assert.equal((siteInfo.match(/data-responsive-external/g) ?? []).length, 2);
  assert.match(layout, /src="\/scripts\/responsive-external-links\.js"/);
});
