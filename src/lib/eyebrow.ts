export interface EyebrowContent {
  label: string;
  content: string;
}

export function eyebrowContent(
  text?: string | null,
  prefix?: string | null,
  suffix?: string | null,
): EyebrowContent | undefined {
  const label = text?.trim();
  if (!label) return undefined;

  const content = [prefix?.trim(), label, suffix?.trim()]
    .filter(Boolean)
    .join(' / ');

  return { label, content };
}
