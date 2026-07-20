'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button, Field, Banner, Card } from '@/components/ui';
import type { Person } from '@/lib/supabase/types';
import { updateOwnProfile, type ProfileFormState } from '@/app/(app)/profile/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

/** Self-service edit of the caller's own contact details. */
export function ProfileForm({ person }: { person: Person }) {
  const [state, formAction] = useFormState<ProfileFormState, FormData>(updateOwnProfile, {});

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.error && <Banner tone="error">{state.error}</Banner>}
      {state.success && <Banner tone="success">{state.success}</Banner>}

      <Card className="flex flex-col gap-4">
        <Field
          label="First name"
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={person.first_name}
        />
        <Field
          label="Surname"
          name="surname"
          autoComplete="family-name"
          defaultValue={person.surname ?? ''}
        />
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={person.email ?? ''} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={person.phone ?? ''} />
        <Field
          label="Address line 1"
          name="address_line1"
          autoComplete="address-line1"
          defaultValue={person.address_line1 ?? ''}
        />
        <Field
          label="Address line 2"
          name="address_line2"
          autoComplete="address-line2"
          defaultValue={person.address_line2 ?? ''}
        />
        <Field
          label="Town / city"
          name="city"
          autoComplete="address-level2"
          defaultValue={person.city ?? ''}
        />
        <Field
          label="Postcode"
          name="postcode"
          autoComplete="postal-code"
          defaultValue={person.postcode ?? ''}
        />
      </Card>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
