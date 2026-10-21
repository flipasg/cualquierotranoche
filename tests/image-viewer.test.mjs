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
  querySelectorAll(selector) {
    return selector === '[data-image-viewer-trigger]'
      ? (this.viewerTriggers ?? [])
      : [];
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
      type,
      timeStamp: 0,
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
  root.defaultView = { matchMedia: () => ({ matches: true }) };
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
      'description-wrap',
      'description',
      'previous',
      'next',
      'navigation',
      'count',
      'caption-toggle',
    ].map((name) => {
      const element = new Element();
      dialog.children.set(`[data-viewer-${name}]`, element);
      return [name, element];
    }),
  );
  const trigger = new Element();
  trigger.dataset = {
    viewerTitle: 'Sirena Hilo',
    viewerDescription: 'Líneas ligeras y trazos intensos.',
    viewerGroup: 'artworks',
  };
  const thumbnail = new Element();
  thumbnail.alt = 'Sirena Hilo';
  thumbnail.closest = () => trigger;
  trigger.children.set('img', thumbnail);
  trigger.href = 'https://example.test/uploads/obra.webp';
  const nextTrigger = new Element();
  nextTrigger.dataset = {
    viewerTitle: 'Detalle de la obra',
    viewerDescription: '',
    viewerGroup: 'artworks',
  };
  const nextThumbnail = new Element();
  nextThumbnail.alt = 'Detalle de la obra';
  nextTrigger.children.set('img', nextThumbnail);
  nextTrigger.href = 'https://example.test/uploads/obra-detail.webp';
  root.viewerTriggers = [trigger, nextTrigger];
  elements.image.complete = false;
  elements.image.naturalWidth = 1600;
  elements.image.naturalHeight = 1200;
  const originalObserver = globalThis.ResizeObserver;
  let resize;
  let callback;
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      if (target === elements.viewport) resize = this.callback;
      else callback = this.callback;
    }
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
    descriptionWrap: elements['description-wrap'],
    previous: elements.previous,
    next: elements.next,
    resize,
    resizeCaption: () => callback(),
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
  assert.equal(ui.description.textContent, 'Líneas ligeras y trazos intensos.');
  assert.equal(ui.descriptionWrap.hidden, false);
  assert.equal(ui.previous.disabled, true);
  assert.equal(ui.next.disabled, false);
  assert.equal(ui.root.documentElement.style.overflow, 'hidden');
  assert.equal(ui.in.disabled, true);
  ui.load();
  assert.equal(ui.message.hidden, true);
  assert.equal(ui.image.style.width, '800px');
  ui.in.emit('click');
  assert.equal(ui.zoom.textContent, '150 %');
  ui.dialog.emit('keydown', { key: '+' });
  assert.equal(ui.zoom.textContent, '200 %');
  ui.reset.emit('click');
  assert.equal(ui.zoom.textContent, '100 %');
  assert.equal(ui.out.disabled, true);
  ui.next.emit('click');
  assert.equal(ui.image.src, ui.root.viewerTriggers[1].href);
  assert.equal(ui.caption.textContent, 'Detalle de la obra');
  assert.equal(ui.descriptionWrap.hidden, true);
  assert.equal(ui.previous.disabled, false);
  assert.equal(ui.next.disabled, true);
  ui.previous.emit('click');
  assert.equal(ui.image.src, ui.trigger.href);
});

