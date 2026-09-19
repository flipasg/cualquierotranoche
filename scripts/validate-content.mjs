import { readdir, readFile, access } from 'node:fs/promises';
import { join, extname } from 'node:path';
const roots = ['flash', 'tattoos', 'obras', 'proyectos', 'paginas'];
let errors = [];
let warnings = [];
let files = [];
for (const root of roots) {
  const dir = join('src/content', root);
  for (const name of await readdir(dir)) {
    if (extname(name) === '.md') files.push(join(dir, name));
  }
}
for (const file of files) {
  const raw = await readFile(file, 'utf8');
  if (!raw.startsWith('---\n')) errors.push(`${file}: falta frontmatter YAML`);
  if (!/\ndraft:\s*(true|false)\s*\n/.test(raw))
    errors.push(`${file}: falta draft booleano`);
  for (const match of raw.matchAll(
    /(?:cover|portrait|src):\s*["']?(\/uploads\/[^"'\n]+)/g,
  )) {
    try {
      await access(join('media', match[1]));
    } catch {
      warnings.push(`${file}: no existe media${match[1]}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (warnings.length) {
  console.warn(`Avisos de contenido:\n${warnings.join('\n')}`);
}
console.log(
  `Contenido válido: ${files.length} fichas revisadas.`,
);
