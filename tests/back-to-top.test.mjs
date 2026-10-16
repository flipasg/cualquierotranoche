import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const script = await readFile(
  new URL('../public/scripts/back-to-top.js', import.meta.url),
  'utf8',
);

test('back-to-top follows scrolling and restored page position', () => {
  const button = { hidden: true };
  const listeners = new Map();
  const window = {
    scrollY: 0,
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  vm.runInNewContext(script, {
    document: { querySelector: () => button },
    window,
  });
  assert.equal(button.hidden, true);
  window.scrollY = 600;
  listeners.get('scroll')();
  assert.equal(button.hidden, false);
  window.scrollY = 0;
  listeners.get('scroll')();
  assert.equal(button.hidden, true);
  window.scrollY = 600;
  listeners.get('pageshow')();
  assert.equal(button.hidden, false);
});
