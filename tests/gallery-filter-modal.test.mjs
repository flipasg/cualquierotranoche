import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const script = await readFile(
  new URL('../public/scripts/gallery-filters.js', import.meta.url),
  'utf8',
);

// Event-driven DOM double; each action runs the production gallery controller.
function fixture(width = 768, query = '') {
  let focused;
  class Element {
    dataset = {};
    attributes = {};
    style = {};
    children = [];
    handlers = new Map();
    selectors = new Map();
    hidden = false;
    textContent = '';
    value = '';
    tabIndex = 0;
    scrollHeight = 0;
    clientHeight = 0;
    scrollTop = 0;
    getClientRects() {
      return this.hidden ? [] : [{}];
    }
    open = false;
    addEventListener(type, handler) {
      const handlers = this.handlers.get(type) ?? [];
      handlers.push(handler);
      this.handlers.set(type, handlers);
    }
    emit(type, props = {}) {
      const event = {
        target: this,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...props,
      };
      for (const handler of this.handlers.get(type) ?? []) handler(event);
      return event;
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    getAttribute(name) {
      return this.attributes[name];
    }
    querySelector(selector) {
      return this.selectors.get(selector) ?? null;
    }
    querySelectorAll(selector) {
      return this.selectors.get(selector) ?? [];
    }
    append(...nodes) {
      for (const node of nodes) {
        if (node.parentElement)
          node.parentElement.children = node.parentElement.children.filter(
            (child) => child !== node,
          );
        node.parentElement = this;
        this.children.push(node);
      }
    }
    prepend(...nodes) {
      this.append(...nodes);
      this.children.unshift(...this.children.splice(-nodes.length));
    }
    replaceChildren(...nodes) {
      this.children = [];
      this.append(...nodes);
    }
    contains(node) {
      return (
        node === this || this.children.some((child) => child.contains(node))
      );
    }
    closest() {
      return this.parentElement;
    }
    focus() {
      focused = this;
    }
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
      this.emit('close');
    }
    getBoundingClientRect() {
      return { left: 16, right: 600, top: 16, bottom: 700, height: 64 };
    }
  }
  const element = (dataset = {}, text = '') =>
    Object.assign(new Element(), { dataset, textContent: text });
  const gallery = element({
    galleryTaxonomyParam: 'category',
    gallerySearchParam: 'search',
  });
  const map = (selector, node) => {
    gallery.selectors.set(selector, node);
    return node;
  };
  const panel = map(
    '[data-gallery-filter-panel]',
    element({ galleryDefaultStatus: 'disponible' }),
  );
  const controls = map('[data-gallery-filter-controls]', element());
  panel.append(controls);
  const trigger = map(
    '[data-gallery-filter-summary]',
    element({ filterLabel: 'Filtros' }),
  );
  const dialog = map('[data-gallery-filter-dialog]', element());
  const body = map('[data-gallery-dialog-body]', element());
  const title = map('[data-gallery-dialog-title]', element());
  const close = map('[data-gallery-close]', element());
  const apply = map('[data-gallery-apply]', element());
  const clear = element();
  const clearOutside = element();
  dialog.append(body, title, close, apply, clear);
  dialog.selectors.set('button, input, select, textarea, a[href], [tabindex]', [
    close,
    apply,
  ]);
  map('[data-gallery-clear]', [clear, clearOutside]);
  const taxonomySelect = map('[data-gallery-taxonomy-select]', element());
  const taxonomyScroll = map('[data-gallery-taxonomy-scroll]', element());
  controls.append(taxonomySelect);
  const summary = map(
    '[data-gallery-taxonomy-summary-label]',
    element({}, 'Todas'),
  );
  const all = map('[data-gallery-taxonomy-all]', element());
  const selectedRows = map('[data-gallery-taxonomy-selected]', element());
  const unselectedRows = map('[data-gallery-taxonomy-unselected]', element());
  taxonomySelect.append(summary, all, selectedRows, unselectedRows);
  map('[data-gallery-taxonomy-selected-section]', element());
  const options = ['a', 'b'].map((value) => {
    const row = element({}, `Categoría ${value}`);
    const option = Object.assign(element(), { value });
    row.append(option);
    unselectedRows.append(row);
    return option;
  });
  map('[data-gallery-taxonomy-option]', options);
  const statuses = ['disponible', 'all', 'vendido'].map((id) =>
    element({ galleryStatus: id }, id),
  );
  controls.append(...statuses);
  map('button[data-gallery-status]', statuses);
  const featured = map('[data-gallery-featured]', [
    element({ galleryFeatured: 'b' }),
  ])[0];
  const search = map('[data-gallery-search]', element());
  const taxonomySearch = map('[data-gallery-taxonomy-search]', element());
  const cards = Array.from({ length: 12 }, (_, index) => {
    const card = element({
      galleryStatus: index < 10 ? 'disponible' : 'vendido',
      galleryTaxonomies: index % 2 ? 'b' : 'a',
    });
    card.selectors.set('h3', element({}, `Dibujo ${index}`));
    return card;
  });
  map('[data-gallery-card]', cards);
  const empty = map(
    '[data-gallery-empty]',
    element({ emptyMessage: 'Sin resultados' }),
  );
  map('[data-gallery-result-count]', element());
  map('[data-gallery-item-label]', element({ galleryItemLabel: 'piezas' }));
  const pagination = map(
    '[data-gallery-pagination-controls], [data-flash-pagination]',
    element({
      pageSize: '6',
      pageSizeTablet: '6',
      pageSizeDesktop: '8',
      previousLabel: 'Anterior',
      nextLabel: 'Siguiente',
      pageStatus: '{currentPage}/{pageCount}',
    }),
  );
  map('[data-gallery-pagination]', element());
  const results = map(
    '[data-gallery-results-grid], [data-flash-grid]',
    element(),
  );
  const document = element();
  Object.defineProperty(document, 'activeElement', { get: () => focused });
  document.body = element();
  document.body.style.overflow = 'auto';
  document.selectors.set('[data-gallery]', [gallery]);
  document.createElement = () => element();
  const media = new Map();
  const matches = (query) =>
    query.includes('767')
      ? width <= 767
      : query.includes('1024')
        ? width >= 1024
        : true;
  let replacements = 0;
  const window = {
    location: { href: `https://example.test/flash/${query}` },
    history: {
      replaceState(_state, _title, url) {
        window.location.href = String(url);
        replacements++;
      },
    },
    matchMedia(query) {
      if (!media.has(query))
        media.set(query, Object.assign(element(), { matches: matches(query) }));
      return media.get(query);
    },
    scrollTo() {},
    scrollY: 0,
  };
  vm.runInNewContext(script, { document, window, URL, Set, performance });
  return {
    cards,
    dialog,
    body,
    controls,
    panel,
    trigger,
    title,
    close,
    apply,
    clear,
    clearOutside,
    options,
    statuses,
    all,
    search,
    taxonomySearch,
    taxonomyScroll,
    featured,
    empty,
    pagination,
    results,
    get url() {
      return window.location.href;
    },
    get focused() {
      return focused;
    },
    get overflow() {
      return document.body.style.overflow;
    },
    get replacements() {
      return replacements;
    },
    shown() {
      return cards.filter((card) => !card.hidden);
    },
    choose(index, checked = true) {
      options[index].checked = checked;
      options[index].emit('change');
    },
    resize(nextWidth) {
      width = nextWidth;
      for (const [query, entry] of media) {
        const next = matches(query);
        if (entry.matches !== next) {
          entry.matches = next;
          entry.emit('change');
        }
      }
    },
  };
}

