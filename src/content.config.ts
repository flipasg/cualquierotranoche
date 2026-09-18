import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const upload = z.string().startsWith('/uploads/');
const base = z.object({
  title: z.string(),
  description: z.string(),
  cover: upload,
  coverAlt: z.string().min(1),
  draft: z.boolean().default(false),
});

const flash = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/flash' }),
  schema: base.extend({
    code: z.string(),
    status: z.enum(['disponible', 'reservado', 'tatuado']),
    note: z.string(),
    showInCarousel: z.boolean().default(true),
    categories: z.array(z.string().min(1)).default([]),
  }),
});
const tattoos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tattoos' }),
  schema: base.extend({
    showInCarousel: z.boolean().default(true),
  }),
});
const obras = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/obras' }),
  schema: base
    .extend({
      technique: z.string(),
      dimensions: z.string(),
      widthCm: z.number().positive(),
      heightCm: z.number().positive(),
      status: z.enum(['disponible', 'reservada', 'vendida']),
      priceEur: z.number().positive().nullable(),
      showPrice: z.boolean(),
      collection: z.string(),
      gallery: z
        .array(z.object({ src: upload, alt: z.string().min(1) }))
        .default([]),
    })
    .refine(
      (value) =>
        !value.showPrice || (value.priceEur !== null && value.priceEur > 0),
      {
        message: 'priceEur debe ser mayor que 0 cuando showPrice es true',
        path: ['priceEur'],
      },
    ),
});
const proyectos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/proyectos' }),
  schema: base.extend({
    client: z.string(),
    services: z.string(),
    year: z.union([z.string(), z.number()]),
    contribution: z.string(),
    gallery: z.array(z.object({ src: upload, alt: z.string().min(1) })),
  }),
});
const paginas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/paginas' }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string(),
    subtitle: z.string(),
    location: z.string(),
    portrait: upload,
    portraitAlt: z.string().min(1),
    draft: z.boolean().default(false),
  }),
});

export const collections = { flash, tattoos, obras, proyectos, paginas };
