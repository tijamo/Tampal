'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ConsentType, PersonType } from '@/lib/supabase/types';

export interface PersonFormState {
  error?: string;
}

function str(form: FormData, key: string): string | null {
  const v = (form.get(key) as string | null)?.trim();
  return v ? v : null;
}

/**
 * Records a consent decision. Consent is append-only: we insert a new row each
 * time so the full grant/withdrawal history is preserved for GDPR accountability.
 */
async function recordConsent(
  personId: string,
  type: ConsentType,
  granted: boolean,
  capturedBy: string,
) {
  const supabase = createClient();
  await supabase.from('consents').insert({
    person_id: personId,
    consent_type: type,
    granted,
    granted_at: granted ? new Date().toISOString() : null,
    withdrawn_at: granted ? null : new Date().toISOString(),
    captured_by: capturedBy,
  });
}

export async function createPerson(
  _prev: PersonFormState,
  form: FormData,
): Promise<PersonFormState> {
  const { userId } = await requireAdmin();
  const supabase = createClient();

  const full_name = str(form, 'full_name');
  if (!full_name) return { error: 'A name is required.' };

  const person_type = (form.get('person_type') as PersonType) ?? 'visitor';
  const attendanceConsent = form.get('consent_attendance') === 'on';
  const contactConsent = form.get('consent_contact') === 'on';

  const { data, error } = await supabase
    .from('people')
    .insert({
      full_name,
      person_type,
      email: str(form, 'email'),
      phone: str(form, 'phone'),
      address_line1: str(form, 'address_line1'),
      address_line2: str(form, 'address_line2'),
      city: str(form, 'city'),
      postcode: str(form, 'postcode'),
      notes: str(form, 'notes'),
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !data) return { error: 'Could not save this person. Please try again.' };

  await recordConsent(data.id, 'attendance_records', attendanceConsent, userId);
  await recordConsent(data.id, 'contact_storage', contactConsent, userId);

  revalidatePath('/people');
  redirect(`/people/${data.id}`);
}

export async function updatePerson(
  _prev: PersonFormState,
  form: FormData,
): Promise<PersonFormState> {
  await requireAdmin();
  const supabase = createClient();
  const id = form.get('id') as string;
  const full_name = str(form, 'full_name');
  if (!id) return { error: 'Missing person id.' };
  if (!full_name) return { error: 'A name is required.' };

  const { error } = await supabase
    .from('people')
    .update({
      full_name,
      person_type: (form.get('person_type') as PersonType) ?? 'visitor',
      email: str(form, 'email'),
      phone: str(form, 'phone'),
      address_line1: str(form, 'address_line1'),
      address_line2: str(form, 'address_line2'),
      city: str(form, 'city'),
      postcode: str(form, 'postcode'),
      notes: str(form, 'notes'),
    })
    .eq('id', id);

  if (error) return { error: 'Could not update this person. Please try again.' };

  revalidatePath(`/people/${id}`);
  revalidatePath('/people');
  redirect(`/people/${id}`);
}

/**
 * Updates a single consent type (used from the person detail page toggles).
 */
export async function setConsent(personId: string, type: ConsentType, granted: boolean) {
  const { userId } = await requireAdmin();
  await recordConsent(personId, type, granted, userId);
  revalidatePath(`/people/${personId}`);
}

/**
 * GDPR erasure. Soft-deletes the person, strips contact PII immediately, and
 * anonymises their attendance (kept for aggregate records but no longer
 * identifiable). A scheduled purge later removes the tombstone row entirely.
 */
export async function erasePerson(personId: string) {
  await requireAdmin();
  const supabase = createClient();

  await supabase
    .from('people')
    .update({
      full_name: 'Erased record',
      email: null,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      postcode: null,
      notes: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', personId);

  revalidatePath('/people');
  redirect('/people');
}
