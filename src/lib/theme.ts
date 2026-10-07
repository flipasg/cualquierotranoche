import type { CustomThemeFont, SiteTheme, ThemeFont } from '../types/content';

const defaults = {
  background: '#F7F3EC',
  text: '#252821',
  accent: '#923E30',
  surface: '#E6E9DF',
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

const robotoStylesheet =
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;600;700&display=swap';

function customFont(value?: CustomThemeFont) {
  const family = typeof value?.family === 'string' ? value.family.trim() : '';
  const stylesheet =
    typeof value?.stylesheetUrl === 'string' ? value.stylesheetUrl.trim() : '';
  // A single family name, never CSS declarations or a comma-separated stack.
  if (!family || !/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,99}$/u.test(family)) {
    return undefined;
  }
  if (!stylesheet) return undefined;
  if (/^\/fonts\/(?:[\w-]+\/)*[\w-]+\.css$/.test(stylesheet)) {
    return { family, stylesheet };
  }
  try {
    const url = new URL(stylesheet);
    // Keep this provider allowlist aligned with public/_headers.
    if (
      url.origin !== 'https://fonts.googleapis.com' ||
      !['/css', '/css2'].includes(url.pathname) ||
      url.username ||
      url.password ||
      url.hash ||
      !url.searchParams.get('family')?.trim()
    ) {
      return undefined;
    }
    url.searchParams.set('display', 'swap');
    return { family, stylesheet: url.href };
  } catch {
    return undefined;
  }
}

function fontFamily(preset: ThemeFont | undefined, custom?: CustomThemeFont) {
  const fallback = safeFont(preset, 'roboto');
  const resolved = customFont(custom);
  return resolved ? `"${resolved.family}", ${fallback}` : fallback;
}

export function themeFontStylesheets(theme?: SiteTheme): string[] {
  const stylesheets = [robotoStylesheet];
  for (const value of [theme?.headingCustomFont, theme?.bodyCustomFont]) {
    const resolved = customFont(value);
    if (resolved) stylesheets.push(resolved.stylesheet);
  }
  // Compare normalized URLs, including when a custom family is Roboto itself.
  return [
    ...new Set(
      stylesheets.map((stylesheet) => {
        if (stylesheet.startsWith('/')) return stylesheet;
        const url = new URL(stylesheet);
        url.searchParams.sort();
        return url.href;
      }),
    ),
  ];
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
  const buttonBackground = safeColor(theme?.buttonBackground, accent);
  const buttonText = safeColor(theme?.buttonText, background);
  if (
    !contrastWarningShown &&
    (contrastRatio(text, background) < 4.5 ||
      contrastRatio(text, surface) < 4.5 ||
      contrastRatio(accent, background) < 4.5 ||
      contrastRatio(buttonText, buttonBackground) < 4.5)
  ) {
    console.warn(
      'Tema visual: revisa el contraste de texto/fondo, texto/superficie, acento/fondo o texto/fondo de botones (objetivo WCAG AA 4.5:1).',
    );
    contrastWarningShown = true;
  }
  return [
    `--color-bg:${background}`,
    `--color-text:${text}`,
    `--color-accent:${accent}`,
    `--color-button-bg:${buttonBackground}`,
    `--color-button-text:${buttonText}`,
    `--color-surface:${surface}`,
    `--font-heading:${fontFamily(theme?.headingFont, theme?.headingCustomFont)}`,
    `--font-body:${fontFamily(theme?.bodyFont, theme?.bodyCustomFont)}`,
  ].join(';');
}

export { defaults as themeDefaults };
