/**
 * Form validation utilities for real-time feedback
 */

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  message: string;
};

export type ValidationResult = {
  isValid: boolean;
  error?: string;
};

export type FieldValidation = {
  [fieldName: string]: ValidationRule[];
};

/**
 * Validate a single field against its rules
 */
export function validateField(value: string, rules: ValidationRule[]): ValidationResult {
  for (const rule of rules) {
    // Required check
    if (rule.required && !value.trim()) {
      return { isValid: false, error: rule.message };
    }

    // Skip other checks if field is empty and not required
    if (!value.trim() && !rule.required) {
      continue;
    }

    // Min length check
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return { isValid: false, error: rule.message };
    }

    // Max length check
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return { isValid: false, error: rule.message };
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value)) {
      return { isValid: false, error: rule.message };
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      return { isValid: false, error: rule.message };
    }
  }

  return { isValid: true };
}

/**
 * Validate all fields in a form
 */
export function validateForm(
  values: Record<string, string>,
  validations: FieldValidation
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [fieldName, rules] of Object.entries(validations)) {
    const value = values[fieldName] || '';
    const result = validateField(value, rules);
    
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return errors;
}

/**
 * Common validation rules
 */
export const commonValidations = {
  email: [
    {
      required: true,
      message: 'Email is required',
    },
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  ],
  udelEmail: [
    {
      required: true,
      message: 'Email is required',
    },
    {
      pattern: /^[^\s@]+@udel\.edu$/,
      message: 'Please use your UDel email address (@udel.edu)',
    },
  ],
  password: [
    {
      required: true,
      message: 'Password is required',
    },
    {
      minLength: 8,
      message: 'Password must be at least 8 characters',
    },
    {
      custom: (value: string) => /[A-Z]/.test(value),
      message: 'Password must contain at least one uppercase letter',
    },
    {
      custom: (value: string) => /[a-z]/.test(value),
      message: 'Password must contain at least one lowercase letter',
    },
    {
      custom: (value: string) => /[0-9]/.test(value),
      message: 'Password must contain at least one number',
    },
  ],
  name: [
    {
      required: true,
      message: 'Name is required',
    },
    {
      minLength: 2,
      message: 'Name must be at least 2 characters',
    },
  ],
  title: [
    {
      maxLength: 200,
      message: 'Title must be 200 characters or less',
    },
  ],
  summary: [
    {
      maxLength: 500,
      message: 'Summary must be 500 characters or less',
    },
  ],
  contentWarnings: [
    {
      maxLength: 300,
      message: 'Content warnings must be 300 characters or less',
    },
  ],
};

/**
 * Password strength calculator
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters (!@#$%^&*)');

  let strength: PasswordStrength;
  if (score <= 2) strength = 'weak';
  else if (score <= 3) strength = 'fair';
  else if (score <= 4) strength = 'good';
  else strength = 'strong';

  return { strength, score, feedback };
}

/**
 * Debounce function for real-time validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
