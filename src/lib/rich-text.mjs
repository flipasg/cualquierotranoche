import { marked } from 'marked';

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