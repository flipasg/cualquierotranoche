import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import sharp from 'sharp';

const prepareMedia = fileURLToPath(
  new URL('../scripts/prepare-media.mjs', import.meta.url),
);

async function fixture(context) {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-favicon-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  for (const folder of ['flash', 'tattoos', 'obras', 'proyectos', 'paginas'])
    await mkdir(join(directory, 'src/content', folder), { recursive: true });
  await mkdir(join(directory, 'src/data'), { recursive: true });
  await mkdir(join(directory, 'media/uploads'), { recursive: true });
  await writeFile(
    join(directory, 'src/data/site.json'),
    JSON.stringify({ ui: { header: {} }, home: {} }),
  );
  return {
    original: (name) => join(directory, 'media/uploads', name),
    output: (src) => join(directory, 'public', src),
    async generate(name) {
      await writeFile(
        join(directory, 'src/data/social.json'),
        JSON.stringify({ favicon: `/uploads/${name}`, pages: [] }),
      );
      await promisify(execFile)(process.execPath, [prepareMedia], {
        cwd: directory,
      });
      const manifest = JSON.parse(
        await readFile(join(directory, 'src/generated/media.json'), 'utf8'),
      );
      return manifest[`/uploads/${name}`].icons;
    },
  };
}

const square = (background) =>
  sharp({ create: { width: 180, height: 180, channels: 3, background } });

test('cambiar el favicon del CMS convierte JPG, JPEG, PNG, WebP y SVG', async (context) => {
  const files = await fixture(context);
  for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'svg']) {
    const name = `nuevo-icono.${extension}`;
    if (extension === 'svg') {
      await writeFile(
        files.original(name),
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><path fill="#ff0000" d="M0 0h180v180H0z"/></svg>',
      );
    } else {
      await square('#ff0000').toFile(files.original(name));
    }
    const original = await readFile(files.original(name));
    const icons = await files.generate(name);
    assert.deepEqual(
      icons.map(({ size }) => size),
      [16, 32, 48, 180],
    );
    for (const { src, size } of icons) {
      const icon = sharp(files.output(src));
      const metadata = await icon.metadata();
      assert.equal(metadata.format, 'png');
      assert.equal(metadata.width, size);
      assert.equal(metadata.height, size);
      const pixel = await icon.resize(1, 1).removeAlpha().raw().toBuffer();
      assert.ok(pixel[0] > 240 && pixel[1] < 10 && pixel[2] < 10);
    }
    assert.deepEqual(await readFile(files.original(name)), original);
  }
});

test('sustituir una imagen con el mismo nombre renueva la caché de todos los iconos', async (context) => {
  const files = await fixture(context);
  const name = 'favicon.png';
  await square('#ff0000').png().toFile(files.original(name));
  const first = await files.generate(name);
  assert.deepEqual(await files.generate(name), first);
  await square('#0000ff').png().toFile(files.original(name));
  const replacement = await files.generate(name);
  for (const { src, size } of replacement) {
    assert.notEqual(src, first.find((icon) => icon.size === size).src);
    const pixel = await sharp(files.output(src))
      .resize(1, 1)
      .removeAlpha()
      .raw()
      .toBuffer();
    assert.deepEqual([...pixel], [0, 0, 255]);
  }
});

test('un favicon ausente o no admitido falla sin usar otra imagen de respaldo', async (context) => {
  const files = await fixture(context);
  await square('#ff0000').png().toFile(files.original('otra-imagen.png'));
  await assert.rejects(
    files.generate('no-existe.png'),
    /Favicon:.*no-existe\.png/,
  );
  await assert.rejects(
    files.generate('no-admitido.ico'),
    /Favicon:.*no-admitido\.ico/,
  );
});
