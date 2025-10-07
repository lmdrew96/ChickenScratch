'use client';

/**
 * Skip Links Component
 * Provides keyboard navigation shortcuts to main content areas
 * WCAG 2.1 Level A requirement
 */
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#navigation" className="skip-link">
        Skip to navigation
      </a>
    </div>
  );
}
