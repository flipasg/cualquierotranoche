import collectionsData from '../data/obra-collections.json';

export interface ObraCollection {
  id: string;
  title: string;
  description: string;
}

export const obraCollections: ObraCollection[] = collectionsData.collections;

function slugify(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Resolves the CMS-configured slug for a work's raw collection text, falling
// back to a generated slug when no matching entry exists yet.
export function getCollectionSlug(collectionName: string): string {
  const trimmed = collectionName.trim();
  const match = obraCollections.find((entry) => entry.title.trim() === trimmed);
  return match?.id ?? slugify(trimmed);
}

export function getCollectionBySlug(slug: string): ObraCollection | undefined {
  return obraCollections.find((entry) => entry.id === slug);
}
