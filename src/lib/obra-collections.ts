import { artworkCollections } from '../data';
import type { ArtworkCollection } from '../data';

export function getArtworkCollection(
  id?: string | null,
): ArtworkCollection | undefined {
  if (!id) return undefined;

  return artworkCollections.collections?.find(
    (collection) => collection.id === id,
  );
}

export function getCollectionSlug(id?: string | null): string {
  return id?.trim() ?? '';
}

export function getCollectionTitle(id?: string | null): string {
  return getArtworkCollection(id)?.title ?? '';
}

export function getCollectionHref(id?: string | null): string {
  const collectionId = getCollectionSlug(id);

  return collectionId
    ? `/obra/${collectionId}/`
    : '/obra/';
}

export function getWorkHref(
  work: {
    id: string;
    data: {
      collection?: string;
    };
  },
): string {
  const collectionId = getCollectionSlug(work.data.collection);

  return `/obra/${collectionId}/${work.id}/`;
}