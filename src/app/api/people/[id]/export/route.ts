import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GDPR Subject Access / portability export: returns everything we hold about one
 * person as a downloadable JSON file. An admin may export anyone; a member may
 * only export their own linked record (enforced here, and independently by the
 * RLS policies on the underlying tables -- a self export relies on people_select
 * and consents_read_own/attendance_read_own already scoping reads to "own row").
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, person_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin' && profile?.person_id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;
  const [{ data: person }, { data: consents }, { data: attendance }] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).maybeSingle(),
    supabase.from('consents').select('*').eq('person_id', id).order('created_at'),
    supabase
      .from('attendance')
      .select('meeting_id, occurrence_date, present, recorded_at')
      .eq('person_id', id)
      .order('occurrence_date'),
  ]);

  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = {
    exported_at: new Date().toISOString(),
    data_controller: process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME ?? 'Tamworth Christadelphian Church',
    subject: person,
    consents,
    attendance,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tamfam-export-${id}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
