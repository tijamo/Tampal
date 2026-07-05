'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Field, Banner } from '@/components/ui';

/**
 * Passwordless magic-link sign-in. `shouldCreateUser: false` enforces the
 * invite-only rule: only people an admin has already added as auth users can
 * receive a link. Unknown emails get the same neutral confirmation (no account
 * enumeration).
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // Deliberately show success even if the email is unknown, to avoid leaking
    // who has an account. Only show an error for genuine transport failures.
    setStatus(error && error.status !== 400 ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <Card>
        <Banner tone="success">
          <p className="font-medium">Check your email</p>
          <p className="mt-1">
            If <span className="font-medium">{email}</span> has an account, a secure sign-in
            link is on its way. It expires shortly for your security.
          </p>
        </Banner>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="We'll email you a secure link — no password needed."
        />
        {status === 'error' && (
          <Banner tone="error">Something went wrong sending your link. Please try again.</Banner>
        )}
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </Button>
      </form>
    </Card>
  );
}
