import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { transform } from 'esbuild';
import { transform as compileAstro } from '@astrojs/compiler';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';
import { parseFragment } from 'parse5';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const moduleUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const helperSource = (await read('../src/lib/social.ts')).replace(
  "'astro/zod'",
  JSON.stringify(import.meta.resolve('astro/zod')),
);
const { socialSchema, resolveSocial, validateSocialImages } = await import(
  moduleUrl(
    (await transform(helperSource, { loader: 'ts', format: 'esm' })).code,
  )
);
const compiled = await compileAstro(
  await read('../src/components/SocialMeta.astro'),
  {
    internalURL: import.meta.resolve('astro/compiler-runtime'),
    resolvePath: (specifier) => specifier,
  },
);
const { default: SocialMeta } = await import(
  moduleUrl(
    (await transform(compiled.code, { loader: 'ts', format: 'esm' })).code,
  )
);
const container = await AstroContainer.create();
const defaults = {
  favicon: '/uploads/favicon.svg',
  title: 'Artista',
  description: 'Descripción general',
  image: '/uploads/general.png',
  imageAlt: 'Imagen general',
};
const media = {
  '/uploads/general.png': {
    src: '/uploads/general.webp',
    width: 1200,
    height: 630,
  },
  '/uploads/pagina.jpg': {
    src: '/uploads/pagina.webp',
    width: 1000,
    height: 600,
  },
  '/uploads/obra.png': { src: '/uploads/obra.webp', width: 800, height: 1000 },
};
const page = {
  pathname: '/obra/pieza/',
  title: 'Pieza · Artista',
  description: 'Una pieza original',
  image: '/uploads/obra.png',
  imageAlt: 'La pieza',
};

test('la configuración del CMS es válida y conserva todos los campos editables', async () => {
  const data = JSON.parse(await read('../src/data/social.json'));
  assert.equal(socialSchema.safeParse(data).success, true);
  const cms = parseYaml(await read('../.pages.yml')).content.find(
    (entry) => entry.name === 'social',
  );
  assert.equal(cms.path, 'src/data/social.json');
  assert.deepEqual(
    Object.keys(data).sort(),
    cms.fields.map((field) => field.name).sort(),
  );
  assert.deepEqual(
    Object.keys(data.pages[0]).sort(),
    cms.fields
      .find((field) => field.name === 'pages')
      .fields.map((field) => field.name)
      .sort(),
  );
});

test('mantiene la portada general y usa los textos de cada página con imagen de respaldo', () => {
  const config = socialSchema.parse(defaults);
  const home = resolveSocial(
    config,
    { ...page, pathname: '/', image: undefined },
    media,
  );
  assert.equal(home.title, defaults.title);
  assert.equal(home.description, defaults.description);
  assert.equal(home.image.src, '/uploads/general.webp');
  const contact = resolveSocial(
    config,
    {
      pathname: '/contacto/',
      title: 'Contacto · Artista',
      description: 'Escríbeme',
    },
    media,
  );
  assert.equal(contact.title, 'Contacto · Artista');
  assert.equal(contact.description, 'Escríbeme');
  assert.equal(contact.imageAlt, defaults.imageAlt);
});

test('las fichas usan la portada raster y los SVG de muestra usan la imagen general', () => {
  const config = socialSchema.parse(defaults);
  assert.equal(
    resolveSocial(config, page, media).image.src,
    '/uploads/obra.webp',
  );
  assert.equal(resolveSocial(config, page, media).imageAlt, 'La pieza');
  assert.equal(
    resolveSocial(config, { ...page, image: '/uploads/muestra.svg' }, media)
      .image.src,
    '/uploads/general.webp',
  );
});

test('la personalización de la ruta prevalece sobre la ficha sin afectar otras páginas', () => {
  const config = socialSchema.parse({
    ...defaults,
    pages: [
      {
        path: '/obra/pieza',
        title: ' Título social ',
        description: ' Texto social ',
        image: '/uploads/pagina.jpg',
        imageAlt: 'Imagen especial',
      },
    ],
  });
  const resolved = resolveSocial(config, page, media);
  assert.equal(resolved.title, 'Título social');
  assert.equal(resolved.description, 'Texto social');
  assert.equal(resolved.image.src, '/uploads/pagina.webp');
  assert.equal(resolved.imageAlt, 'Imagen especial');
  assert.equal(
    resolveSocial(config, { ...page, pathname: '/obra/otra/' }, media).image
      .src,
    '/uploads/obra.webp',
  );
});

test('los campos vacíos o nulos recuperan los valores automáticos', () => {
  const config = socialSchema.parse({
    ...defaults,
    pages: [
      {
        path: page.pathname,
        title: ' ',
        description: null,
        image: '',
        imageAlt: null,
      },
    ],
  });
  const resolved = resolveSocial(config, page, media);
  assert.equal(resolved.title, page.title);
  assert.equal(resolved.description, page.description);
  assert.equal(resolved.image.src, '/uploads/obra.webp');
});

