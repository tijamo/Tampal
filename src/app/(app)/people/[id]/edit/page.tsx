import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/ui';
import { PersonForm } from '@/components/person-form';
import { updatePerson } from '../../actions';
import type { Person } from '@/lib/supabase/types';

export const metadata: Metadata = { title: 'Edit person' };

export default async function EditPersonPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const { data } = await supabase
    .from('people')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading>Edit person</PageHeading>
      <PersonForm action={updatePerson} person={data as Person} mode="edit" />
    </div>
  );
}
