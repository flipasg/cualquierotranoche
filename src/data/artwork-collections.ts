import type {
  ArtworkCollection,
  ArtworkCollectionsData,
} from '../types/content';

const modules = import.meta.glob<ArtworkCollection>(
  './obra-collections/*.json',
  {
    eager: true,
    import: 'default',
  },
);

export const artworkCollections: ArtworkCollectionsData = {
  collections: Object.values(modules),
};
