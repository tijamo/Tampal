import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LinkButton, Card, PageHeading } from '@/components/ui';
import { occurrencesInRange, toDateString } from '@/lib/recurrence';
import type { Meeting } from '@/lib/supabase/types';

export default async function HomePage() {
  const { isAdmin, email } = await requireSession();
  const supabase = createClient();

  // Upcoming occurrences across all active meetings for the next 14 days.
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('archived', false);

  const today = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);

  const upcoming = ((meetings as Meeting[]) ?? [])
    .flatMap((m) =>
      occurrencesInRange(m, toDateString(today), toDateString(horizon)).map((o) => ({
        meeting: m,
        date: o.date,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading>Welcome</PageHeading>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Signed in as {email}
          {isAdmin && ' · Administrator'}
        </p>
      </div>

      <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
        <h2 id="upcoming-heading" className="text-xl font-semibold">
          Upcoming meetings
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <p className="text-slate-600 dark:text-slate-400">
              No meetings scheduled in the next 14 days.
            </p>
            {isAdmin && (
              <div className="mt-4">
                <LinkButton href="/meetings/new">Add a meeting</LinkButton>
              </div>
            )}
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map(({ meeting, date }) => (
              <li key={`${meeting.id}-${date}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <time dateTime={date}>{formatDate(date)}</time>
                      {meeting.location ? ` · ${meeting.location}` : ''}
                    </p>
                  </div>
                  {isAdmin && (
                    <LinkButton
                      variant="secondary"
                      href={`/register/${meeting.id}/${date}`}
                    >
                      Take register
                    </LinkButton>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