test('oculta la navegación cuando solo hay una imagen', () => {
  const ui = setup();
  ui.root.viewerTriggers = [ui.trigger];
  ui.open();
  assert.equal(ui.navigation.hidden, true);
  assert.equal(ui.previous.hidden, true);
  assert.equal(ui.next.hidden, true);
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
  assert.equal(ui.dialog.open, true, 'tocar el fondo no cierra el visor');
  assert.ok(ui.dialog.emit('cancel').defaultPrevented);
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

test('admite rueda, arrastre, pellizco, cancelación y conserva zoom al rotar', () => {
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
  assert.equal(ui.zoom.textContent, '200 %');
  ui.reset.emit('click');
  assert.equal(ui.zoom.textContent, '100 %');
});

test('conserva el alt original, expande pies largos y navega solo en grupos con las flechas', () => {
  const ui = setup();
  ui.thumbnail.alt = 'Detalle de tinta azul sobre papel';
  ui.open();
  ui.load();
  assert.equal(ui.image.alt, ui.thumbnail.alt);
  assert.equal(ui.caption.textContent, 'Sirena Hilo');
  ui.caption.clientHeight = 40;
  ui.caption.scrollHeight = 100;
  ui.resizeCaption();
  assert.equal(ui['caption-toggle'].hidden, false);
  ui['caption-toggle'].emit('click');
  assert.equal(ui.caption.dataset.expanded, 'true');
  assert.equal(ui['caption-toggle'].attributes['aria-expanded'], 'true');
  assert.ok(ui.dialog.emit('keydown', { key: 'ArrowRight' }).defaultPrevented);
  assert.equal(ui.image.src, ui.root.viewerTriggers[1].href);
  assert.equal(ui.caption.dataset.expanded, 'false');
  assert.equal(ui.count.textContent, '2 / 2');
  ui.close.emit('click');
  ui.root.viewerTriggers = [ui.trigger];
  ui.open();
  ui.load();
  assert.equal(
    ui.dialog.emit('keydown', { key: 'ArrowRight' }).defaultPrevented,
    undefined,
  );
});

function touch(ui, type, x, y, timeStamp, pointerId = 1) {
  return ui.viewport.emit(type, {
    pointerType: 'touch',
    pointerId,
    clientX: x,
    clientY: y,
    timeStamp,
  });
}

test('doble toque amplía y ajusta sin ocultar controles ni duplicarse con dblclick', () => {
  const ui = setup();
  ui.open();
  ui.load();
  for (const start of [0, 600]) {
    touch(ui, 'pointerdown', 500, 300, start);
    touch(ui, 'pointerup', 500, 300, start + 50);
    touch(ui, 'pointerdown', 500, 300, start + 150);
    touch(ui, 'pointerup', 500, 300, start + 200);
    ui.viewport.emit('dblclick', {
      clientX: 500,
      clientY: 300,
      timeStamp: start + 205,
    });
    assert.equal(ui.zoom.textContent, start ? '100 %' : '200 %');
    assert.equal(ui.dialog.dataset.controlsHidden, 'false');
  }
  ui.close.emit('click');
});

test('un toque oculta controles, teclado los recupera y un arrastre o pellizco nunca cierra', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const ui = setup();
  ui.open();
  ui.load();
  touch(ui, 'pointerdown', 400, 300, 0);
  touch(ui, 'pointerup', 400, 300, 50);
  t.mock.timers.tick(301);
  assert.equal(ui.dialog.dataset.controlsHidden, 'true');
  assert.equal(ui.viewport.focused, true);
  ui.dialog.emit('keydown', { key: 'Tab' });
  assert.equal(ui.dialog.dataset.controlsHidden, 'false');
  touch(ui, 'pointerdown', 300, 300, 400);
  touch(ui, 'pointerdown', 500, 300, 410, 2);
  touch(ui, 'pointermove', 700, 300, 420, 2);
  assert.equal(ui.zoom.textContent, '200 %');
  assert.match(ui.image.style.transform, /translate\(100px, 0px\)/);
  touch(ui, 'pointerup', 300, 300, 430);
  touch(ui, 'pointerup', 700, 300, 440, 2);
  touch(ui, 'pointerdown', 300, 300, 500);
  touch(ui, 'pointermove', 350, 300, 520);
  touch(ui, 'pointerup', 350, 300, 550);
  t.mock.timers.tick(301);
  assert.equal(ui.dialog.dataset.controlsHidden, 'false');
  assert.equal(ui.dialog.open, true);
  ui.close.emit('click');
});

test('el cierre animado restaura estilos y posición de scroll, también si falta animationend', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const ui = setup();
  const body = new Element();
  body.style = { position: 'relative', top: '1px', left: '', width: '90%' };
  const original = { ...body.style };
  ui.root.body = body;
  let restored;
  Object.assign(ui.root.defaultView, {
    scrollX: 0,
    scrollY: 760,
    scrollTo: (position) => {
      restored = position;
    },
    matchMedia: () => ({ matches: false }),
  });
  ui.open();
  assert.equal(body.style.position, 'fixed');
  assert.equal(body.style.top, '-760px');
  ui.close.emit('click');
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.dialog.dataset.closing, 'true');
  ui.dialog.emit('animationend', { animationName: 'viewer-close' });
  assert.equal(ui.dialog.open, false);
  assert.deepEqual(body.style, original);
  assert.deepEqual(restored, { left: 0, top: 760, behavior: 'instant' });
  ui.open();
  ui.dialog.emit('cancel');
  t.mock.timers.tick(201);
  assert.equal(ui.dialog.open, false);
  assert.equal(ui.trigger.focused, true);
});

test('una navegación o un cierre cancela los toques y gestos pendientes', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const ui = setup();
  ui.open();
  ui.load();
  touch(ui, 'pointerdown', 400, 300, 0);
  touch(ui, 'pointerup', 400, 300, 50);
  ui.next.emit('click');
  ui.load();
  t.mock.timers.tick(301);
  assert.equal(ui.dialog.dataset.controlsHidden, 'false');
  touch(ui, 'pointerdown', 400, 300, 400);
  touch(ui, 'pointercancel', 400, 300, 420);
  t.mock.timers.tick(301);
  assert.equal(ui.zoom.textContent, '100 %');
  assert.equal(ui.dialog.dataset.controlsHidden, 'false');
  ui.close.emit('click');
});

test('Tab recorre explícitamente los controles, incluso si Safari omite botones por defecto', () => {
  const ui = setup();
  const focusable = [ui.close, ui.viewport, ui.in];
  for (const element of focusable) {
    element.getClientRects = () => [{}];
    element.closest = () => null;
    element.focus = () => {
      ui.root.activeElement = element;
    };
  }
  ui.dialog.querySelectorAll = () => focusable;
  ui.open();
  ui.load();
  ui.close.focus();
  for (const expected of [ui.viewport, ui.in, ui.close]) {
    assert.ok(ui.dialog.emit('keydown', { key: 'Tab' }).defaultPrevented);
    assert.equal(ui.root.activeElement, expected);
  }
  ui.dialog.emit('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(ui.root.activeElement, ui.in);
  ui.close.emit('click');
});
