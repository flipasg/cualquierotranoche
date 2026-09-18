export const forms = {
  tattoo: 'https://tally.so/r/QKG0YY',
  cityAlerts: 'https://tally.so/r/gDB4vO',
  artwork: 'https://tally.so/r/Pdo045',
  illustration: 'https://tally.so/r/1AjExW',
  general: 'https://tally.so/r/rjXEWM',
} as const;

type PublicParam = 'flashCode' | 'artworkId' | 'source';
export function formUrl(base: string, params: Partial<Record<PublicParam, string>>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.toString();
}
