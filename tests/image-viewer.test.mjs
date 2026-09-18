import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fitImage,
  constrainView,
  zoomAt,
  initImageViewer,
} from '../public/scripts/image-viewer.js';

test('ajusta imágenes de cualquier tamaño a la pantalla sin deformarlas, incluidos SVG sin tamaño explícito', () => {
  assert.deepEqual(
    fitImage({ width: 1200, height: 1800 }, { width: 800, height: 600 }),
    { width: 400, height: 600 },
  );
  assert.deepEqual(
    fitImage({ width: 1600, height: 800 }, { width: 400, height: 600 }),
    { width: 400, height: 200 },
  );
  assert.deepEqual(
    fitImage({ width: 100, height: 150 }, { width: 800, height: 600 }),
    { width: 400, height: 600 },
  );
});

test('limita el zoom y el desplazamiento para no perder la imagen fuera de la pantalla', () => {
  const image = { width: 400, height: 600 };
  const viewport = { width: 800, height: 600 };
  assert.deepEqual(
    constrainView({ scale: 10, x: 900, y: -2000 }, image, viewport),
    { scale: 4, x: 400, y: -900 },
  );
  assert.deepEqual(
    constrainView({ scale: 0.1, x: 100, y: -100 }, image, viewport),
    { scale: 1, x: 0, y: 0 },
  );
});

test('el zoom mantiene el detalle señalado bajo el cursor y ajustar vuelve al centro', () => {
  const image = { width: 800, height: 600 };
  const viewport = { ...image };
  const point = { x: 100, y: -50 };
  const enlarged = zoomAt({ scale: 1, x: 0, y: 0 }, 2, point, image, viewport);
  assert.deepEqual(enlarged, { scale: 2, x: -100, y: 50 });
  assert.deepEqual(zoomAt(enlarged, 1, point, image, viewport), {
    scale: 1,
    x: 0,
    y: 0,
  });
});

// Small event-driven DOM double: interactions execute the production controller.
class Element {
  handlers = new Map();
  children = new Map();
  style = {};
  dataset = {};
  attributes = {};
  clientWidth = 800;
  clientHeight = 600;
  querySelector(selector) {
    return this.children.get(selector);
  }
  closest() {
    return this;
  }
  addEventListener(type, callback) {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(callback);
    this.handlers.set(type, handlers);
  }
  emit(type, details = {}) {
    const event = {
      target: this,
      button: 0,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...details,
    };
    for (const handler of this.handlers.get(type) ?? []) handler(event);
    return event;
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  removeAttribute(name) {
    delete this[name];
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
    this.emit('close');
  }
  focus() {
    this.focused = true;
  }
  setPointerCapture() {}
  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.clientWidth,
      height: this.clientHeight,
    };
  }
}

function setup() {
  const root = new Element();
  root.documentElement = new Element();
  root.documentElement.style.overflow = 'auto';
  const dialog = new Element();
  root.children.set('#image-viewer', dialog);
  const elements = Object.fromEntries(
    [
      'viewport',
      'image',
      'caption',
      'message',
      'zoom',
      'in',
      'out',
      'reset',
      'close',
    ].map((name) => {
      const element = new Element();
      dialog.children.set(`[data-viewer-${name}]`, element);
      return [name, element];
    }),
  );
  const trigger = new Element();
  const thumbnail = new Element();
  thumbnail.alt = 'Detalle de la obra';
  thumbnail.closest = () => trigger;
  trigger.children.set('img', thumbnail);
  trigger.href = 'https://example.test/uploads/obra.webp';
  elements.image.complete = false;
  elements.image.naturalWidth = 1600;
  elements.image.naturalHeight = 1200;
  const originalObserver = globalThis.ResizeObserver;
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resize = callback;
    }
    observe() {}
  };
  try {
    initImageViewer(root);
  } finally {
    if (originalObserver) globalThis.ResizeObserver = originalObserver;
    else delete globalThis.ResizeObserver;
  }
  return {
    root,
    dialog,
    trigger,
    thumbnail,
    ...elements,
    resize,
    open() {
      return root.emit('click', { target: thumbnail });
    },
    load() {
      elements.image.emit('load');
    },
  };
}