test('móvil y tablet mantienen resultados y URL hasta aplicar, con un único juego de controles', () => {
  for (const width of [390, 768, 1023]) {
    const f = fixture(width);
    const initial = f.shown();
    assert.equal(f.controls.parentElement, f.body);
    assert.equal(f.trigger.hidden, false);
    f.trigger.emit('click');
    assert.equal(f.focused, f.title);
    assert.equal(f.overflow, 'hidden');
    f.statuses[2].emit('click');
    f.choose(1);
    assert.deepEqual(f.shown(), initial);
    assert.equal(f.replacements, 0);
    f.apply.emit('click');
    assert.equal(f.dialog.open, false);
    assert.equal(f.focused, f.trigger);
    assert.equal(f.overflow, 'auto');
    assert.equal(f.shown().length, 1);
    assert.equal(new URL(f.url).searchParams.get('status'), 'vendido');
    assert.equal(new URL(f.url).searchParams.get('category'), 'b');
    f.trigger.emit('click');
    assert.equal(f.options[1].checked, true);
    assert.equal(f.statuses[2].getAttribute('aria-pressed'), 'true');
  }
});

test('cerrar, Escape y fondo descartan borradores y devuelven el foco', () => {
  for (const dismiss of [
    (f) => f.close.emit('click'),
    (f) => f.dialog.emit('cancel'),
    (f) => f.dialog.emit('click', { clientX: 0, clientY: 0 }),
  ]) {
    const f = fixture(768, '?category=a');
    f.trigger.emit('click');
    f.choose(0, false);
    f.choose(1);
    dismiss(f);
    assert.equal(f.dialog.open, false);
    assert.equal(f.options[0].checked, true);
    assert.equal(f.options[1].checked, false);
    assert.equal(new URL(f.url).searchParams.get('category'), 'a');
    assert.equal(f.replacements, 0);
    assert.equal(f.focused, f.trigger);
    assert.equal(f.overflow, 'auto');
  }
});

