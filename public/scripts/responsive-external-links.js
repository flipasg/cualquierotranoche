export const DESKTOP_LINK_QUERY =
  '(min-width: 900px) and (hover: hover) and (pointer: fine)';

const relTokens = (link) =>
  new Set((link.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));

export function syncResponsiveExternalLinks(root, opensNewWindow) {
  root.querySelectorAll('[data-responsive-external]').forEach((link) => {
    const tokens = relTokens(link);

    if (opensNewWindow) {
      link.setAttribute('target', '_blank');
      tokens.add('noopener');
      tokens.add('noreferrer');
    } else {
      link.removeAttribute('target');
      tokens.delete('noopener');
    }

    if (tokens.size) link.setAttribute('rel', [...tokens].join(' '));
    else link.removeAttribute('rel');
  });
}

export function initResponsiveExternalLinks(root = document, view = window) {
  const media = view.matchMedia(DESKTOP_LINK_QUERY);
  const update = () => syncResponsiveExternalLinks(root, media.matches);

  update();
  media.addEventListener?.('change', update);
  return () => media.removeEventListener?.('change', update);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  initResponsiveExternalLinks();
}
