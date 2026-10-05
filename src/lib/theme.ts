import type { SiteTheme, ThemeFont } from '../types/content';

const defaults = {
  background: '#F7F3EC',
  text: '#252821',
  accent: '#923E30',
  surface: '#E6E9DF',
  decorative: '#E4B54D',
} as const;

const fonts: Record<ThemeFont, string> = {
  roboto: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  arial: 'Arial, Helvetica, sans-serif',
  system: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

function safeColor(value: string | undefined, fallback: string): string {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function safeFont(value: ThemeFont | undefined, fallback: ThemeFont): string {
  return value && Object.hasOwn(fonts, value) ? fonts[value] : fonts[fallback];
}

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (red ?? 0) * 0.2126 + (green ?? 0) * 0.7152 + (blue ?? 0) * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

let contrastWarningShown = false;

export function themeStyle(theme?: SiteTheme): string {
  const background = safeColor(theme?.background, defaults.background);
  const text = safeColor(theme?.text, defaults.text);
  const accent = safeColor(theme?.accent, defaults.accent);
  const surface = safeColor(theme?.surface, defaults.surface);
  if (
    !contrastWarningShown &&
    (contrastRatio(text, background) < 4.5 ||
      contrastRatio(text, surface) < 4.5 ||
      contrastRatio(accent, background) < 4.5)
  ) {
    console.warn(
      'Tema visual: revisa el contraste de texto/fondo, texto/superficie o acento/fondo (objetivo WCAG AA 4.5:1).',
    );
    contrastWarningShown = true;
  }
  return [
    `--color-bg:${background}`,
    `--color-text:${text}`,
    `--color-accent:${accent}`,
    `--color-surface:${surface}`,
    `--color-decorative:${safeColor(theme?.decorative, defaults.decorative)}`,
    `--font-heading:${safeFont(theme?.headingFont, 'roboto')}`,
    `--font-body:${safeFont(theme?.bodyFont, 'roboto')}`,
  ].join(';');
}

export { defaults as themeDefaults };
