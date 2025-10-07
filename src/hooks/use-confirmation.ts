'use client';

import { useState, useCallback } from 'react';

export type ConfirmationOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
};

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = useCallback((opts: ConfirmationOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options) return;

    try {
      setIsProcessing(true);
      await options.onConfirm();
      setIsOpen(false);
      setOptions(null);
    } catch (error) {
      console.error('Confirmation action failed:', error);
      // Keep dialog open on error so user can retry
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const handleCancel = useCallback(() => {
    if (options?.onCancel) {
      options.onCancel();
    }
    setIsOpen(false);
    setOptions(null);
    setIsProcessing(false);
  }, [options]);

  return {
    isOpen,
    options,
    isProcessing,
    confirm,
    handleConfirm,
    handleCancel
  };
}
