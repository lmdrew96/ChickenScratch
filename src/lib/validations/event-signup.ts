import { z } from 'zod';

export const UDEL_EMAIL = /^[^\s@]+@udel\.edu$/i;

export const SIGNUP_CATEGORIES = ['sweet', 'savory', 'drink', 'utensils', 'other'] as const;
export type SignupCategory = (typeof SIGNUP_CATEGORIES)[number];

export const SIGNUP_CATEGORY_LABEL: Record<SignupCategory, string> = {
  sweet: 'Sweet',
  savory: 'Savory',
  drink: 'Drink',
  utensils: 'Utensils',
  other: 'Other',
};

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(UDEL_EMAIL, { message: 'Must be a valid @udel.edu email' }),
  item: z.string().trim().min(1, 'Tell us what you are bringing').max(200, 'Item description is too long'),
  category: z.enum(SIGNUP_CATEGORIES),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes are too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  honeypot: z.string().max(0, 'Invalid submission'),
});

export type SignupInput = z.infer<typeof signupSchema>;
