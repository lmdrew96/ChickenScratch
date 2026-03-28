'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';

type Props = {
  avatarUrl: string | null;
  initials: string;
  name: string;
  pronouns: string | null;
};

export default function AccountBadgeDropdown({ avatarUrl, initials, name, pronouns }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={wrapperRef} className="account-badge-wrapper">
      <button
        type="button"
        className="account-badge"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="sr-only">Account menu</span>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={40}
            height={40}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {open && (
        <div className="account-badge-dropdown" role="menu">
          {/* Identity header */}
          <div className="account-badge-dropdown-header">
            <p className="account-badge-dropdown-name">{name}</p>
            {pronouns && (
              <p className="account-badge-dropdown-pronouns">{pronouns}</p>
            )}
          </div>

          {/* Menu items */}
          <div className="account-badge-dropdown-items">
            <Link
              href="/account"
              className="account-badge-dropdown-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Account settings
            </Link>
            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="account-badge-dropdown-item account-badge-dropdown-signout"
                role="menuitem"
              >
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  );
}
