import { z } from 'astro/zod';

export const analyticsSchema = z
  .object({
    enabled: z.boolean().default(false),
    measurementId: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => value === '' || /^G-[A-Z0-9]{10}$/.test(value),
        'Introduce el ID de medición de GA4, con formato G-XXXXXXXXXX',
      ),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    acceptLabel: z.string().trim().min(1),
    rejectLabel: z.string().trim().min(1),
    settingsLabel: z.string().trim().min(1),
  })
  .refine((config) => !config.enabled || Boolean(config.measurementId), {
    message: 'Completa el ID de medición antes de activar Analytics',
    path: ['measurementId'],
  });

export type AnalyticsConfig = z.infer<typeof analyticsSchema>;
