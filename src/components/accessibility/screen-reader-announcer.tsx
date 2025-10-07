'use client';

import { useEffect, useState } from 'react';

/**
 * Screen Reader Announcer Component
 * Provides live region announcements for dynamic content changes
 * WCAG 2.1 Level A requirement for status messages
 */

interface AnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

export function ScreenReaderAnnouncer({ message, priority = 'polite', clearAfter = 5000 }: AnnouncerProps) {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);
    
    if (clearAfter > 0) {
      const timer = setTimeout(() => {
        setAnnouncement('');
      }, clearAfter);
      
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

/**
 * Hook for programmatic announcements
 */
export function useScreenReaderAnnouncement() {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = (text: string, announcePriority: 'polite' | 'assertive' = 'polite') => {
    setMessage(text);
    setPriority(announcePriority);
  };

  return { message, priority, announce };
}
