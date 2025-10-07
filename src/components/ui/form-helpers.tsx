/**
 * Form helper components for improved UX
 */

import { type ReactNode } from 'react';
import { type PasswordStrength } from '@/lib/form-validation';

type HelperTextProps = {
  children: ReactNode;
  className?: string;
};

export function HelperText({ children, className = '' }: HelperTextProps) {
  return (
    <p className={`text-xs text-slate-400 mt-1 ${className}`}>
      {children}
    </p>
  );
}

type CharacterCountProps = {
  current: number;
  max?: number;
  className?: string;
};

export function CharacterCount({ current, max, className = '' }: CharacterCountProps) {
  const isNearLimit = max && current > max * 0.9;
  const isOverLimit = max && current > max;

  return (
    <div className={`text-xs text-right mt-1 ${className}`}>
      <span
        className={
          isOverLimit
            ? 'text-red-400 font-semibold'
            : isNearLimit
            ? 'text-yellow-400'
            : 'text-slate-400'
        }
      >
        {current.toLocaleString()}
        {max && ` / ${max.toLocaleString()}`}
        {max && ' characters'}
      </span>
    </div>
  );
}

type WordCountProps = {
  text: string;
  className?: string;
};

export function WordCount({ text, className = '' }: WordCountProps) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  
  return (
    <div className={`text-xs text-slate-400 ${className}`}>
      Words: {wordCount.toLocaleString()}
    </div>
  );
}

type PasswordStrengthIndicatorProps = {
  password: string;
  strength: PasswordStrength;
  feedback: string[];
  className?: string;
};

export function PasswordStrengthIndicator({
  password,
  strength,
  feedback,
  className = '',
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthWidths = {
    weak: 'w-1/4',
    fair: 'w-2/4',
    good: 'w-3/4',
    strong: 'w-full',
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  };

  return (
    <div className={`space-y-2 mt-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Password strength:</span>
        <span
          className={`text-xs font-semibold ${
            strength === 'weak'
              ? 'text-red-400'
              : strength === 'fair'
              ? 'text-orange-400'
              : strength === 'good'
              ? 'text-yellow-400'
              : 'text-green-400'
          }`}
        >
          {strengthLabels[strength]}
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div
          className={`${strengthColors[strength]} ${strengthWidths[strength]} h-1.5 rounded-full transition-all duration-300`}
        />
      </div>
      {feedback.length > 0 && (
        <ul className="text-xs text-slate-400 space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-start gap-1">
              <span className="text-slate-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ValidationFeedbackProps = {
  isValid: boolean;
  error?: string;
  successMessage?: string;
  showSuccess?: boolean;
  className?: string;
};

export function ValidationFeedback({
  isValid,
  error,
  successMessage,
  showSuccess = false,
  className = '',
}: ValidationFeedbackProps) {
  if (!error && (!showSuccess || isValid)) return null;

  return (
    <div className={`text-xs mt-1 flex items-start gap-1 ${className}`}>
      {error ? (
        <>
          <span className="text-red-400">✕</span>
          <span className="text-red-400">{error}</span>
        </>
      ) : showSuccess && isValid && successMessage ? (
        <>
          <span className="text-green-400">✓</span>
          <span className="text-green-400">{successMessage}</span>
        </>
      ) : null}
    </div>
  );
}

type ProgressStepsProps = {
  steps: string[];
  currentStep: number;
  className?: string;
};

export function ProgressSteps({ steps, currentStep, className = '' }: ProgressStepsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    isCompleted
                      ? 'bg-[var(--accent)] text-[#00539f]'
                      : isCurrent
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)] ring-2 ring-[var(--accent)]'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`text-xs mt-2 text-center ${
                    isCurrent ? 'text-[var(--accent)] font-semibold' : 'text-slate-400'
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all ${
                    isCompleted ? 'bg-[var(--accent)]' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AutoSaveIndicatorProps = {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
};

export function AutoSaveIndicator({ isSaving, lastSaved, className = '' }: AutoSaveIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-slate-400 ${className}`}>
      {isSaving ? (
        <>
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Saving draft...</span>
        </>
      ) : lastSaved ? (
        <>
          <span className="text-green-400">✓</span>
          <span>
            Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </>
      ) : null}
    </div>
  );
}

type RequiredIndicatorProps = {
  className?: string;
};

export function RequiredIndicator({ className = '' }: RequiredIndicatorProps) {
  return (
    <span className={`ml-1 text-red-500 ${className}`} aria-hidden="true">
      *
    </span>
  );
}

type OptionalIndicatorProps = {
  className?: string;
};

export function OptionalIndicator({ className = '' }: OptionalIndicatorProps) {
  return (
    <span className={`ml-1 text-slate-500 text-xs ${className}`}>
      (optional)
    </span>
  );
}
