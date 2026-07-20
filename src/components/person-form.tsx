'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button, Field, Banner, Card } from '@/components/ui';
import type { Person } from '@/lib/supabase/types';
import type { PersonFormState } from '@/app/(app)/people/actions';

type Action = (prev: PersonFormState, form: FormData) => Promise<PersonFormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  );
}

/**
 * Shared add/edit form. On "add", consent checkboxes capture explicit consent
 * (required for special-category attendance data). On "edit", consent is managed
 * separately on the detail page, so those checkboxes are omitted.
 */
export function PersonForm({
  action,
  person,
  mode,
}: {
  action: Action;
  person?: Person;
  mode: 'create' | 'edit';
}) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {person && <input type="hidden" name="id" value={person.id} />}

      {state.error && <Banner tone="error">{state.error}</Banner>}

      <Card className="flex flex-col gap-4">
        <Field
          label="First name"
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={person?.first_name ?? ''}
        />
        <Field
          label="Surname"
          name="surname"
          autoComplete="family-name"
          defaultValue={person?.surname ?? ''}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">This person is a</legend>
          <div className="flex gap-4">
            {(['member', 'visitor'] as const).map((t) => (
              <label key={t} className="inline-flex min-h-touch items-center gap-2">
                <input
                  type="radio"
                  name="person_type"
                  value={t}
                  defaultChecked={(person?.person_type ?? 'visitor') === t}
                  className="h-5 w-5"
                />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Contact details (optional)</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Only store what you need. These details are visible to administrators only.
        </p>
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={person?.email ?? ''} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={person?.phone ?? ''} />
        <Field label="Address line 1" name="address_line1" autoComplete="address-line1" defaultValue={person?.address_line1 ?? ''} />
        <Field label="Address line 2" name="address_line2" autoComplete="address-line2" defaultValue={person?.address_line2 ?? ''} />
        <Field label="Town / city" name="city" autoComplete="address-level2" defaultValue={person?.city ?? ''} />
        <Field label="Postcode" name="postcode" autoComplete="postal-code" defaultValue={person?.postcode ?? ''} />
        <Field label="Notes" name="notes" defaultValue={person?.notes ?? ''} />
      </Card>

      {mode === 'create' && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Consent</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Attendance at our meetings reveals religious belief (special category data). Please
            confirm this person has given their explicit consent.
          </p>
          <label className="flex min-h-touch items-start gap-3">
            <input type="checkbox" name="consent_attendance" className="mt-1 h-5 w-5" />
            <span>Consent to record their attendance at meetings.</span>
          </label>
          <label className="flex min-h-touch items-start gap-3">
            <input type="checkbox" name="consent_contact" className="mt-1 h-5 w-5" />
            <span>Consent to store their contact and address details.</span>
          </label>
        </Card>
      )}

      <div>
        <SubmitButton label={mode === 'create' ? 'Add person' : 'Save changes'} />
      </div>
    </form>
  );
}
