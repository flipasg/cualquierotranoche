import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
} from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';
const input = 'media/uploads',
  output = 'public/uploads';
const responsiveWidths = [480, 768, 1024, 1440, 2000];
await mkdir(output, { recursive: true });
await mkdir('src/generated', { recursive: true });
const drafts = new Set();
const published = new Set();
const social = JSON.parse(await readFile('src/data/social.json', 'utf8'));
for (const path of [
  social.favicon,
  social.image,
  ...(social.pages ?? []).map((page) => page.image),
]) {
  if (path) published.add(path.replace(/^\/uploads\//, ''));
}
for (const folder of ['flash', 'tattoos', 'obras', 'proyectos', 'paginas'])
  for (const file of await readdir(join('src/content', folder))) {
    if (!file.endsWith('.md')) continue;
    const raw = await readFile(join('src/content', folder, file), 'utf8');
    const references = /\ndraft:\s*true\s*\n/.test(raw) ? drafts : published;
    for (const m of raw.matchAll(/\/uploads\/([^"'\n]+)/g))
      references.add(m[1]);
  }
const manifest = {};
for (const name of await readdir(input)) {
  // Una imagen compartida con contenido público o redes no es exclusiva del borrador.
  if (drafts.has(name) && !published.has(name)) continue;
  const ext = extname(name).toLowerCase();
  const source = join(input, name);
  if (ext === '.svg') {
    await copyFile(source, join(output, name));
    const raw = await readFile(source, 'utf8');
    const view = raw.match(/viewBox="[^"]*\s(\d+)\s(\d+)"/);
    manifest[`/uploads/${name}`] = {
      src: `/uploads/${name}`,
      width: Number(view?.[1] || 1200),
      height: Number(view?.[2] || 1500),
    };
  } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    const baseName = basename(name, ext);
    const sourceMeta = await sharp(source).rotate().metadata();
    const targetWidths = responsiveWidths.filter(
      (width) => !sourceMeta.width || width < sourceMeta.width,
    );
    const variantWidths = [...targetWidths, Math.min(sourceMeta.width || 2000, 2000)];
    const variants = [];
    for (const width of [...new Set(variantWidths)].sort((a, b) => a - b)) {
      const out = `${baseName}-w${width}.webp`;
      await sharp(source)
        .rotate()
        .resize({
          width,
          height: 2400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 84 })
        .toFile(join(output, out));
      const meta = await sharp(join(output, out)).metadata();
      variants.push({
        src: `/uploads/${out}`,
        width: meta.width || width,
        height: meta.height || sourceMeta.height || 1500,
      });
    }
    const largest = variants[variants.length - 1];
    manifest[`/uploads/${name}`] = {
      src: largest.src,
      width: largest.width,
      height: largest.height,
      srcset: variants.map(({ src, width }) => ({ src, width })),
    };
  }
}
const keys = Object.keys(manifest);
const fallbackAnyPath = keys[0];
const fallbackImagePath =
  (social.image && manifest[social.image] && social.image) ||
  keys.find((path) => /\.(?:jpe?g|png|webp)$/i.test(path));
const fallbackSvgPath =
  (social.favicon && manifest[social.favicon] && social.favicon) ||
  keys.find((path) => path.toLowerCase().endsWith('.svg'));
const missingPublished = [];
for (const name of published) {
  const target = `/uploads/${name}`;
  if (manifest[target]) continue;
  const extension = extname(name).toLowerCase();
  const fallbackPath =
    extension === '.svg'
      ? fallbackSvgPath || fallbackImagePath || fallbackAnyPath
      : ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
        ? fallbackImagePath || fallbackAnyPath
        : fallbackAnyPath;
  if (!fallbackPath) continue;
  const fallback = manifest[fallbackPath];
  manifest[target] = { ...fallback };
  missingPublished.push(`${target} -> ${fallback.src}`);
}
if (missingPublished.length) {
  console.warn(
    `Medios ausentes reemplazados por fallback:\n${missingPublished.join('\n')}`,
  );
}
await writeFile(
  'src/generated/media.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(`Medios preparados: ${Object.keys(manifest).length}.`);
