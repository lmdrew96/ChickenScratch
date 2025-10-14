
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Supabase type inference issues with profiles table
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSupabase } from '@/components/providers/supabase-provider';

type Props = {
  userId: string;
  defaultName: string | null;
  defaultAvatar: string | null;
  defaultPronouns?: string | null;
};

export default function AccountEditor({ userId, defaultName, defaultAvatar, defaultPronouns }: Props) {
  const supabase = useSupabase();
  
  // Profile section state
  const [name, setName] = useState(defaultName ?? '');
  const [pronouns, setPronouns] = useState(defaultPronouns ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(defaultAvatar ?? null);
  
  // Password section state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      let avatar_url = preview ?? null;

      if (file && supabase) {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${userId}/avatar.${ext}`;
        
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
        // Try to update first
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            full_name: name || null,
            avatar_url: avatar_url,
            pronouns: pronouns || null
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          // If update failed (likely because row doesn't exist), try insert
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ 
              id: userId,
              full_name: name || null,
              avatar_url: avatar_url,
              pronouns: pronouns || null
            })
            .select()
            .single();
            
          if (insertError) {
            throw insertError;
          }
        }
      }

      setMsg('Profile saved successfully ✔︎');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg(error?.message || 'Save failed - please try again');
    } finally {
      setSaving(false);
    }
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg(null);
    setPasswordError(null);

    // Validation
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordSaving(false);
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase client not available');

      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordMsg('Password changed successfully ✔︎');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPasswordError(error?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Information Section */}
      <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
        
        <div className="flex items-center gap-4">
          {preview ? (
            <Image src={preview} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-2 ring-[--accent]" />
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
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {msg && <span className="text-sm text-green-400">{msg}</span>}
        </div>
      </form>

      {/* Change Password Section */}
      <form onSubmit={onPasswordSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
        
        {passwordError && (
          <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-sm">
            {passwordError}
          </div>
        )}

        {passwordMsg && (
          <div className="p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-300 text-sm">
            {passwordMsg}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1 text-gray-300">New Password</label>
          <input
            type="password"
            className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-white"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            minLength={8}
          />
          <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-300">Confirm New Password</label>
          <input
            type="password"
            className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-white"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={8}
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="submit" 
            className="btn btn-accent" 
            disabled={passwordSaving || !newPassword || !confirmPassword}
          >
            {passwordSaving ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
