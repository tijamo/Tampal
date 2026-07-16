import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  // Prefer NEXT_PUBLIC_SITE_URL over request.url's origin: behind Coolify's
  // Traefik proxy, request.url can resolve to the app container's internal
  // bind address rather than the public domain (see auth/callback/route.ts).
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return NextResponse.redirect(new URL('/login', origin), { status: 303 });
}
