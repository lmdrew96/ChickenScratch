'use client';

import { useFormState } from 'react-dom';

import { registerAction, signInAction } from '@/lib/actions/auth';
import { authInitialState } from '@/lib/actions/auth-shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginFormProps = {
  allowedDomains: string[];
};

export function LoginForm({ allowedDomains }: LoginFormProps) {
  const [signInState, signInDispatch] = useFormState(signInAction, authInitialState);
  const [registerState, registerDispatch] = useFormState(registerAction, authInitialState);

  return (
    <div className="grid gap-10 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/30 md:grid-cols-2">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Welcome to Chicken Scratch</h1>
        <p className="text-sm text-white/70">
          Submit your writing, art, and experiments for the zine. Approved editors can manage submissions and publish new
          issues.
        </p>
        <p className="text-xs text-white/50">
          Accounts are limited to{' '}
          {allowedDomains.length > 0 ? allowedDomains.join(', ') : 'approved campus'} domains. Use your school email when
          creating an account.
        </p>
      </section>

      <div className="space-y-8">
        <form action={signInDispatch} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input id="signin-email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input id="signin-password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {signInState.message ? <p className="text-xs text-rose-300">{signInState.message}</p> : null}
          <Button type="submit">Sign in</Button>
        </form>

        <form action={registerDispatch} className="grid gap-4 border-t border-white/10 pt-6">
          <h2 className="text-lg font-semibold text-white">Create an account</h2>
          <div className="grid gap-2">
            <Label htmlFor="register-name">Name</Label>
            <Input id="register-name" name="name" required autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="register-email">Email</Label>
            <Input id="register-email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="register-password">Password</Label>
            <Input id="register-password" name="password" type="password" required autoComplete="new-password" />
            <p className="text-xs text-white/50">Choose a strong password. You can reset it from Supabase if needed.</p>
          </div>
          {registerState.message ? (
            <p className={registerState.status === 'success' ? 'text-xs text-emerald-300' : 'text-xs text-rose-300'}>
              {registerState.message}
            </p>
          ) : null}
          <Button type="submit" variant="outline">
            Register
          </Button>
        </form>
      </div>
    </div>
  );
}
