import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Exchanges the magic-link code for a session cookie, then redirects into the app.
 *
 * origin prefers NEXT_PUBLIC_SITE_URL over the request's own origin: behind
 * Coolify's Traefik proxy, `request.url` can resolve to the app container's
 * internal bind address (e.g. 0.0.0.0:3000) rather than the public domain,
 * which sends the browser to an unreachable address after login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/';
  // Only allow same-origin relative paths. "//evil.com" and "/\evil.com" are
  // protocol-relative / browser-normalised tricks that redirect off-site.
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')
      ? nextParam
      : '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
