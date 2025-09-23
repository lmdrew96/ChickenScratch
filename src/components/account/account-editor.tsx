
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Props = {
  userId: string;
  defaultName: string | null;
  defaultAvatar: string | null;
};

const supabase =
  typeof window !== 'undefined'
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : (null as any);

export default function AccountEditor({ userId, defaultName, defaultAvatar }: Props) {
  const [name, setName] = useState(defaultName ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(defaultAvatar ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      let avatar_url = preview ?? null;

      if (file && supabase) {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `public/${userId}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from('avatars').upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || undefined,
        });
        if (up.error) throw up.error;

        const pub = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = pub.data.publicUrl;
      }

      if (supabase) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, full_name: name || null, avatar_url }, { onConflict: 'id' });
        if (error) throw error;
      }

      setMsg('Saved ✔︎');
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-[--accent]" />
        ) : (
          <div className="h-16 w-16 rounded-full grid place-items-center bg-[--accent] text-[--brand] font-semibold">?</div>
        )}

        <div>
          <label className="block text-sm mb-1">Profile photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) {
                const url = URL.createObjectURL(f);
                setPreview(url);
              }
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Full name</label>
        <input
          className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-accent" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg && <span className="text-sm opacity-80">{msg}</span>}
      </div>
    </form>
  );
}
