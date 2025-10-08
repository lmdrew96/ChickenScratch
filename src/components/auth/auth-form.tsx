'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/shared/loading-states';

interface AuthFormProps {
  type: 'signin' | 'signup';
  onSubmit: (formData: FormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function AuthForm({ type, onSubmit, loading = false, error }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (type === 'signup') {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      const data = new FormData();
      data.append('email', formData.email);
      data.append('password', formData.password);
      if (type === 'signup') {
        data.append('full_name', formData.fullName);
      }
      
      await onSubmit(data);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-card">
        <div className="auth-form-header">
          <h1 className="auth-form-title">
            {type === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="auth-form-subtitle">
            {type === 'signin' 
              ? 'Welcome back to Hen & Ink Portal'
              : 'Join the Hen & Ink literary community'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {type === 'signup' && (
            <div className="form-field">
              <label htmlFor="fullName" className="form-label">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange('fullName')}
                className={`form-input ${errors.fullName ? 'form-input-error' : ''}`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.fullName && (
                <p className="form-error">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              placeholder="Enter your email"
              disabled={loading}
            />
            {errors.email && (
              <p className="form-error">{errors.email}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              className={`form-input ${errors.password ? 'form-input-error' : ''}`}
              placeholder="Enter your password"
              disabled={loading}
            />
            {errors.password && (
              <p className="form-error">{errors.password}</p>
            )}
          </div>

          {type === 'signup' && (
            <div className="form-field">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
                placeholder="Confirm your password"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent form-submit-btn"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                {type === 'signin' ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              type === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="auth-form-footer">
          {type === 'signin' ? (
            <p className="auth-form-switch">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="auth-form-link">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="auth-form-switch">
              Already have an account?{' '}
              <Link href="/login" className="auth-form-link">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
