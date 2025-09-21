import { clsx } from 'clsx';

export function cn(...inputs: Parameters<typeof clsx>) {
  return clsx(...inputs);
}

export function getEmailDomain(email: string) {
  const [, domain] = email.trim().toLowerCase().split('@');
  return domain ?? '';
}
