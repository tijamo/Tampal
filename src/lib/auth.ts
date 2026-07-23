import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, Role } from '@/lib/supabase/types';

export type ViewMode = 'admin' | 'member';
const VIEW_MODE_COOKIE = 'view_as';

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  /** The user's actual role, ignoring the view-mode toggle. */
  role: Role;
  /** Effective admin status for this request -- false while an admin is previewing the member view. */
  isAdmin: boolean;
  /** The user's actual admin status, ignoring the view-mode toggle. Only this should gate showing the toggle itself. */
  isRealAdmin: boolean;
  /** Effective access to Meetings/registers -- admin or register_taker, false while previewing member view. */
  canAccessMeetings: boolean;
  viewMode: ViewMode;
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

  const role: Role = (profile?.role as Role | undefined) ?? 'member';
  const isRealAdmin = role === 'admin';
  // Only a real admin's own choice can select member view; anyone else's
  // cookie value is irrelevant since isAdmin/canAccessMeetings below are
  // gated on the real role first, so it can only ever hide privilege.
  const viewMode: ViewMode =
    isRealAdmin && cookies().get(VIEW_MODE_COOKIE)?.value === 'member' ? 'member' : 'admin';

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
    role,
    isAdmin: isRealAdmin && viewMode === 'admin',
    isRealAdmin,
    canAccessMeetings: (role === 'admin' || role === 'register_taker') && viewMode === 'admin',
    viewMode,
  };
}

/** Like requireSession but redirects non-admins away. */
export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!ctx.isAdmin) redirect('/');
  return ctx;
}

/** Like requireSession but redirects users without Meetings/register access away. */
export async function requireMeetingsAccess(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!ctx.canAccessMeetings) redirect('/');
  return ctx;
}
