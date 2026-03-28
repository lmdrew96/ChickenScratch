'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: Date | string | null;
  created_at: Date | string | null;
};

type Props = {
  avatarUrl: string | null;
  initials: string;
  name: string;
  pronouns: string | null;
  initialNotifications: Notification[];
  unreadCount: number;
};

function relativeTime(date: Date | string | null): string {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AccountBadgeDropdown({
  avatarUrl,
  initials,
  name,
  pronouns,
  initialNotifications,
  unreadCount: initialUnreadCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifications);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
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

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoadingNotifs(true);
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifs(data.notifications ?? []);
          setUnread(data.unreadCount ?? 0);
        }
      } finally {
        setLoadingNotifs(false);
      }
    }
  }

  async function handleMarkRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnread((prev) => Math.max(0, prev - 1));
    void fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }

  async function handleMarkAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    void fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
  }

  return (
    <div ref={wrapperRef} className="account-badge-wrapper">
      <button
        type="button"
        className="account-badge"
        onClick={handleOpen}
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
        {unread > 0 && <span className="account-badge-unread-dot" aria-hidden="true" />}
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

          {/* Notification feed */}
          <div className="account-badge-notif-section">
            <div className="account-badge-notif-header">
              <span className="account-badge-notif-label">
                Notifications
                {unread > 0 && <span className="account-badge-notif-count">{unread}</span>}
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  className="account-badge-notif-mark-all"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="account-badge-notif-feed">
              {loadingNotifs ? (
                <p className="account-badge-notif-empty">Loading…</p>
              ) : notifs.length === 0 ? (
                <p className="account-badge-notif-empty">No notifications yet.</p>
              ) : (
                notifs.map((n) => {
                  const isUnread = !n.read_at;
                  const inner = (
                    <>
                      {isUnread && <span className="account-badge-notif-item-dot" aria-hidden="true" />}
                      <div className="account-badge-notif-item-content">
                        <p className="account-badge-notif-item-title">{n.title}</p>
                        {n.body && <p className="account-badge-notif-item-sub">{n.body}</p>}
                        <p className="account-badge-notif-item-time">{relativeTime(n.created_at)}</p>
                      </div>
                    </>
                  );

                  if (n.link) {
                    return (
                      <Link
                        key={n.id}
                        href={n.link}
                        className={`account-badge-notif-item${isUnread ? ' --unread' : ''}`}
                        onClick={() => { if (isUnread) handleMarkRead(n.id); setOpen(false); }}
                      >
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={n.id}
                      className={`account-badge-notif-item${isUnread ? ' --unread' : ''}`}
                      onClick={() => { if (isUnread) handleMarkRead(n.id); }}
                    >
                      {inner}
                    </div>
                  );
                })
              )}
            </div>
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
