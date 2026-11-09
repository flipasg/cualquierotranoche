import { marked, Marked } from 'marked';

const options = { gfm: true, breaks: true };

export function renderRichText(content, inline = false) {
  if (!content) return '';

  const source = String(content)
    .replace(
      /\{\{accent\}\}([\s\S]*?)\{\{\/accent\}\}/g,
      '<span class="text-accent">$1</span>',
    )
    .replace(
      /\{\{color:(#[0-9a-fA-F]{6})\}\}([\s\S]*?)\{\{\/color\}\}/g,
      (_match, color, text) => `<span style="color:${color}">${text}</span>`,
    );

  return inline
    ? marked.parseInline(source, options)
    : marked.parse(source, options);
}

const metadataMarkdown = new Marked({
  ...options,
  renderer: {
    image({ text }) {
      // Metadata keeps the image's description, never its URL.
      return text;
    },
  },
});
const entities = new Map(
  Object.entries({
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    aacute: 'á',
    eacute: 'é',
    iacute: 'í',
    oacute: 'ó',
    uacute: 'ú',
    Aacute: 'Á',
    Eacute: 'É',
    Iacute: 'Í',
    Oacute: 'Ó',
    Uacute: 'Ú',
    ntilde: 'ñ',
    Ntilde: 'Ñ',
    uuml: 'ü',
    Uuml: 'Ü',
    laquo: '«',
    raquo: '»',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    ndash: '–',
    mdash: '—',
    hellip: '…',
    copy: '©',
    reg: '®',
    euro: '€',
  }),
);

/** Plain text for metadata; callers must still escape it for their output context.
 * @param {string | null | undefined} content
 * @returns {string}
 */
export function richTextToPlainText(content) {
  if (!content) return '';
  const source = content
    .replace(/\{\{(?:\/?accent|color:#[0-9a-f]{6}|\/color)\}\}/gi, '')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '');
  const html = metadataMarkdown.parse(source, { async: false });
  return html
    .replace(/<\/?[a-z](?:"[^"]*"|'[^']*'|[^'">])*>/gi, (tag) =>
      /^<\/?(?:p|div|br|h[1-6]|li|ul|ol|blockquote|pre|tr|td|th|hr)\b/i.test(
        tag,
      )
        ? ' '
        : '',
    )
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
      if (!name.startsWith('#')) return entities.get(name) ?? entity;
      const codePoint = /^#x/i.test(name)
        ? Number.parseInt(name.slice(2), 16)
        : Number.parseInt(name.slice(1), 10);
      return codePoint > 0 &&
        codePoint <= 0x10ffff &&
        !(codePoint >= 0xd800 && codePoint <= 0xdfff)
        ? String.fromCodePoint(codePoint)
        : '\uFFFD';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
