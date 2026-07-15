import { occurrencesInRange, nextOccurrence, toDateString } from '@/lib/recurrence';

const base = {
  id: 'm1',
  recurrence_until: null as string | null,
};

describe('occurrencesInRange', () => {
  it('returns a single date for a one-off meeting', () => {
    const occ = occurrencesInRange(
      { ...base, starts_at: '2026-01-04T10:30:00Z', recurrence: 'none' },
      '2026-01-01',
      '2026-12-31',
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-01-04']);
  });

  it('generates weekly occurrences within a range', () => {
    const occ = occurrencesInRange(
      { ...base, starts_at: '2026-01-04T10:30:00Z', recurrence: 'weekly' },
      '2026-01-01',
      '2026-01-31',
    );
    expect(occ.map((o) => o.date)).toEqual([
      '2026-01-04',
      '2026-01-11',
      '2026-01-18',
      '2026-01-25',
    ]);
  });

  it('respects recurrence_until', () => {
    const occ = occurrencesInRange(
      {
        ...base,
        starts_at: '2026-01-04T10:30:00Z',
        recurrence: 'weekly',
        recurrence_until: '2026-01-15',
      },
      '2026-01-01',
      '2026-12-31',
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-01-04', '2026-01-11']);
  });

  it('clamps monthly recurrence at month end (31 Jan -> 28 Feb)', () => {
    const occ = occurrencesInRange(
      { ...base, starts_at: '2026-01-31T10:30:00Z', recurrence: 'monthly' },
      '2026-01-01',
      '2026-03-31',
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('generates annual occurrences', () => {
    const occ = occurrencesInRange(
      { ...base, starts_at: '2026-04-05T10:30:00Z', recurrence: 'annually' },
      '2026-01-01',
      '2028-12-31',
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-04-05', '2027-04-05', '2028-04-05']);
  });

  it('excludes occurrences before the range start', () => {
    const occ = occurrencesInRange(
      { ...base, starts_at: '2026-01-04T10:30:00Z', recurrence: 'weekly' },
      '2026-01-12',
      '2026-01-31',
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-01-18', '2026-01-25']);
  });
});

describe('nextOccurrence', () => {
  it('finds the next weekly date on or after a given day', () => {
    const next = nextOccurrence(
      { ...base, starts_at: '2026-01-04T10:30:00Z', recurrence: 'weekly' },
      new Date('2026-01-06T00:00:00'),
    );
    expect(next?.date).toBe('2026-01-11');
  });

  it('returns null when a one-off is in the past', () => {
    const next = nextOccurrence(
      { ...base, starts_at: '2020-01-01T10:30:00Z', recurrence: 'none' },
      new Date('2026-01-06T00:00:00'),
    );
    expect(next).toBeNull();
  });
});

describe('toDateString', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 0, 4))).toBe('2026-01-04');
  });
});
