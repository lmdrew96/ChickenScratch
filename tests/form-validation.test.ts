import { describe, expect, it } from 'vitest';

import {
  validateField,
  validateForm,
  commonValidations,
  calculatePasswordStrength,
  type ValidationRule,
} from '../src/lib/form-validation';

describe('validateField', () => {
  describe('required validation', () => {
    it('should fail when required field is empty', () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Field is required' },
      ];
      const result = validateField('', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should fail when required field is only whitespace', () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Field is required' },
      ];
      const result = validateField('   ', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should pass when required field has value', () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Field is required' },
      ];
      const result = validateField('test', rules);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('minLength validation', () => {
    it('should fail when value is shorter than minLength', () => {
      const rules: ValidationRule[] = [
        { minLength: 5, message: 'Must be at least 5 characters' },
      ];
      const result = validateField('test', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be at least 5 characters');
    });

    it('should pass when value meets minLength', () => {
      const rules: ValidationRule[] = [
        { minLength: 5, message: 'Must be at least 5 characters' },
      ];
      const result = validateField('testing', rules);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should skip minLength check for empty non-required field', () => {
      const rules: ValidationRule[] = [
        { minLength: 5, message: 'Must be at least 5 characters' },
      ];
      const result = validateField('', rules);
      expect(result.isValid).toBe(true);
    });
  });

  describe('maxLength validation', () => {
    it('should fail when value exceeds maxLength', () => {
      const rules: ValidationRule[] = [
        { maxLength: 5, message: 'Must be 5 characters or less' },
      ];
      const result = validateField('testing', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be 5 characters or less');
    });

    it('should pass when value is within maxLength', () => {
      const rules: ValidationRule[] = [
        { maxLength: 10, message: 'Must be 10 characters or less' },
      ];
      const result = validateField('test', rules);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('pattern validation', () => {
    it('should fail when value does not match pattern', () => {
      const rules: ValidationRule[] = [
        { pattern: /^[0-9]+$/, message: 'Must be numbers only' },
      ];
      const result = validateField('abc123', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be numbers only');
    });

    it('should pass when value matches pattern', () => {
      const rules: ValidationRule[] = [
        { pattern: /^[0-9]+$/, message: 'Must be numbers only' },
      ];
      const result = validateField('12345', rules);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('custom validation', () => {
    it('should fail when custom validation returns false', () => {
      const rules: ValidationRule[] = [
        {
          custom: (value: string) => value.includes('test'),
          message: 'Must contain "test"',
        },
      ];
      const result = validateField('hello', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must contain "test"');
    });

    it('should pass when custom validation returns true', () => {
      const rules: ValidationRule[] = [
        {
          custom: (value: string) => value.includes('test'),
          message: 'Must contain "test"',
        },
      ];
      const result = validateField('testing', rules);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('multiple rules', () => {
    it('should return first failing rule', () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Field is required' },
        { minLength: 5, message: 'Must be at least 5 characters' },
        { pattern: /^[A-Z]/, message: 'Must start with uppercase' },
      ];
      const result = validateField('', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should pass all rules when valid', () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Field is required' },
        { minLength: 5, message: 'Must be at least 5 characters' },
        { pattern: /^[A-Z]/, message: 'Must start with uppercase' },
      ];
      const result = validateField('Testing', rules);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('validateForm', () => {
  it('should return empty object when all fields are valid', () => {
    const values = {
      email: 'test@example.com',
      name: 'John Doe',
    };
    const validations = {
      email: commonValidations.email,
      name: commonValidations.name,
    };
    const errors = validateForm(values, validations);
    expect(errors).toEqual({});
  });

  it('should return errors for invalid fields', () => {
    const values = {
      email: 'invalid-email',
      name: 'J',
    };
    const validations = {
      email: commonValidations.email,
      name: commonValidations.name,
    };
    const errors = validateForm(values, validations);
    expect(errors.email).toBe('Please enter a valid email address');
    expect(errors.name).toBe('Name must be at least 2 characters');
  });

  it('should handle missing fields as empty strings', () => {
    const values = {};
    const validations = {
      email: commonValidations.email,
    };
    const errors = validateForm(values, validations);
    expect(errors.email).toBe('Email is required');
  });
});

describe('commonValidations', () => {
  describe('email', () => {
    it('should validate correct email format', () => {
      const result = validateField('test@example.com', commonValidations.email);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = validateField('invalid-email', commonValidations.email);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should reject empty email', () => {
      const result = validateField('', commonValidations.email);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });
  });

  describe('udelEmail', () => {
    it('should validate UDel email', () => {
      const result = validateField('student@udel.edu', commonValidations.udelEmail);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-UDel email', () => {
      const result = validateField('test@gmail.com', commonValidations.udelEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please use your UDel email address (@udel.edu)');
    });
  });

  describe('password', () => {
    it('should validate strong password', () => {
      const result = validateField('Test1234', commonValidations.password);
      expect(result.isValid).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = validateField('test1234', commonValidations.password);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validateField('TEST1234', commonValidations.password);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validateField('TestTest', commonValidations.password);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one number');
    });

    it('should reject short password', () => {
      const result = validateField('Test12', commonValidations.password);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });
  });

  describe('name', () => {
    it('should validate valid name', () => {
      const result = validateField('John Doe', commonValidations.name);
      expect(result.isValid).toBe(true);
    });

    it('should reject single character name', () => {
      const result = validateField('J', commonValidations.name);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name must be at least 2 characters');
    });

    it('should reject empty name', () => {
      const result = validateField('', commonValidations.name);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });
  });

  describe('title', () => {
    it('should allow titles up to 200 characters', () => {
      const longTitle = 'a'.repeat(200);
      const result = validateField(longTitle, commonValidations.title);
      expect(result.isValid).toBe(true);
    });

    it('should reject titles over 200 characters', () => {
      const tooLongTitle = 'a'.repeat(201);
      const result = validateField(tooLongTitle, commonValidations.title);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title must be 200 characters or less');
    });
  });

  describe('summary', () => {
    it('should allow summaries up to 500 characters', () => {
      const longSummary = 'a'.repeat(500);
      const result = validateField(longSummary, commonValidations.summary);
      expect(result.isValid).toBe(true);
    });

    it('should reject summaries over 500 characters', () => {
      const tooLongSummary = 'a'.repeat(501);
      const result = validateField(tooLongSummary, commonValidations.summary);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Summary must be 500 characters or less');
    });
  });

  describe('contentWarnings', () => {
    it('should allow content warnings up to 300 characters', () => {
      const longWarning = 'a'.repeat(300);
      const result = validateField(longWarning, commonValidations.contentWarnings);
      expect(result.isValid).toBe(true);
    });

    it('should reject content warnings over 300 characters', () => {
      const tooLongWarning = 'a'.repeat(301);
      const result = validateField(tooLongWarning, commonValidations.contentWarnings);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Content warnings must be 300 characters or less');
    });
  });
});

describe('calculatePasswordStrength', () => {
  it('should rate weak password', () => {
    const result = calculatePasswordStrength('test');
    expect(result.strength).toBe('weak');
    expect(result.score).toBeLessThanOrEqual(2);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('should rate fair password', () => {
    const result = calculatePasswordStrength('test1234');
    expect(result.strength).toBe('fair');
    expect(result.score).toBe(3);
  });

  it('should rate good password', () => {
    const result = calculatePasswordStrength('Test1234');
    expect(result.strength).toBe('good');
    expect(result.score).toBe(4);
  });

  it('should rate strong password', () => {
    const result = calculatePasswordStrength('Test1234!@#');
    expect(result.strength).toBe('strong');
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.feedback).toEqual([]);
  });

  it('should provide feedback for weak passwords', () => {
    const result = calculatePasswordStrength('test');
    expect(result.feedback).toContain('Use at least 8 characters');
    expect(result.feedback).toContain('Add uppercase letters');
    expect(result.feedback).toContain('Add numbers');
    expect(result.feedback).toContain('Add special characters (!@#$%^&*)');
  });
});

describe('submission validation scenarios', () => {
  it('should validate complete valid submission', () => {
    const values = {
      title: 'My Great Story',
      summary: 'This is a summary of my story',
      contentWarnings: 'None',
    };
    const validations = {
      title: commonValidations.title,
      summary: commonValidations.summary,
      contentWarnings: commonValidations.contentWarnings,
    };
    const errors = validateForm(values, validations);
    expect(errors).toEqual({});
  });

  it('should catch multiple submission validation errors', () => {
    const values = {
      title: 'a'.repeat(201),
      summary: 'a'.repeat(501),
      contentWarnings: 'a'.repeat(301),
    };
    const validations = {
      title: commonValidations.title,
      summary: commonValidations.summary,
      contentWarnings: commonValidations.contentWarnings,
    };
    const errors = validateForm(values, validations);
    expect(errors.title).toBe('Title must be 200 characters or less');
    expect(errors.summary).toBe('Summary must be 500 characters or less');
    expect(errors.contentWarnings).toBe('Content warnings must be 300 characters or less');
  });
});
