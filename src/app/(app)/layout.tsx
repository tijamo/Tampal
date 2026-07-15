import { requireSession } from '@/lib/auth';
import { AppNav } from '@/components/app-nav';

/**
 * Layout for all authenticated pages. requireSession() redirects to /login when
 * there is no valid session (defence in depth alongside the middleware).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, email } = await requireSession();

  return (
    <>
      <AppNav isAdmin={isAdmin} email={email} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
