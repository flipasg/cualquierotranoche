import { z } from 'astro/zod';

const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value ?? '');
const optionalHttpsUrl = optionalText.refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      /^https:\/\//i.test(value) &&
      url.protocol === 'https:' &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}, 'Usa un enlace completo con https://, sin usuario ni contraseña');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Usa una fecha real con formato AAAA-MM-DD');

export const guestSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    city: z.string().trim().min(1),
    studio: optionalText,
    address: optionalText,
    mapsUrl: optionalHttpsUrl,
    description: optionalText,
    startDate: date,
    endDate: date,
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color hexadecimal de seis cifras'),
    visible: z.boolean().default(true),
  })
  .refine((guest) => guest.endDate >= guest.startDate, {
    message: 'La fecha final no puede ser anterior al inicio',
    path: ['endDate'],
  });

export const guestsSchema = z
  .object({
    heading: z.string().trim().min(1),
    eyebrow: optionalText,
    inquiryLabel: z.string().trim().min(1),
    mapsLabel: z.string().trim().min(1).default('Ver en Google Maps'),
    alertsLabel: z.string().trim().min(1),
    emptyMessage: z.string().trim().min(1),
    footerHeading: z.string().trim().min(1),
    showInFooter: z.boolean().default(true),
    entries: z.array(guestSchema),
  })
  .refine(
    (config) =>
      new Set(config.entries.map((guest) => guest.id)).size ===
      config.entries.length,
    {
      message: 'Cada guest debe tener un identificador único',
      path: ['entries'],
    },
  );

export type Guest = z.infer<typeof guestSchema>;
export type GuestsConfig = z.infer<typeof guestsSchema>;

// La visibilidad es editorial: no depende de la fecha de compilación del sitio estático.
export function visibleGuests(entries: readonly Guest[]): Guest[] {
  return entries
    .filter((guest) => guest.visible)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

const asDate = (value: string) => new Date(`${value}T00:00:00Z`);
const monthFormat = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const rangeFormat = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function groupGuestsByMonth(entries: readonly Guest[]) {
  const groups = new Map<
    string,
    { key: string; label: string; entries: Guest[] }
  >();
  for (const guest of visibleGuests(entries)) {
    const key = guest.startDate.slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: monthFormat.format(asDate(guest.startDate)),
        entries: [],
      };
      groups.set(key, group);
    }
    group.entries.push(guest);
  }
  return [...groups.values()];
}

export function guestDateRange(guest: Guest): string {
  return rangeFormat.formatRange(
    asDate(guest.startDate),
    asDate(guest.endDate),
  );
}

export function guestDays(guest: Guest): string {
  if (guest.startDate === guest.endDate) return guest.startDate.slice(8);
  if (guest.startDate.slice(0, 7) === guest.endDate.slice(0, 7)) {
    return `${guest.startDate.slice(8)}–${guest.endDate.slice(8)}`;
  }
  return `${guest.startDate.slice(8)}/${guest.startDate.slice(5, 7)}–${guest.endDate.slice(8)}/${guest.endDate.slice(5, 7)}`;
}

export function guestDateColor(background: string): string {
  const relativeLuminance = (color: string) => {
    const channels = [
      [1, 0.2126],
      [3, 0.7152],
      [5, 0.0722],
    ] as const;
    return channels.reduce((sum, [offset, weight]) => {
      const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
      const linear =
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      return sum + linear * weight;
    }, 0);
  };
  const luminance = relativeLuminance(background);
  // Conservar el azul del sitio cuando cumple contraste; usar blanco o negro en los demás colores del CMS.
  const navyLuminance = relativeLuminance('#233a4b');
  if ((luminance + 0.05) / (navyLuminance + 0.05) >= 4.5) return '#233a4b';
  return 1.05 / (luminance + 0.05) >= 4.5 ? '#ffffff' : '#000000';
}
