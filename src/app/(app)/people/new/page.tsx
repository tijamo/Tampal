import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { PageHeading } from '@/components/ui';
import { PersonForm } from '@/components/person-form';
import { createPerson } from '../actions';

export const metadata: Metadata = { title: 'Add person' };

export default async function NewPersonPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <PageHeading>Add a person</PageHeading>
      <PersonForm action={createPerson} mode="create" />
    </div>
  );
}
