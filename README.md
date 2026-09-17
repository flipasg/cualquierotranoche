# Portfolio artístico — primera versión

Sitio estático mobile-first para presentar **tattoo, obra original e ilustración**. Todo el contenido y las imágenes incluidos son muestras: no representan obras reales y deben reemplazarse antes de publicar.

## Stack

Astro en modo estático, TypeScript estricto, Content Collections + Zod, Markdown/YAML, JSON, CSS propio, Pages CMS, Tally y Sharp. No usa React, Tailwind, backend, base de datos, SSR ni secretos.

## Instalación y desarrollo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

`dev` valida las fichas, prepara `media/uploads/` y arranca Astro. Las fuentes editables viven en `media/uploads/`; `public/uploads/` y `src/generated/media.json` se regeneran y no se versionan.

## Build y preview

```bash
npm run build
npm run preview
```

También se pueden ejecutar por separado `npm run validate` y `npm run media`.

## Editar contenido

- Fichas Markdown: `src/content/{flash,tattoos,obras,proyectos,paginas}/`.
- Datos globales: `src/data/site.json` y `src/data/ciudades.json`.
- Formularios Tally: sustituir cada URL `REEMPLAZAR` en `src/config/forms.ts`.
- Imágenes originales: añadir a `media/uploads/` y usar una ruta `/uploads/archivo.ext` en el frontmatter.
- Marcar `draft: true` excluye una ficha de páginas públicas y su imagen exclusiva del procesamiento.

Los textos alternativos son obligatorios. Si `showPrice` es `true`, `priceEur` debe ser mayor que cero. Los parámetros de formularios permitidos son únicamente `flashCode`, `artworkId` y `source`; nunca se deben incluir nombres, emails ni notas privadas en una URL.

## Pages CMS

1. Conectar el repositorio en [Pages CMS](https://pagescms.org/).
2. Autorizar la rama editorial elegida.
3. Pages CMS detectará `.pages.yml`, con colecciones y etiquetas en castellano.
4. Revisar el commit generado y ejecutar el build antes de fusionarlo.

Las operaciones permiten crear, pero impiden renombrar o borrar fichas desde el CMS para evitar enlaces rotos. Los medios entran por `media/uploads/` y se publican en `/uploads/`.

## Cloudflare Pages

Conectar el repositorio y configurar:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node:** 20 o superior

No hacen falta variables secretas. Antes de desplegar, actualizar `site` en `astro.config.mjs`, el sitemap de `public/robots.txt` y los enlaces de Tally.

## Sustituir los placeholders

1. Cambiar nombre, intro, email e Instagram en `src/data/site.json`.
2. Reemplazar los SVG en `media/uploads/` por JPG, PNG, WebP o SVG propios.
3. Actualizar las rutas, dimensiones, estados, precios y textos alternativos en cada Markdown.
4. Sustituir los textos provisionales, incluido `src/content/paginas/sobre-mi.md`.
5. Configurar formularios reales en Tally y reemplazar sus cinco URLs.
6. Eliminar cualquier ficha de muestra que no se quiera publicar (fuera del CMS o tras adaptar su política de operaciones).

## Privacidad

No guardar datos personales de visitantes en Git, Markdown, JSON, query params ni imágenes. Tally debe incluir información del responsable, finalidad, base jurídica, conservación, derechos y mecanismo de baja. Solicitar solo datos necesarios. No subir archivos recibidos de clientes a este repositorio. Revisar la política de privacidad y los encargados de tratamiento antes de publicar.

## Checklist antes de publicar

- [ ] Nombre, voz, biografía, email, Instagram y dominio son reales.
- [ ] Todas las muestras se sustituyeron o están marcadas claramente como tales.
- [ ] La artista tiene derechos para publicar cada imagen y cuenta con consentimiento de las personas retratadas.
- [ ] Alt, estados, disponibilidad y precios están revisados.
- [ ] No quedan fichas `draft: true` que deban publicarse.
- [ ] URLs y textos legales de Tally están configurados y probados.
- [ ] No hay datos privados, metadatos sensibles ni secretos en Git.
- [ ] `npm run build` termina correctamente.
- [ ] Navegación, foco, contraste y formularios se prueban con teclado y en móvil.
- [ ] Dominio canónico, robots y cabeceras se revisan para producción.
