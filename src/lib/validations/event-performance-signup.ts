import { z } from 'zod';

import { UDEL_EMAIL } from './event-signup';

export const PERFORMANCE_KINDS = ['poetry', 'storytelling', 'one_act_play'] as const;
export type PerformanceKind = (typeof PERFORMANCE_KINDS)[number];

export const PERFORMANCE_KIND_LABEL: Record<PerformanceKind, string> = {
  poetry: 'Poetry reading',
  storytelling: 'Storytelling',
  one_act_play: 'One-act play',
};

export const MAX_PERFORMANCE_MINUTES = 15;

export const performanceSignupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(UDEL_EMAIL, { message: 'Must be a valid @udel.edu email' }),
  kind: z.enum(PERFORMANCE_KINDS),
  piece_title: z
    .string()
    .trim()
    .min(1, 'Tell us the title of your piece')
    .max(200, 'Title is too long'),
  estimated_minutes: z.coerce
    .number({ invalid_type_error: 'Estimated minutes is required' })
    .int('Use whole minutes')
    .min(1, 'Minimum 1 minute')
    .max(MAX_PERFORMANCE_MINUTES, `Maximum ${MAX_PERFORMANCE_MINUTES} minutes per slot`),
  content_warnings: z
    .string()
    .trim()
    .max(500, 'Content warnings are too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes are too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  honeypot: z.string().max(0, 'Invalid submission'),
});

export type PerformanceSignupInput = z.infer<typeof performanceSignupSchema>;
