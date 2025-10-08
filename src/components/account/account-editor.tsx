
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
};

export default function AccountEditor({ userId, defaultName, defaultAvatar }: Props) {
  const supabase = useSupabase();
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
        // Debug logging
        console.log('Attempting upload to path:', `${userId}/avatar.${ext}`);
        console.log('User ID:', userId);
        console.log('User ID type:', typeof userId);
        console.log('User ID length:', userId?.length);
        
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
        // Debug logging
        console.log('Updating profile for user:', userId);
        console.log('Update data:', { full_name: name || null, avatar_url });
        
        // Try to update first with .select() to verify
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            full_name: name || null,
            avatar_url: avatar_url 
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Update failed:', updateError);
          
          // If update failed (likely because row doesn't exist), try insert
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert({ 
              id: userId,
              full_name: name || null,
              avatar_url: avatar_url 
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('Insert failed:', insertError);
            throw insertError;
          }
          
          console.log('Insert successful:', insertData);
        } else {
          console.log('Update successful:', updateData);
        }
      }

      setMsg('Saved ✔︎');
    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; hint?: string; code?: string; status?: number; statusText?: string };
      console.error('Full error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      console.error('Error code:', error?.code);
      console.error('Error status:', error?.status);
      console.error('Error statusText:', error?.statusText);

      // Also log the stringified version
      console.error('Stringified error:', JSON.stringify(error, null, 2));

      // Check if it's a Supabase storage error
      if (error?.message?.includes('storage') || error?.message?.includes('policy')) {
        setMsg(`Storage error: ${error.message}`);
      } else if (error?.message) {
        setMsg(error.message);
      } else {
        setMsg('Save failed - check console for details');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        {preview ? (
          <Image src={preview} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-2 ring-[--accent]" />
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
