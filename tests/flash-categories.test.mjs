import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('el CMS gestiona las categorías de flash como referencias seleccionables', async () => {
  const cms = parseYaml(await read('.pages.yml'));
  const flash = cms.content.find((entry) => entry.name === 'flash');
  const categories = flash.fields.find((field) => field.name === 'categories');
  const categoryCollection = cms.content.find(
    (entry) => entry.name === 'flash-categories',
  );

  assert.equal(categories.type, 'reference');
  assert.equal(categories.options.collection, 'flash-categories');
  assert.equal(categories.options.multiple, true);
  assert.equal(categories.options.value, '{fields.id}');
  assert.equal(categories.options.label, '{fields.label}');
  assert.equal(categoryCollection.type, 'collection');
  assert.equal(categoryCollection.path, 'src/data/flash-categories');
  assert.deepEqual(categoryCollection.view.default, {
    sort: 'order',
    order: 'asc',
  });
  assert.equal(
    categoryCollection.fields.find((field) => field.name === 'order').type,
    'number',
  );
});

test('todos los flashes usan identificadores de categorías existentes', async () => {
  const categoryDirectory = new URL('src/data/flash-categories/', root);
  const categoryFiles = (await readdir(categoryDirectory)).filter((name) =>
    name.endsWith('.json'),
  );
  const categoryIds = new Set();
  const categoryOrders = new Set();

  for (const name of categoryFiles) {
    const category = JSON.parse(
      await read(`src/data/flash-categories/${name}`),
    );
    assert.match(category.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(name, `${category.id}.json`);
    assert.equal(categoryIds.has(category.id), false);
    categoryIds.add(category.id);
    assert.equal(Number.isFinite(category.order), true);
    assert.equal(categoryOrders.has(category.order), false);
    categoryOrders.add(category.order);
  }

  assert.deepEqual(
    [...categoryOrders].sort((first, second) => first - second),
    Array.from({ length: categoryFiles.length }, (_, index) => index + 1),
  );

  const flashDirectory = new URL('src/content/flash/', root);
  const flashFiles = (await readdir(flashDirectory)).filter((name) =>
    /^f-\d{3}\.md$/.test(name),
  );

  for (const name of flashFiles) {
    const source = await read(`src/content/flash/${name}`);
    const frontmatter = parseYaml(source.split('---')[1]);
    for (const category of frontmatter.categories ?? []) {
      assert.equal(
        categoryIds.has(category),
        true,
        `${name}: categoría desconocida ${category}`,
      );
    }
  }
});

test('cada ficha importada usa el código como título y no incluye descripción ni nota', async () => {
  const flashDirectory = new URL('src/content/flash/', root);
  const flashFiles = (await readdir(flashDirectory)).filter((name) =>
    /^f-\d{3}\.md$/.test(name),
  );
  const codes = new Set();

  for (const name of flashFiles) {
    const source = await read(`src/content/flash/${name}`);
    const frontmatter = parseYaml(source.split('---')[1]);
    const expectedCode = name.replace(/^f-(\d{3})\.md$/, 'F-$1');

    assert.match(name, /^f-\d{3}\.md$/);
    assert.equal(frontmatter.code, expectedCode);
    assert.equal(frontmatter.title, expectedCode);
    assert.equal(frontmatter.description, undefined);
    assert.equal(frontmatter.note, undefined);
    assert.equal(frontmatter.coverAlt, expectedCode);
    const image = name.replace(/^f-(\d{3})\.md$/, 'flash-$1.jpg');
    assert.equal(frontmatter.cover, `/uploads/${image}`);
    assert.equal(
      codes.has(frontmatter.code),
      false,
      `${name}: código duplicado`,
    );
    codes.add(frontmatter.code);
    await access(new URL(`media/uploads/${image}`, root));
  }
});
