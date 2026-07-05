import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/types';

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  isAdmin: boolean;
}

/**
 * Resolves the current user and their profile/role for a Server Component or
 * Server Action. Redirects to /login if not authenticated.
 */
export async function requireSession(): Promise<SessionContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
    isAdmin: profile?.role === 'admin',
  };
}

/** Like requireSession but redirects non-admins away. */
export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!ctx.isAdmin) redirect('/');
  return ctx;
}
