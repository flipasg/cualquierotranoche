// Pegar las URLs publicadas de Tally. Ver docs/tally.md.
export const forms = {
  tattoo: 'https://tally.so/r/QKG0YY',
  cityAlerts: 'https://tally.so/r/gDB4vO',
  artwork: 'https://tally.so/r/Pdo045',
  illustration: 'https://tally.so/r/1AjExW',
  general: 'https://tally.so/r/rjXEWM',
} as const;

const publicParams = ['flashCode', 'artworkId', 'source'] as const;
export type FormParams = Partial<Record<(typeof publicParams)[number], string>>;

export function formUrl(base: string, params: FormParams = {}): string | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  if (
    url.origin !== 'https://tally.so' ||
    url.username ||
    url.password ||
    !/^\/r\/[a-zA-Z0-9]+\/?$/.test(url.pathname) ||
    /\/REEMPLAZAR\/?$/i.test(url.pathname)
  )
    return null;

  // Construir solo con referencias públicas; no propagar parámetros del enlace copiado.
  url.search = '';
  url.hash = '';
  for (const key of publicParams) {
    const value = params[key];
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}
