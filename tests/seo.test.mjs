import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { richTextToPlainText } from '../src/lib/rich-text.mjs';
import { resolveSeo, serializeJsonLd } from '../src/lib/seo.mjs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const brand = 'Cualquier otra noche';

test('los metadatos extraen texto de Markdown, colores y HTML sin perder acentos', () => {
  assert.equal(
    richTextToPlainText(
      '# {{accent}}Ilustración **de autora**{{/accent}}\n\n[Cartelería](https://example.com) y {{color:#ABCDEF}}dibujo{{/color}}.\n\n- Papel\n- Piel',
    ),
    'Ilustración de autora Cartelería y dibujo. Papel Piel',
  );
  assert.equal(
    richTextToPlainText(
      '<p title="una > otra">Vitoria-<em>Gasteiz</em><br>Patricia &amp; ilustración</p><!-- interno --><script>oculto()</script><style>.hidden {}</style>',
    ),
    'Vitoria-Gasteiz Patricia & ilustración',
  );
  assert.equal(
    richTextToPlainText('![Un dibujo](/uploads/obra.png) y `papel`'),
    'Un dibujo y papel',
  );
  assert.equal(
    richTextToPlainText('Caf&eacute;&nbsp;&#xE1; &#241; &quot;piel&quot;'),
    'Café á ñ "piel"',
  );
  assert.equal(richTextToPlainText('&#1114112; &#xD800;'), '� �');
  assert.equal(richTextToPlainText('&constructor;'), '&constructor;');
});

test('los campos SEO vacíos recuperan los valores actuales sin modificar el contenido', () => {
  const page = {
    title: 'Tattoo',
    description: '{{accent}}Tatuajes y flash{{/accent}}',
    seoTitle: ' ',
    seoDescription: '** **',
  };
  const before = { ...page };
  assert.deepEqual(
    resolveSeo({ ...page, seoDescription: '{{accent}}{{/accent}}' }, brand),
    {
      title: 'Tattoo · Cualquier otra noche',
      description: 'Tatuajes y flash',
    },
  );
  assert.deepEqual(
    resolveSeo(
      {
        ...page,
        seoTitle: 'Tatuadora en Vitoria',
        seoDescription: 'Tatuaje de autor',
      },
      brand,
    ),
    {
      title: 'Tatuadora en Vitoria · Cualquier otra noche',
      description: 'Tatuaje de autor',
    },
  );
  assert.deepEqual(page, before);
  assert.deepEqual(resolveSeo({}, brand), { title: brand, description: '' });
  assert.deepEqual(resolveSeo({}, undefined), { title: '', description: '' });
  assert.equal(richTextToPlainText(null), '');
});

test('la marca se añade una sola vez y conserva los títulos propios de las fichas', () => {
  for (const title of [
    'Tattoo',
    `Tattoo · ${brand}`,
    `${brand} — Tattoo`,
    `${brand} — Tattoo · ${brand} · ${brand}`,
  ]) {
    assert.equal(resolveSeo({ title }, brand).title, `Tattoo · ${brand}`);
  }
  assert.equal(resolveSeo({ title: brand }, brand).title, brand);
  assert.equal(
    resolveSeo({ title: 'Algo · Arte (A+B)' }, 'Arte (A+B)').title,
    'Algo · Arte (A+B)',
  );
  assert.equal(
    resolveSeo({ title: '{{accent}}Cartelería{{/accent}}' }, brand).title,
    `Cartelería · ${brand}`,
  );
});

test('el JSON-LD conserva sus datos sin poder cerrar el bloque script', () => {
  const value = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '</script><script>alert("x")</script>\u2028\u2029',
    url: 'https://example.com/',
  };
  const serialized = serializeJsonLd(value);
  assert.doesNotMatch(serialized, /<|\u2028|\u2029/);
  assert.deepEqual(JSON.parse(serialized), value);
});

test('las ocho páginas tienen SEO independiente y editable en el CMS', async () => {
  const site = JSON.parse(await read('../src/data/site.json'));
  const cms = parseYaml(await read('../.pages.yml'));
  const ui = cms.content
    .find((item) => item.path === 'src/data/site.json')
    .fields.find((field) => field.name === 'ui');
  const expected = {
    homePage: 'Tatuadora e ilustradora en Vitoria',
    about: 'Patricia García Ramírez, tatuadora e ilustradora',
    contact: 'Contacto y citas en Vitoria',
    tattoo: 'Tatuadora en Vitoria',
    tattoos: 'Tatuajes de autor e ilustrativos',
    flash: 'Flash de tatuaje en Vitoria',
    artwork: 'Obra original y seriada',
    illustration: 'Ilustradora en Vitoria',
  };
  for (const [name, title] of Object.entries(expected)) {
    assert.equal(site.ui[name].seoTitle, title);
    assert.ok(site.ui[name].seoDescription.trim());
    const fields = ui.fields.find((field) => field.name === name).fields;
    for (const fieldName of ['seoTitle', 'seoDescription']) {
      const field = fields.find((field) => field.name === fieldName);
      assert.ok(field, `${name}.${fieldName} editable`);
      assert.notEqual(field.required, true);
    }
  }
});
