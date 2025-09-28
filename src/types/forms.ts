import { z } from 'zod';

// Submission form validation schemas
export const submissionKindSchema = z.enum(['writing', 'visual']);

export const writingCategorySchema = z.enum([
  'Poetry',
  'Vignette', 
  'Flash fiction',
  'Essay',
  'Opinion piece',
  'Free write',
  'Interview',
  'Colwell in Context',
  'Keeping Up with Keegan',
  'Literary Recommendation',
  'Other Writing'
]);

export const visualCategorySchema = z.enum([
  'Drawing',
  'Painting', 
  'Photography',
  'Digital art',
  'Other Visual Art'
]);

export const submissionFormSchema = z.object({
  kind: submissionKindSchema,
  category: z.string().min(1, 'Please select a category'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  preferredName: z.string().min(1, 'Preferred name is required').max(100, 'Name must be under 100 characters'),
  summary: z.string().max(500, 'Summary must be under 500 characters').optional(),
  contentWarnings: z.string().max(300, 'Content warnings must be under 300 characters').optional(),
  textBody: z.string().optional(),
  file: z.instanceof(File).optional()
}).refine((data) => {
  if (data.kind === 'writing') {
    return data.textBody && data.textBody.trim().length > 0;
  }
  if (data.kind === 'visual') {
    return data.file !== undefined;
  }
  return true;
}, {
  message: 'Writing submissions require text body, visual submissions require a file',
  path: ['textBody']
});

// Auth form validation schemas  
export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const signUpSchema = signInSchema.extend({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name must be under 100 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

// Profile form validation schemas
export const profileUpdateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name must be under 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  avatarFile: z.instanceof(File).optional()
});

// Status update validation schemas
export const statusUpdateSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID'),
  status: z.enum(['submitted', 'in_review', 'needs_revision', 'accepted', 'declined', 'published']),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
  assignedEditor: z.string().uuid('Invalid editor ID').optional()
});

// Committee workflow validation schemas
export const committeeActionSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID'),
  action: z.enum([
    'approve', 'decline', 'commit', 'open_docs', 
    'canva_link', 'final_approve', 'final_decline'
  ]),
  comment: z.string().max(500, 'Comment must be under 500 characters').optional(),
  linkUrl: z.string().url('Please enter a valid URL').optional()
});

// Form field error type
export interface FormFieldError {
  message: string;
  path: string[];
}

// Generic form state type
export interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Form types
export type SubmissionFormData = z.infer<typeof submissionFormSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;
export type CommitteeActionFormData = z.infer<typeof committeeActionSchema>;