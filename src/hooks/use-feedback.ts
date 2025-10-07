'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';

export type FeedbackState = {
  type: 'success' | 'error' | 'info' | null;
  message: string;
  title?: string;
};

export function useFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: '' });
  const { notify } = useToast();

  const showSuccess = useCallback(
    (message: string, title?: string, useToast = false) => {
      setFeedback({ type: 'success', message, title });
      if (useToast) {
        notify({ title: title || 'Success', description: message, variant: 'success' });
      }
    },
    [notify]
  );

  const showError = useCallback(
    (message: string, title?: string, useToast = false) => {
      setFeedback({ type: 'error', message, title });
      if (useToast) {
        notify({ title: title || 'Error', description: message, variant: 'error' });
      }
    },
    [notify]
  );

  const showInfo = useCallback(
    (message: string, title?: string, useToast = false) => {
      setFeedback({ type: 'info', message, title });
      if (useToast) {
        notify({ title: title || 'Info', description: message, variant: 'info' });
      }
    },
    [notify]
  );

  const clearFeedback = useCallback(() => {
    setFeedback({ type: null, message: '' });
  }, []);

  return {
    feedback,
    showSuccess,
    showError,
    showInfo,
    clearFeedback
  };
}
