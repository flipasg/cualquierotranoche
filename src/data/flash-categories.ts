import type { FlashCategoriesData, FlashCategory } from '../types/content';

const modules = import.meta.glob<FlashCategory>('./flash-categories/*.json', {
  eager: true,
  import: 'default',
});

export const flashCategories: FlashCategoriesData = {
  categories: Object.values(modules),
};