test('limpiar dentro del modal solo limpia el borrador, incluida la búsqueda general', () => {
  const f = fixture(768, '?category=a&search=Dibujo');
  f.trigger.emit('click');
  f.clear.emit('click');
  assert.equal(f.all.checked, true);
  assert.equal(f.clear.hidden, true);
  assert.equal(new URL(f.url).searchParams.get('category'), 'a');
  assert.equal(f.search.value, 'Dibujo');
  f.close.emit('click');
  assert.equal(f.options[0].checked, true);
  f.trigger.emit('click');
  f.clear.emit('click');
  f.apply.emit('click');
  assert.equal(new URL(f.url).search, '');
  assert.equal(f.search.value, '');
});

test('escritorio aplica directamente; redimensionar descarta el borrador y conserva la paginación', () => {
  const f = fixture(768);
  assert.equal(f.shown().length, 6);
  f.trigger.emit('click');
  f.choose(1);
  f.resize(1024);
  assert.equal(f.dialog.open, false);
  assert.equal(f.controls.parentElement, f.panel);
  assert.equal(f.trigger.hidden, true);
  assert.equal(f.options[1].checked, false);
  assert.equal(f.overflow, 'auto');
  assert.equal(f.shown().length, 8);
  f.choose(0);
  assert.equal(f.shown().length, 5);
  assert.equal(new URL(f.url).searchParams.get('category'), 'a');
  f.resize(390);
  assert.equal(f.controls.parentElement, f.body);
  assert.equal(f.options[0].checked, true);
  f.featured.emit('click');
  assert.equal(f.shown().length, 10);
  f.clearOutside.emit('click');
  assert.equal(new URL(f.url).search, '');
});

test('aplicar reinicia la paginación y conserva el estado vacío', () => {
  const f = fixture(768);
  f.pagination.children.at(-1).emit('click');
  assert.equal(f.shown().length, 4);
  f.trigger.emit('click');
  f.choose(0);
  f.apply.emit('click');
  assert.equal(f.shown().length, 5);
  f.search.value = 'No existe';
  f.search.emit('input');
  assert.equal(f.shown().length, 0);
  assert.equal(f.empty.hidden, false);
  f.trigger.emit('click');
  f.close.emit('click');
  assert.equal(f.empty.hidden, false);
});

test('Tab y Mayús+Tab recorren el modal sin perder el foco al reagrupar categorías', () => {
  const f = fixture();
  f.trigger.emit('click');
  const backwards = f.dialog.emit('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(backwards.defaultPrevented, true);
  assert.equal(f.focused, f.apply);
  const forwards = f.dialog.emit('keydown', { key: 'Tab' });
  assert.equal(forwards.defaultPrevented, true);
  assert.equal(f.focused, f.close);
  f.options[0].focus();
  f.choose(0);
  assert.equal(f.focused, f.options[0]);
});

test('la lista indica el desbordamiento y actualiza la pista al desplazar o buscar', () => {
  const f = fixture(390);
  f.taxonomyScroll.scrollHeight = 240;
  f.taxonomyScroll.clientHeight = 120;
  f.trigger.emit('click');
  assert.equal(f.taxonomyScroll.dataset.canScroll, 'true');
  assert.equal(f.taxonomyScroll.dataset.atBottom, 'false');
  const initialUrl = f.url;
  const initialCards = f.shown();

  f.taxonomyScroll.scrollTop = 120;
  f.taxonomyScroll.emit('scroll');
  assert.equal(f.taxonomyScroll.dataset.atBottom, 'true');
  f.taxonomySearch.value = 'sin coincidencias';
  f.taxonomySearch.emit('input');
  f.taxonomyScroll.scrollHeight = 0;
  f.taxonomyScroll.clientHeight = 120;
  f.taxonomyScroll.emit('scroll');

  assert.equal(f.taxonomyScroll.scrollTop, 0);
  assert.equal(f.taxonomyScroll.dataset.canScroll, 'false');
  assert.equal(f.taxonomyScroll.dataset.atBottom, 'true');
  assert.equal(f.url, initialUrl);
  assert.deepEqual(f.shown(), initialCards);
  f.close.emit('click');
});
