import { richTextToPlainText } from './rich-text.mjs';

/**
 * @param {{ title?: string, description?: string, seoTitle?: string, seoDescription?: string }} page
 * @param {string | undefined} artisticName
 */
export function resolveSeo(page, artisticName) {
  const brand = richTextToPlainText(artisticName);
  let title =
    richTextToPlainText(page.seoTitle) || richTextToPlainText(page.title);
  const description =
    richTextToPlainText(page.seoDescription) ||
    richTextToPlainText(page.description);
  if (brand) {
    // CMS titles may already include the brand, including the old home prefix.
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const edgeBrand = new RegExp(
      `^(?:${escapedBrand}\\s*[·|—–-]\\s*)|(?:\\s*[·|—–-]\\s*${escapedBrand})$`,
      'gi',
    );
    let previous;
    do {
      previous = title;
      title = title.replace(edgeBrand, '').trim();
    } while (title !== previous);
    title =
      title && title.toLowerCase() !== brand.toLowerCase()
        ? `${title} · ${brand}`
        : brand;
  }
  return { title, description };
}

/** Escape JSON for a non-executable script data block, including closing tags.
 * @param {unknown} value
 */
export function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
