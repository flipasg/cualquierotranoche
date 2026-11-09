import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform as compileAstro } from '@astrojs/compiler-rs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { transform } from 'esbuild';
import { parse as parseYaml } from 'yaml';
import {
  CONSENT_KEY,
  CONSENT_DURATION,
  parseConsent,
  initAnalytics,
} from '../public/scripts/analytics.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const moduleUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const defaults = JSON.parse(await read('../src/data/analytics.json'));
const measurementId = 'G-TEST123456';
const origin = 'https://example.test';
const schemaSource = (await read('../src/lib/analytics.ts')).replace(
  "'astro/zod'",
  JSON.stringify(import.meta.resolve('astro/zod')),
);
const { analyticsSchema } = await import(
  moduleUrl(
    (await transform(schemaSource, { loader: 'ts', format: 'esm' })).code,
  )
);
const compiled = compileAstro(
  await read('../src/components/AnalyticsConsent.astro'),
  {
    filename: 'AnalyticsConsent.astro',
    internalURL: import.meta.resolve('astro/compiler-runtime'),
    resolvePath: (specifier) => specifier,
    resultScopedSlot: true,
  },
);
const { default: AnalyticsConsent } = await import(
  moduleUrl(
    (
      await transform(
        compiled.code.replace(
          /^import\s+['"][^'"]+\?astro&type=style[^'"]*['"];?$/gm,
          '',
        ),
        { loader: 'ts', format: 'esm' },
      )
    ).code,
  )
);

test.beforeEach((context) => {
  context.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-11-10T12:00:00Z'),
  });
});

const choice = (
  value = 'accepted',
  expiresAt = Date.now() + CONSENT_DURATION,
) => ({
  version: 1,
  measurementId,
  choice: value,
  expiresAt,
});

function fixture(
  context,
  { saved = null, siteOrigin = origin, blockedStorage = false } = {},
) {
  let stored = saved;
  const scripts = [];
  const cookies = new Map([
    ['_ga', 'old'],
    ['_ga_TEST123456', 'old'],
    ['other', 'keep'],
  ]);
  const timers = new Map();
  let nextTimer = 0;
  const doc = new EventTarget();
  Object.assign(doc, {
    body: {},
    referrer: 'https://referrer.test/private?email=secret#detail',
    visibilityState: 'visible',
  });
  doc.activeElement = doc.body;
  Object.defineProperty(doc, 'cookie', {
    get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
    set: (value) => {
      if (value.includes('Max-Age=0')) cookies.delete(value.split('=')[0]);
    },
  });
  doc.createElement = () => ({
    remove() {
      this.removed = true;
    },
  });
  doc.head = { append: (script) => scripts.push(script) };
  const elements = Object.fromEntries(
    [
      'panel',
      'settings',
      'accept',
      'reject',
      'controls',
      'status',
      'heading',
    ].map((name) => {
      const element = new EventTarget();
      Object.assign(element, {
        hidden: true,
        attributes: {},
        setAttribute(key, value) {
          this.attributes[key] = value;
        },
        focus() {
          doc.activeElement = element;
        },
        click() {
          element.focus();
          element.dispatchEvent(new Event('click'));
        },
      });
      return [name, element];
    }),
  );
  elements.panel.contains = (element) =>
    ['heading', 'accept', 'reject'].some((name) => element === elements[name]);
  elements.panel.querySelector = () => elements.heading;
  const root = {
    ownerDocument: doc,
    dataset: { measurementId, siteOrigin },
    querySelector: (selector) =>
      elements[selector.slice('[data-analytics-'.length, -1)],
  };
  const win = new EventTarget();
  Object.assign(win, {
    location: new URL(`${origin}/tattoo/?email=private#details`),
    setTimeout(callback, delay) {
      timers.set(++nextTimer, { callback, delay });
      return nextTimer;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    localStorage: {
      getItem() {
        if (blockedStorage) throw new Error('Storage unavailable');
        return stored;
      },
      setItem(key, value) {
        if (blockedStorage) throw new Error('Storage unavailable');
        assert.equal(key, CONSENT_KEY);
        stored = value;
      },
    },
  });
  const dispose = initAnalytics(root, win);
  if (dispose) context.after(dispose);
  return {
    root,
    doc,
    win,
    elements,
    scripts,
    cookies,
    timers,
    dispose,
    saved: () => stored,
    setSaved(value) {
      stored = value;
    },
    commands: () => (win.dataLayer ?? []).map((args) => [...args]),
  };
}

test('el CMS permite configurar GA4 y rechaza un contenedor GTM o una activación sin ID', async () => {
  assert.ok(analyticsSchema.safeParse(defaults).success);
  assert.ok(
    analyticsSchema.safeParse({ ...defaults, enabled: true, measurementId })
      .success,
  );
  for (const id of ['', 'GTM-TEST123', 'G-INVALID<script>']) {
    assert.equal(
      analyticsSchema.safeParse({
        ...defaults,
        enabled: true,
        measurementId: id,
      }).success,
      false,
    );
  }
  const cms = parseYaml(await read('../.pages.yml')).content.find(
    (entry) => entry.name === 'analytics',
  );
  assert.equal(cms.path, 'src/data/analytics.json');
  assert.deepEqual(
    cms.fields.map(({ name }) => name).sort(),
    Object.keys(defaults).sort(),
  );
});

test('el consentimiento exige una elección válida, vigente y de esta propiedad', () => {
  const accepted = choice();
  assert.deepEqual(
    parseConsent(JSON.stringify(accepted), measurementId),
    accepted,
  );
  assert.equal(
    parseConsent(JSON.stringify(choice('rejected')), measurementId).choice,
    'rejected',
  );
  for (const value of [
    null,
    {},
    { ...accepted, version: 2 },
    { ...accepted, choice: 'yes' },
    { ...accepted, measurementId: 'G-OTHER12345' },
    { ...accepted, expiresAt: Date.now() },
    { ...accepted, expiresAt: Date.now() + CONSENT_DURATION + 1 },
    { ...accepted, expiresAt: 'forever' },
  ]) {
    assert.equal(parseConsent(JSON.stringify(value), measurementId), null);
  }
  assert.equal(parseConsent('{invalid', measurementId), null);
});

test('sin elección o al rechazar no carga Google ni crea la cola de medición', (context) => {
  const f = fixture(context);
  assert.equal(f.elements.panel.hidden, false);
  assert.equal(f.elements.controls.hidden, false);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.win.dataLayer, undefined);
  f.elements.reject.click();
  assert.equal(f.elements.panel.hidden, true);
  assert.equal(f.win[`ga-disable-${measurementId}`], true);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.win.dataLayer, undefined);
  assert.equal(JSON.parse(f.saved()).choice, 'rejected');
  assert.deepEqual([...f.cookies], [['other', 'keep']]);
});

