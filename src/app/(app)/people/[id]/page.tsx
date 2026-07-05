import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LinkButton, Card, PageHeading } from '@/components/ui';
import { ConsentToggle } from '@/components/consent-toggle';
import { ErasePerson } from '@/components/erase-person';
import type { Person, Consent, ConsentType } from '@/lib/supabase/types';

export const metadata: Metadata = { title: 'Person' };

/** Latest consent decision per type wins (consents are append-only). */
function latestConsent(consents: Consent[], type: ConsentType): boolean {
  const rows = consents
    .filter((c) => c.consent_type === type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows[0]?.granted ?? false;
}

export default async function PersonDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const supabase = createClient();

  const { data: person } = await supabase
    .from('people')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!person) notFound();
  const p = person as Person;

  const { data: consentRows } = await supabase
    .from('consents')
    .select('*')
    .eq('person_id', p.id);
  const consents = (consentRows as Consent[]) ?? [];

  const contact = [
    p.email,
    p.phone,
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeading>{p.full_name}</PageHeading>
          <p className="mt-1 capitalize text-slate-600 dark:text-slate-400">{p.person_type}</p>
        </div>
        <LinkButton variant="secondary" href={`/people/${p.id}/edit`}>
          Edit
        </LinkButton>
      </div>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="mb-2 text-xl font-semibold">
          Contact details
        </h2>
        <Card>
          {contact.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No contact details stored.</p>
          ) : (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr]">
              {p.email && <Row label="Email" value={p.email} />}
              {p.phone && <Row label="Phone" value={p.phone} />}
              {(p.address_line1 || p.city || p.postcode) && (
                <Row
                  label="Address"
                  value={[p.address_line1, p.address_line2, p.city, p.postcode]
                    .filter(Boolean)
                    .join(', ')}
                />
              )}
              {p.notes && <Row label="Notes" value={p.notes} />}
            </dl>
          )}
        </Card>
      </section>

      <section aria-labelledby="consent-heading">
        <h2 id="consent-heading" className="mb-2 text-xl font-semibold">
          Consent
        </h2>
        <Card className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
          <ConsentToggle
            personId={p.id}
            type="attendance_records"
            label="Record attendance at meetings (reveals religious belief)"
            granted={latestConsent(consents, 'attendance_records')}
          />
          <ConsentToggle
            personId={p.id}
            type="contact_storage"
            label="Store contact and address details"
            granted={latestConsent(consents, 'contact_storage')}
          />
        </Card>
      </section>

      <section aria-labelledby="rights-heading">
        <h2 id="rights-heading" className="mb-2 text-xl font-semibold">
          Data subject rights
        </h2>
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Export a full copy of this person&rsquo;s data, or erase it on request.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton variant="secondary" href={`/api/people/${p.id}/export`}>
              Export data (JSON)
            </LinkButton>
            <ErasePerson personId={p.id} personName={p.full_name} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-medium text-slate-600 dark:text-slate-400">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