test('abre la imagen seleccionada, muestra carga y habilita zoom al cargar', () => {
  const ui = setup();
  assert.ok(ui.open().defaultPrevented);
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.image.src, ui.trigger.href);
  assert.equal(ui.image.alt, ui.thumbnail.alt);
  assert.equal(ui.caption.textContent, ui.thumbnail.alt);
  assert.equal(ui.root.documentElement.style.overflow, 'hidden');
  assert.equal(ui.in.disabled, true);
  ui.load();
  assert.equal(ui.message.hidden, true);
  assert.equal(ui.image.style.width, '800px');
  ui.in.emit('click');
  assert.equal(ui.zoom.textContent, '150 %');
  ui.dialog.emit('keydown', { key: '+' });
  assert.equal(ui.zoom.textContent, '200 %');
  ui.dialog.emit('keydown', { key: 'ArrowRight' });
  assert.match(ui.image.style.transform, /translate\(-60px, 0px\)/);
  ui.reset.emit('click');
  assert.equal(ui.zoom.textContent, '100 %');
  assert.equal(ui.out.disabled, true);
});

test('cerrar restaura scroll, foco y zoom para la próxima imagen', () => {
  const ui = setup();
  ui.open();
  ui.load();
  ui.in.emit('click');
  ui.close.emit('click');
  assert.equal(ui.dialog.open, false);
  assert.equal(ui.root.documentElement.style.overflow, 'auto');
  assert.equal(ui.trigger.focused, true);
  assert.equal(ui.image.src, undefined);
  ui.open();
  ui.load();
  assert.equal(ui.zoom.textContent, '100 %');
  ui.dialog.emit('click');
  assert.equal(ui.dialog.open, false);
});

test('permite abrir el enlace con modificadores y muestra un error recuperable', () => {
  const ui = setup();
  assert.equal(
    ui.root.emit('click', { target: ui.thumbnail, metaKey: true })
      .defaultPrevented,
    undefined,
  );
  assert.equal(ui.dialog.open, undefined);
  ui.open();
  ui.image.naturalWidth = 0;
  ui.image.emit('error');
  assert.match(ui.message.textContent, /No se ha podido cargar/);
  assert.equal(ui.in.disabled, true);
  ui.close.emit('click');
  ui.image.naturalWidth = 1600;
  ui.open();
  ui.load();
  assert.equal(ui.message.hidden, true);
});

test('admite rueda, arrastre, pellizco, cancelación y reajuste al rotar', () => {
  const ui = setup();
  ui.open();
  ui.load();
  assert.ok(
    ui.viewport.emit('wheel', {
      deltaY: -100,
      deltaMode: 0,
      clientX: 400,
      clientY: 300,
    }).defaultPrevented,
  );
  assert.notEqual(ui.zoom.textContent, '100 %');
  ui.viewport.emit('pointerdown', { pointerId: 1, clientX: 300, clientY: 300 });
  ui.viewport.emit('pointermove', { pointerId: 1, clientX: 330, clientY: 300 });
  assert.match(ui.image.style.transform, /translate\(30px, 0px\)/);
  ui.viewport.emit('pointercancel', { pointerId: 1 });
  const transform = ui.image.style.transform;
  ui.viewport.emit('pointermove', { pointerId: 1, clientX: 500, clientY: 300 });
  assert.equal(ui.image.style.transform, transform);
  ui.reset.emit('click');
  ui.viewport.emit('pointerdown', { pointerId: 1, clientX: 300, clientY: 300 });
  ui.viewport.emit('pointerdown', { pointerId: 2, clientX: 500, clientY: 300 });
  ui.viewport.emit('pointermove', { pointerId: 2, clientX: 700, clientY: 300 });
  assert.equal(ui.zoom.textContent, '200 %');
  ui.viewport.emit('pointerup', { pointerId: 1 });
  ui.viewport.emit('pointerup', { pointerId: 2 });
  assert.equal(ui.viewport.dataset.dragging, 'false');
  ui.viewport.clientWidth = 360;
  ui.resize();
  assert.equal(ui.image.style.width, '360px');
  assert.equal(ui.zoom.textContent, '100 %');
});