test('aceptar carga una sola etiqueta y una sola vista, sin parámetros privados ni publicidad', (context) => {
  const f = fixture(context);
  f.elements.accept.click();
  f.elements.settings.click();
  assert.equal(f.doc.activeElement, f.elements.heading);
  f.elements.accept.click();
  assert.equal(initAnalytics(f.root, f.win), f.dispose);
  assert.equal(f.scripts.length, 1);
  assert.equal(
    f.scripts[0].src,
    `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
  );
  const commands = f.commands();
  assert.equal(commands[0][2].analytics_storage, 'denied');
  assert.equal(commands[1][2].analytics_storage, 'granted');
  const configs = commands.filter(([name]) => name === 'config');
  assert.equal(configs.length, 1);
  assert.equal(configs[0][2].page_location, `${origin}/tattoo/`);
  assert.equal(configs[0][2].page_referrer, 'https://referrer.test/');
  assert.equal(configs[0][2].allow_google_signals, false);
  assert.equal(configs[0][2].allow_ad_personalization_signals, false);
  assert.equal(configs[0][2].cookie_expires, CONSENT_DURATION / 1000);
  assert.equal(configs[0][2].cookie_update, false);
  assert.equal(f.doc.activeElement, f.elements.settings);
});

test('retirar el permiso desactiva incluso una etiqueta pendiente y borra solo cookies de GA', (context) => {
  const f = fixture(context);
  f.elements.accept.click();
  f.cookies.set('_ga', 'new');
  f.cookies.set('_ga_TEST123456', 'new');
  f.elements.settings.click();
  f.elements.reject.click();
  assert.equal(f.win[`ga-disable-${measurementId}`], true);
  assert.equal(f.commands().at(-1)[2].analytics_storage, 'denied');
  assert.deepEqual([...f.cookies], [['other', 'keep']]);
  assert.equal(JSON.parse(f.saved()).choice, 'rejected');
});

test('respeta decisiones guardadas y su vencimiento sin renovar el plazo al navegar', (context) => {
  const expiresAt = Date.now() + 1000;
  const f = fixture(context, {
    saved: JSON.stringify(choice('accepted', expiresAt)),
  });
  assert.equal(f.elements.panel.hidden, true);
  assert.equal(f.scripts.length, 1);
  assert.equal(
    f.commands().find(([name]) => name === 'config')[2].cookie_expires,
    1,
  );
  context.mock.timers.tick(1000);
  [...f.timers.values()][0].callback();
  assert.equal(f.elements.panel.hidden, false);
  assert.equal(f.win[`ga-disable-${measurementId}`], true);
  const rejected = fixture(context, {
    saved: JSON.stringify(choice('rejected')),
  });
  assert.equal(rejected.scripts.length, 0);
  assert.equal(rejected.elements.panel.hidden, true);
  assert.ok(
    [...rejected.timers.values()].every(({ delay }) => delay <= 2147483647),
  );
});

test('sin almacenamiento sigue permitiendo aceptar y rechazar durante la visita', (context) => {
  const f = fixture(context, { blockedStorage: true });
  f.elements.accept.click();
  f.win.dispatchEvent(new Event('pageshow'));
  assert.equal(f.win[`ga-disable-${measurementId}`], false);
  assert.equal(f.scripts.length, 1);
  f.elements.reject.click();
  assert.equal(f.win[`ga-disable-${measurementId}`], true);
});

test('sincroniza la retirada del permiso entre pestañas y al recuperar una página', (context) => {
  for (const eventName of ['storage', 'pageshow', 'visibilitychange']) {
    const f = fixture(context, { saved: JSON.stringify(choice()) });
    f.setSaved(JSON.stringify(choice('rejected')));
    const event = new Event(eventName);
    Object.defineProperty(event, 'key', { value: CONSENT_KEY });
    (eventName === 'visibilitychange' ? f.doc : f.win).dispatchEvent(event);
    assert.equal(f.win[`ga-disable-${measurementId}`], true, eventName);
    assert.equal(f.elements.panel.hidden, true);
  }
});

test('un fallo de carga admite reintento sin duplicar vistas y las previews nunca miden', (context) => {
  const f = fixture(context);
  f.elements.accept.click();
  f.scripts[0].onerror();
  assert.equal(f.scripts[0].removed, true);
  f.elements.accept.click();
  assert.equal(f.scripts.length, 2);
  assert.equal(f.commands().filter(([name]) => name === 'config').length, 1);
  const preview = fixture(context, {
    siteOrigin: 'https://another.test',
    saved: JSON.stringify(choice()),
  });
  assert.equal(preview.dispose, undefined);
  assert.equal(preview.scripts.length, 0);
  assert.equal(preview.elements.controls.hidden, true);
});

test('la vista desactivada no añade avisos ni scripts; la activada permite las dos decisiones', async () => {
  const container = await AstroContainer.create();
  const props = {
    config: { ...defaults, enabled: false },
    origin,
    owner: 'Artista de prueba',
    email: 'test@example.test',
  };
  const disabled = await container.renderToString(AnalyticsConsent, { props });
  assert.doesNotMatch(disabled, /data-analytics|<script/);
  const html = await container.renderToString(AnalyticsConsent, {
    props: {
      ...props,
      config: {
        ...defaults,
        enabled: true,
        measurementId,
        title: '<script>unsafe</script>',
      },
    },
  });
  assert.match(html, /data-analytics-reject/);
  assert.match(html, /data-analytics-accept/);
  assert.match(html, /data-analytics-settings/);
  assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.match(html, /src="\/scripts\/analytics.js"/);
  assert.doesNotMatch(html, /src="https:\/\/www.googletagmanager.com/);
});

test('la CSP admite la etiqueta y las conexiones de Analytics sin scripts inline ni eval', async () => {
  const headers = await read('../public/_headers');
  const scriptSources = headers.match(/script-src ([^;]+);/)[1].split(' ');
  assert.deepEqual(scriptSources, [
    "'self'",
    'https://www.googletagmanager.com',
  ]);
  assert.match(
    headers,
    /connect-src 'self' https:\/\/www.googletagmanager.com https:\/\/\*\.google-analytics.com https:\/\/\*\.google.com;/,
  );
  assert.match(headers, /form-action https:\/\/tally.so;/);
});
