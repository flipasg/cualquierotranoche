import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('el revelado compartido conserva el contenido visible sin JavaScript y respeta reducir movimiento', async () => {
  const [script, css, layout] = await Promise.all([
    read('public/scripts/scroll-reveal.js'),
    read('src/styles/global.css'),
    read('src/layouts/BaseLayout.astro'),
  ]);

  assert.match(script, /IntersectionObserver/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /window\.refreshScrollReveal/);
  assert.match(script, /index % 3/);
  assert.match(css, /html\[data-motion-ready='true'\] \[data-reveal\]/);
  assert.match(css, /\.carousel-track[\s\S]*scroll-behavior: auto/);
  assert.match(layout, /src="\/scripts\/scroll-reveal\.js"/);
});

test('las secciones y tarjetas reutilizables marcan entradas explícitas', async () => {
  const [home, tattoo, work, flash, project, agenda] = await Promise.all([
    read('src/pages/index.astro'),
    read('src/pages/tattoo/index.astro'),
    read('src/components/WorkCard.astro'),
    read('src/components/FlashCard.astro'),
    read('src/components/ProjectCard.astro'),
    read('src/components/GuestAgenda.astro'),
  ]);

  assert.match(home, /data-reveal-group/);
  assert.match(tattoo, /data-reveal/);
  assert.match(work, /data-reveal/);
  assert.match(flash, /data-reveal/);
  assert.match(project, /data-reveal/);
  assert.match(agenda, /guest-month[\s\S]*data-reveal/);
});

test('los filtros animan únicamente las fichas que vuelven a ser visibles', async () => {
  const script = await read('public/scripts/gallery-filters.js');

  assert.match(script, /const newlyVisible = \[\]/);
  assert.match(script, /card\.hidden && !hidden/);
  assert.match(
    script,
    /refreshScrollReveal\?\.\(newlyVisible, \{ restart: true \}\)/,
  );
});

test('la navegación reserva el ancho de la etiqueta activa antes del hover', async () => {
  const header = await read('src/components/Header.astro');

  assert.match(header, /data-nav-label=\{item\.label\}/);
  assert.match(header, /content: attr\(data-nav-label\)/);
  assert.match(header, /nav a::before,[\s\S]*\.nav-link-label/);
  assert.match(header, /nav a:hover \.nav-link-label,[\s\S]*font-weight: 700/);
});

test('los controles de carrusel y paginación desplazan suavemente salvo con movimiento reducido', async () => {
  const [carousel, filters] = await Promise.all([
    read('public/scripts/content-carousel.js'),
    read('public/scripts/gallery-filters.js'),
  ]);

  assert.match(carousel, /const animateScroll/);
  assert.match(carousel, /const duration = 420/);
  assert.match(carousel, /track\.scrollLeft = start \+ distance \* eased/);
  assert.match(filters, /const scrollPageTo/);
  assert.match(
    filters,
    /scrollingElement\.scrollTop = start \+ distance \* eased/,
  );
});
