import { z } from 'astro/zod';

const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value ?? '');
const isImagePath = (value: string) =>
  /^\/uploads\/[^?#\\%]+\.(?:jpe?g|png|webp)$/i.test(value) &&
  value
    .split('/')
    .slice(2)
    .every((part) => part !== '.' && part !== '..' && part !== '');
const pagePath = z
  .string()
  .trim()
  .regex(
    /^\/(?:[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/?)?$/,
    'Usa una ruta como /tattoo/ o /obra/nombre-de-la-obra/',
  );
export const normalizePath = (path: string) =>
  path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;

const pageSchema = z
  .object({
    path: pagePath.transform(normalizePath),
    title: optionalText,
    description: optionalText,
    image: optionalText.refine(
      (value) => !value || isImagePath(value),
      'Usa una imagen JPG, PNG o WebP de /uploads/',
    ),
    imageAlt: optionalText,
  })
  .refine((page) => Boolean(page.image) === Boolean(page.imageAlt), {
    message:
      'Completa la imagen y su descripción alternativa, o deja ambas vacías',
    path: ['imageAlt'],
  });

export const socialSchema = z
  .object({
    favicon: z.string().trim().startsWith('/uploads/'),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    image: z
      .string()
      .trim()
      .refine(isImagePath, 'Usa una imagen JPG, PNG o WebP de /uploads/'),
    imageAlt: z.string().trim().min(1),
    pages: z
      .array(pageSchema)
      .nullish()
      .transform((pages) => pages ?? []),
  })
  .refine(
    (config) =>
      new Set(config.pages.map((page) => page.path)).size ===
      config.pages.length,
    {
      message: 'Cada página debe tener una ruta única',
      path: ['pages'],
    },
  );

export type SocialConfig = z.infer<typeof socialSchema>;
export type MediaManifest = Record<
  string,
  { src: string; width: number; height: number }
>;
interface PageSocial {
  pathname: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
}

function getImage(path: string, media: MediaManifest) {
  const image = media[path];
  if (!image || !image.width || !image.height) {
    throw new Error(
      `Compartir: no se ha preparado la imagen ${path}. Comprueba media/uploads/.`,
    );
  }
  const extension = image.src.split('.').pop()?.toLowerCase();
  const type =
    extension === 'webp'
      ? 'image/webp'
      : extension === 'png'
        ? 'image/png'
        : ['jpg', 'jpeg'].includes(extension ?? '')
          ? 'image/jpeg'
          : undefined;
  if (!type)
    throw new Error(`Compartir: formato de imagen no admitido: ${image.src}`);
  return { ...image, type };
}

export function validateSocialImages(
  config: SocialConfig,
  media: MediaManifest,
) {
  getImage(config.image, media);
  for (const page of config.pages) if (page.image) getImage(page.image, media);
}

export function resolveSocial(
  config: SocialConfig,
  page: PageSocial,
  media: MediaManifest,
) {
  const pathname = normalizePath(page.pathname);
  const override = config.pages.find((entry) => entry.path === pathname);
  // Las portadas SVG de muestra no son imágenes válidas para las tarjetas sociales.
  const cover =
    page.image && isImagePath(page.image) && page.imageAlt?.trim()
      ? { image: page.image, imageAlt: page.imageAlt.trim() }
      : config;
  const selected = override?.image ? override : cover;
  return {
    title: override?.title || (pathname === '/' ? config.title : page.title),
    description:
      override?.description ||
      (pathname === '/' ? config.description : page.description),
    image: getImage(selected.image, media),
    imageAlt: selected.imageAlt,
  };
}

export type SocialMetadata = ReturnType<typeof resolveSocial>;
