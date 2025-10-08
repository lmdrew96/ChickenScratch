'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, X } from 'lucide-react';

interface Announcement {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
  created_by_profile?: { display_name: string; email: string };
}

export function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/officer/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/officer/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        setMessage('');
        setShowForm(false);
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  if (loading) {
    return <div className="text-slate-300">Loading announcements...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Officer Announcements
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Announcement'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Announcement Message *
            </label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/20 focus:outline-none"
              rows={4}
              placeholder="Share an update with the officer team..."
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 transition-colors"
          >
            Post Announcement
          </button>
        </form>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            No announcements yet. Post one to keep the team informed!
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
            >
              <p className="text-white">{announcement.message}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {announcement.created_by_profile?.display_name || 'Unknown'}
                </span>
                <span>
                  {new Date(announcement.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
