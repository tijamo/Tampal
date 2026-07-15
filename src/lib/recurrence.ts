import type { Meeting, Recurrence } from './supabase/types';

/**
 * Recurrence engine. Meetings store a first `starts_at` and a `recurrence` rule;
 * concrete occurrence dates are computed on demand rather than materialised.
 *
 * All dates are handled as local calendar dates (YYYY-MM-DD) to avoid timezone
 * drift shifting a Sunday meeting onto Saturday.
 */

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const targetDay = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  // Clamp to end of month (e.g. 31st -> 30th/28th) so we never roll over.
  const daysInMonth = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(targetDay, daysInMonth));
  return r;
}

/**
 * The nth occurrence date, always computed from the ORIGINAL first date so that
 * e.g. a monthly meeting on the 31st clamps per-month (28 Feb) without drifting
 * the anchor day forward.
 */
function nthOccurrence(first: Date, recurrence: Recurrence, n: number): Date {
  switch (recurrence) {
    case 'weekly':
      return addDays(first, 7 * n);
    case 'monthly':
      return addMonths(first, n);
    case 'annually':
      return addMonths(first, 12 * n);
    case 'none':
    default:
      return first;
  }
}

export interface Occurrence {
  meetingId: string;
  date: string; // YYYY-MM-DD
}

/**
 * Returns occurrence dates for a meeting that fall within [rangeStart, rangeEnd]
 * (inclusive). Guards against runaway loops with a hard cap.
 */
export function occurrencesInRange(
  meeting: Pick<Meeting, 'id' | 'starts_at' | 'recurrence' | 'recurrence_until'>,
  rangeStart: string,
  rangeEnd: string,
  cap = 1000,
): Occurrence[] {
  const start = parseDateString(rangeStart);
  const end = parseDateString(rangeEnd);
  const first = new Date(meeting.starts_at);
  const firstDateOnly = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const until = meeting.recurrence_until ? parseDateString(meeting.recurrence_until) : null;

  const results: Occurrence[] = [];

  for (let n = 0; n < cap; n++) {
    const cursor = nthOccurrence(firstDateOnly, meeting.recurrence, n);
    if (until && cursor > until) break;
    if (cursor > end) break;
    if (cursor >= start) {
      results.push({ meetingId: meeting.id, date: toDateString(cursor) });
    }
    if (meeting.recurrence === 'none') break;
  }

  return results;
}

/**
 * The next occurrence on or after `from` (default today), or null if the series
 * has ended.
 */
export function nextOccurrence(
  meeting: Pick<Meeting, 'id' | 'starts_at' | 'recurrence' | 'recurrence_until'>,
  from: Date = new Date(),
): Occurrence | null {
  const fromStr = toDateString(from);
  // Look up to ~2 years ahead for a sensible bound.
  const horizon = toDateString(addMonths(from, 24));
  const occ = occurrencesInRange(meeting, fromStr, horizon);
  return occ.length ? occ[0] : null;
}
