'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Props = { allowedDomains: string[] };

function cookieGet(name: string) {
  const m = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : undefined;
}
function cookieSet(name: string, value: string, opts?: { maxAge?: number; domain?: string; path?: string; secure?: boolean; sameSite?: 'lax'|'strict'|'none' }) {
  let c = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  c += `; Path=${opts?.path ?? '/'}`;
  if (opts?.maxAge != null) c += `; Max-Age=${opts.maxAge}`;
  if (opts?.domain) c += `; Domain=${opts.domain}`;
  c += `; SameSite=${opts?.sameSite ?? 'Lax'}`;
  if (opts?.secure) c += `; Secure`;
  document.cookie = c;
}
function cookieRemove(name: string, opts?: { domain?: string; path?: string }) {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${opts?.path ?? '/'}${opts?.domain ? `; Domain=${opts.domain}` : ''}; SameSite=Lax`;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon, {
    cookies: {
      get: cookieGet,
      set: (name, value, options) => cookieSet(name, value, { ...options, sameSite: 'lax' }),
      remove: (name, options) => cookieRemove(name, options),
    },
  });
}

function inAllowedDomain(email: string, allowed: string[]) {
  if (!allowed?.length) return true;
  const m = email.toLowerCase().match(/@([^@]+)$/);
  if (!m) return false;
  const domain = m[1].trim();
  return allowed.some((d) => d.toLowerCase() === domain);
}

export default function LoginForm({ allowedDomains }: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => makeSupabase(), []);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!supabase) {
      setError('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    if (!email) return setError('Please enter your email.');
    if (!password) return setError('Please enter your password.');
    if (!inAllowedDomain(email, allowedDomains)) {
      return setError(`That email domain is not allowed. Allowed: ${allowedDomains.join(', ')}`);
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message || 'Sign-in failed.');
      return;
    }

    // At this point, @supabase/ssr has written the auth cookies.
    // Refresh RSC and go to your dashboard/list page.
    router.refresh();
    router.push('/mine');
  }

  return (
    <form onSubmit={onSubmit} className="card form-section" style={{ padding: '1.25rem' }}>
      <div className="form-section">
        <h2>Sign in</h2>
        <p className="text-slate-400">Use your portal credentials. {allowedDomains?.length ? <>Allowed domains: <span className="text-slate-300">{allowedDomains.join(', ')}</span></> : null}</p>
      </div>

      {envMissing ? (
        <div className="form-section">
          <div className="badge" style={{ background:'rgba(255,0,0,.1)', color:'#fecaca', borderColor:'rgba(255,0,0,.25)' }}>
            NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="form-section">
          <div className="badge" style={{ background:'rgba(255,0,0,.1)', color:'#fecaca', borderColor:'rgba(255,0,0,.25)' }}>
            {error}
          </div>
        </div>
      ) : null}

      <div className="form-section">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: '#ffd500' }}>
          Email <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
          style={{ borderColor: 'var(--line)' }}
          placeholder="you@example.com"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
      </div>

      <div className="form-section">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: '#ffd500' }}>
          Password <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
          style={{ borderColor: 'var(--line)' }}
          placeholder="••••••••"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
      </div>

      <div className="form-section">
        <button type="submit" className="btn btn-accent w-full sm:w-auto" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
