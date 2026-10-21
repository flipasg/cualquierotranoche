import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const script = await read('../public/scripts/obra-gallery.js');

test('artwork gallery loads externally under the site CSP', async () => {
  const template = await read('../src/pages/obra/[collection]/[id].astro');
  const headers = await read('../public/_headers');
  assert.match(headers, /script-src 'self';/);
  assert.match(
    template,
    /<script\s+is:inline\s+type="module"\s+src="\/scripts\/obra-gallery\.js"><\/script>/,
  );
});

function fixture(length = 3) {
  class Element {
    attributes = {};
    selectors = {};
    handlers = {};
    style = {};
    clientWidth = 390;
    querySelector(selector) {
      return this.selectors[selector] ?? null;
    }
    getAttribute(name) {
      return this.attributes[name] ?? null;
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    removeAttribute(name) {
      delete this.attributes[name];
    }
    addEventListener(type, handler) {
      this.handlers[type] = handler;
    }
    click() {
      if (!this.disabled) this.handlers.click?.();
    }
  }
  const mainImage = new Element();
  mainImage.attributes = {
    width: '1200',
    height: '1500',
    srcset: 'cover.webp 1200w',
  };
  const mainLink = new Element();
  mainLink.selectors.img = mainImage;
  const previous = new Element();
  previous.disabled = true;
  const next = new Element();
  next.disabled = length < 2;
  const count = new Element();
  count.textContent = `1 / ${length}`;
  const thumbnails = Array.from({ length }, (_, index) => {
    const button = new Element();
    const image = new Element();
    image.attributes.src = `/uploads/image-${index}.webp`;
    image.alt = `Imagen ${index + 1}`;
    button.selectors.img = image;
    button.attributes['aria-pressed'] = String(index === 0);
    return button;
  });
  const gallery = new Element();
  gallery.selectors = {
    '[data-image-viewer-trigger]': mainLink,
    '.obra-detail__media': new Element(),
    '[data-obra-image-previous]': previous,
    '[data-obra-image-next]': next,
    '[data-obra-image-count]': count,
  };
  gallery.querySelectorAll = () => thumbnails;
  vm.runInNewContext(script, {
    document: { querySelectorAll: () => [gallery] },
    window: { addEventListener() {} },
    getComputedStyle: () => ({ maxHeight: '440px' }),
    ResizeObserver: class {
      observe() {}
    },
  });
  return { mainImage, mainLink, thumbnails, previous, next, count };
}

test('thumbnails update the image, enlargement link, selection and arrow limits', () => {
  const ui = fixture();
  ui.thumbnails[2].click();
  assert.equal(ui.mainImage.src, '/uploads/image-2.webp');
  assert.equal(ui.mainLink.href, ui.mainImage.src);
  assert.equal(ui.mainImage.alt, 'Imagen 3');
  assert.equal(
    ui.mainLink.getAttribute('aria-label'),
    'Ampliar imagen: Imagen 3',
  );
  assert.equal(ui.mainImage.getAttribute('srcset'), null);
  assert.deepEqual(
    ui.thumbnails.map((item) => item.getAttribute('aria-pressed')),
    ['false', 'false', 'true'],
  );
  assert.equal(ui.count.textContent, '3 / 3');
  assert.equal(ui.previous.disabled, false);
  assert.equal(ui.next.disabled, true);
  ui.thumbnails[0].click();
  assert.equal(ui.mainImage.src, '/uploads/image-0.webp');
  assert.equal(ui.previous.disabled, true);
  assert.equal(ui.next.disabled, false);
});

test('both arrows navigate from the selected thumbnail and stop at each end', () => {
  const ui = fixture();
  ui.next.click();
  assert.equal(ui.count.textContent, '2 / 3');
  ui.thumbnails[2].click();
  ui.next.click();
  assert.equal(ui.count.textContent, '3 / 3');
  ui.previous.click();
  assert.equal(ui.mainImage.src, '/uploads/image-1.webp');
  ui.previous.click();
  ui.previous.click();
  assert.equal(ui.count.textContent, '1 / 3');
});

test('a single-image artwork keeps both arrows disabled', () => {
  const ui = fixture(1);
  ui.thumbnails[0].click();
  ui.previous.click();
  ui.next.click();
  assert.equal(ui.count.textContent, '1 / 1');
  assert.equal(ui.previous.disabled, true);
  assert.equal(ui.next.disabled, true);
});