test('rechaza rutas duplicadas, URLs externas, formatos no válidos y alternativas sin pareja', () => {
  assert.equal(
    socialSchema.safeParse({
      ...defaults,
      pages: [{ path: '/obra' }, { path: '/obra/' }],
    }).success,
    false,
  );
  for (const path of [
    '//example.com/',
    '/obra/?x=1',
    '/obra/#pieza',
    '/obra/../contacto/',
    'https://example.com/',
  ]) {
    assert.equal(
      socialSchema.safeParse({ ...defaults, pages: [{ path }] }).success,
      false,
      path,
    );
  }
  for (const image of [
    '/uploads/a.svg',
    'https://example.com/a.jpg',
    '/uploads/../a.png',
    '/uploads/folder/../a.jpg',
    '/uploads/%2e%2e/a.jpg',
  ]) {
    assert.equal(
      socialSchema.safeParse({ ...defaults, image }).success,
      false,
      image,
    );
  }
  for (const fields of [
    { image: '/uploads/pagina.jpg' },
    { imageAlt: 'Alternativa huérfana' },
  ]) {
    assert.equal(
      socialSchema.safeParse({ ...defaults, pages: [{ path: '/', ...fields }] })
        .success,
      false,
    );
  }
});

test('detecta imágenes que faltan incluso en personalizaciones de rutas no generadas', () => {
  const config = socialSchema.parse({
    ...defaults,
    pages: [
      { path: '/futura/', image: '/uploads/falta.jpg', imageAlt: 'Pendiente' },
    ],
  });
  assert.throws(() => validateSocialImages(config, media), /falta.jpg/);
  assert.throws(
    () =>
      resolveSocial(
        socialSchema.parse(defaults),
        { ...page, image: '/uploads/falta.jpg' },
        media,
      ),
    /falta.jpg/,
  );
});

test('el HTML social publica las URLs absolutas, dimensiones reales y textos escapados', async () => {
  const metadata = resolveSocial(
    socialSchema.parse(defaults),
    {
      ...page,
      title: '\"><script>alert(1)</script>',
      description: 'Arte "especial" & papel',
    },
    media,
  );
  const html = await container.renderToString(SocialMeta, {
    props: {
      metadata,
      canonical: new URL('https://example.com/obra/pieza/'),
      siteName: 'Artista',
    },
  });
  assert.match(
    html,
    /property="og:url" content="https:\/\/example.com\/obra\/pieza\/"/,
  );
  assert.match(
    html,
    /property="og:image" content="https:\/\/example.com\/uploads\/obra.webp"/,
  );
  assert.match(
    html,
    /name="twitter:image" content="https:\/\/example.com\/uploads\/obra.webp"/,
  );
  assert.match(html, /property="og:image:width" content="800"/);
  assert.match(html, /property="og:image:height" content="1000"/);
  assert.match(html, /property="og:image:type" content="image\/webp"/);
  assert.match(html, /property="og:locale" content="es_ES"/);
  const elements = parseFragment(html).childNodes.filter(
    (node) => node.tagName,
  );
  assert.ok(elements.every((node) => node.tagName === 'meta'));
  const title = elements.find((node) =>
    node.attrs.some(
      (attr) => attr.name === 'property' && attr.value === 'og:title',
    ),
  );
  assert.equal(
    title.attrs.find((attr) => attr.name === 'content').value,
    metadata.title,
  );
});

test('prepara medios sociales compartidos con borradores y excluye los exclusivos', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-social-'));
  try {
    for (const folder of ['flash', 'tattoos', 'obras', 'proyectos', 'paginas'])
      await mkdir(join(directory, 'src/content', folder), { recursive: true });
    await mkdir(join(directory, 'src/data'), { recursive: true });
    await mkdir(join(directory, 'media/uploads'), { recursive: true });
    await writeFile(
      join(directory, 'src/data/social.json'),
      JSON.stringify({
        ...defaults,
        image: '/uploads/shared.png',
        pages: [{ path: '/tattoo/', image: '/uploads/custom.png' }],
      }),
    );
    await writeFile(
      join(directory, 'src/content/obras/draft.md'),
      '---\ndraft: true\ncover: /uploads/shared.png\ngallery:\n  - src: /uploads/custom.png\n  - src: /uploads/private.png\n---\n',
    );
    await writeFile(
      join(directory, 'src/content/flash/publicado.md'),
      '---\ndraft: false\ncover: /uploads/falta.png\n---\n',
    );
    for (const name of ['shared', 'custom', 'private'])
      await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
      })
        .png()
        .toFile(join(directory, `media/uploads/${name}.png`));
    await promisify(execFile)(
      process.execPath,
      [fileURLToPath(new URL('../scripts/prepare-media.mjs', import.meta.url))],
      { cwd: directory },
    );
    const result = JSON.parse(
      await readFile(join(directory, 'src/generated/media.json'), 'utf8'),
    );
    assert.ok(result['/uploads/shared.png']);
    assert.ok(result['/uploads/custom.png']);
    assert.equal(result['/uploads/private.png'], undefined);
    assert.ok(result['/uploads/falta.png']);
    assert.equal(
      result['/uploads/falta.png'].src,
      result['/uploads/shared.png'].src,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
