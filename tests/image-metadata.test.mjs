import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { richTextToPlainText } from '../src/lib/rich-text.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const normalize = (text) => text.trim().toLocaleLowerCase('es');

for (const collection of ['tattoos', 'flash', 'obras', 'proyectos']) {
  test(`${collection}: portadas y galerías identifican la pieza por su título`, async () => {
    const directory = `src/content/${collection}/`;
    const files = (await readdir(new URL(directory, root))).filter((name) =>
      name.endsWith('.md'),
    );
    assert.ok(files.length > 0);
    for (const file of files) {
      const raw = await read(`${directory}${file}`);
      const [, frontmatter, body] = raw.split(/^---\s*$/m);
      const data = parseYaml(frontmatter);
      const title = richTextToPlainText(data.title);
      assert.ok(title.trim(), `${file}: falta el título`);
      for (const image of [
        { src: data.cover, alt: data.coverAlt },
        ...(data.gallery ?? []),
      ]) {
        assert.equal(typeof image.alt, 'string', `${file}: ${image.src}`);
        assert.ok(
          normalize(image.alt).includes(normalize(title)),
          `${file}: el alt de ${image.src} debe identificar «${title}»`,
        );
        assert.doesNotMatch(
          image.alt,
          /^(?:tattoo|obra(?: original)?|imagen|detalle|F-\d+)(?:\s*\d+)?\.?$/i,
          `${file}: texto alternativo genérico`,
        );
      }
      if (collection === 'tattoos') {
        assert.ok(body.trim(), `${file}: falta el contenido`);
        assert.doesNotMatch(
          body.trim(),
          /^tattoo$/i,
          `${file}: contenido genérico`,
        );
      }
    }
  });
}

test('las tarjetas de obra publican el texto alternativo configurado en el CMS', async () => {
  const card = await read('src/components/WorkCard.astro');
  assert.match(card, /<GalleryImage\s[^>]*alt=\{work\.data\.coverAlt\}/);
});

test('el CMS mantiene editables los textos alternativos de portadas, galerías y el contenido de tatuajes', async () => {
  const cms = parseYaml(await read('.pages.yml'));
  for (const name of ['tattoos', 'flash', 'obras', 'proyectos']) {
    const collection = cms.content.find((entry) => entry.name === name);
    const coverAlt = collection.fields.find(
      (field) => field.name === 'coverAlt',
    );
    assert.equal(coverAlt.type, 'string');
    assert.match(coverAlt.description, /título/);
    if (name === 'obras' || name === 'proyectos') {
      const gallery = collection.fields.find(
        (field) => field.name === 'gallery',
      );
      const alt = gallery.fields.find((field) => field.name === 'alt');
      assert.equal(alt.type, 'string');
      assert.match(alt.description, /título/);
    }
    if (name === 'tattoos') {
      const body = collection.fields.find((field) => field.name === 'body');
      assert.equal(body.type, 'rich-text');
      assert.match(body.description, /título del tatuaje/);
    }
  }
});
