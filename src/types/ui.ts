import { ReactNode, ComponentPropsWithoutRef } from 'react';

// Base UI component prop types
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Button component types
export interface ButtonProps extends ComponentPropsWithoutRef<'button'>, BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

// Input component types  
export interface InputProps extends ComponentPropsWithoutRef<'input'>, BaseComponentProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Textarea component types
export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'>, BaseComponentProps {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  rows?: number;
}

// Select component types
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends ComponentPropsWithoutRef<'select'>, BaseComponentProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

// Modal component types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Toast notification types
export interface ToastProps extends BaseComponentProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Loading component types
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export interface LoadingSkeletonProps extends BaseComponentProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | false;
}

// Badge component types
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

// Status badge specific types
export interface StatusBadgeProps extends BaseComponentProps {
  status: 'submitted' | 'in_review' | 'needs_revision' | 'accepted' | 'declined' | 'published';
  showIcon?: boolean;
}

// File upload component types
export interface FileUploadProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  onFileSelect: (files: File[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

// Progress component types
export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  animate?: boolean;
}

// Dropdown menu types
export interface DropdownMenuItem {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  separator?: boolean;
}

export interface DropdownMenuProps extends BaseComponentProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  onSelect: (value: string) => void;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}