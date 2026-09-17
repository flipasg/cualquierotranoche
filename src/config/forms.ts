export const forms = {
  tattoo: 'https://tally.so/r/REEMPLAZAR',
  cityAlerts: 'https://tally.so/r/REEMPLAZAR',
  artwork: 'https://tally.so/r/REEMPLAZAR',
  illustration: 'https://tally.so/r/REEMPLAZAR',
  general: 'https://tally.so/r/REEMPLAZAR',
} as const;

type PublicParam = 'flashCode' | 'artworkId' | 'source';
export function formUrl(base: string, params: Partial<Record<PublicParam, string>>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.toString();
}
