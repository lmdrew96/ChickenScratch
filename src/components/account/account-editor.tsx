'use client';

import { useState } from 'react';
import Image from 'next/image';
import { updateProfile, uploadAvatar } from '@/lib/actions/account';

type Props = {
  defaultName: string | null;
  defaultAvatar: string | null;
  defaultPronouns?: string | null;
};

export default function AccountEditor({ defaultName, defaultAvatar, defaultPronouns }: Props) {
  const [name, setName] = useState(defaultName ?? '');
  const [pronouns, setPronouns] = useState(defaultPronouns ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(defaultAvatar ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      // Upload avatar if a new file was selected
      if (file) {
        const avatarForm = new FormData();
        avatarForm.set('avatar', file);
        const avatarResult = await uploadAvatar(avatarForm);
        if (avatarResult.error) throw new Error(avatarResult.error);
        if (avatarResult.avatarUrl) setPreview(avatarResult.avatarUrl);
      }

      // Update profile fields
      const profileForm = new FormData();
      profileForm.set('name', name);
      profileForm.set('pronouns', pronouns);
      const profileResult = await updateProfile(profileForm);
      if (profileResult.error) throw new Error(profileResult.error);

      setMsg('Profile saved successfully');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg(error?.message || 'Save failed - please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>

        <div className="flex items-center gap-4">
          {preview ? (
            <Image src={preview} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-2 ring-[--accent]" unoptimized />
          ) : (
            <div className="h-16 w-16 rounded-full grid place-items-center bg-[--accent] text-[--brand] font-semibold">?</div>
          )}

          <div className="flex-1">
            <label className="block text-sm mb-1 text-gray-300">Profile photo</label>
            <input
              type="file"
              accept="image/*"
              className="text-sm text-gray-300"
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
          <label className="block text-sm mb-1 text-gray-300">Full name</label>
          <input
            className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-300">Pronouns</label>
          <select
            className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-white"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
          >
            <option value="" className="bg-gray-800">Prefer not to say</option>
            <option value="she/her" className="bg-gray-800">she/her</option>
            <option value="he/him" className="bg-gray-800">he/him</option>
            <option value="they/them" className="bg-gray-800">they/them</option>
            <option value="other" className="bg-gray-800">Other</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-accent" disabled={saving}>
            {saving ? 'Saving\u2026' : 'Save Profile'}
          </button>
          {msg && <span className="text-sm text-green-400">{msg}</span>}
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Password & Security</h2>
        <p className="text-sm text-gray-300">
          Password management is handled through Clerk. Use the button below or visit your Clerk profile to change your password.
        </p>
      </div>
    </div>
  );
}
