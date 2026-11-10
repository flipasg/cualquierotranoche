import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const script = await readFile(
  new URL('../public/scripts/header-menu.js', import.meta.url),
  'utf8',
);

test('actualiza la altura para las anclas si cambia la cabecera sin desplazar ni redimensionar la ventana', () => {
  let height = 77;
  let onResize;
  const properties = new Map();
  const header = {
    dataset: {},
    classList: { toggle() {} },
    getBoundingClientRect: () => ({ height }),
  };
  const toggle = {
    querySelector: () => null,
    setAttribute() {},
    addEventListener() {},
  };

  vm.runInNewContext(script, {
    document: {
      querySelector: (selector) =>
        selector === '[data-header]' ? header : toggle,
      documentElement: {
        style: { setProperty: (name, value) => properties.set(name, value) },
      },
    },
    window: {
      innerWidth: 1440,
      scrollY: 0,
      matchMedia: () => ({ matches: false }),
      addEventListener() {},
    },
    ResizeObserver: class {
      constructor(callback) {
        onResize = callback;
      }
      observe(target) {
        assert.equal(target, header);
      }
    },
  });

  assert.equal(properties.get('--header-height'), '77px');
  // A late-loading logo changes layout without a window resize or scroll.
  height = 115;
  onResize();
  assert.equal(properties.get('--header-height'), '115px');
  // The same measurement tracks the compact tablet header.
  height = 71;
  onResize();
  assert.equal(properties.get('--header-height'), '71px');
});
