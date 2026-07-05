'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button, Field, Banner, Card } from '@/components/ui';
import type { MeetingFormState } from '@/app/(app)/meetings/actions';
import type { Recurrence } from '@/lib/supabase/types';

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'annually', label: 'Every year' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Add meeting'}
    </Button>
  );
}

export function MeetingForm({
  action,
}: {
  action: (prev: MeetingFormState, form: FormData) => Promise<MeetingFormState>;
}) {
  const [state, formAction] = useFormState(action, {});
  const [recurrence, setRecurrence] = useState<Recurrence>('weekly');

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.error && <Banner tone="error">{state.error}</Banner>}

      <Card className="flex flex-col gap-4">
        <Field label="Title" name="title" required defaultValue="" />
        <Field label="Location" name="location" defaultValue="" />
        <Field label="Description" name="description" defaultValue="" />
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First date" name="date" type="date" required defaultValue="" />
          <Field label="Start time" name="time" type="time" defaultValue="10:30" />
        </div>
        <Field
          label="Duration (minutes)"
          name="duration_minutes"
          type="number"
          min={1}
          defaultValue="90"
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="recurrence" className="font-medium">
            Repeats
          </label>
          <select
            id="recurrence"
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className="min-h-touch rounded-md border border-slate-400 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {recurrence !== 'none' && (
          <Field
            label="Repeat until (optional)"
            name="recurrence_until"
            type="date"
            hint="Leave blank to repeat indefinitely."
            defaultValue=""
          />
        )}
      </Card>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
