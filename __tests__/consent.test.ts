import { latestConsent } from '@/lib/consent';
import type { Consent } from '@/lib/supabase/types';

function consent(overrides: Partial<Consent>): Consent {
  return {
    id: 'c1',
    person_id: 'p1',
    consent_type: 'attendance_records',
    granted: true,
    version: '1.0',
    granted_at: null,
    withdrawn_at: null,
    captured_by: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('latestConsent', () => {
  it('returns false when there is no consent history for the type', () => {
    expect(latestConsent([], 'attendance_records')).toBe(false);
  });

  it('ignores rows for other consent types', () => {
    const consents = [consent({ consent_type: 'contact_storage', granted: true })];
    expect(latestConsent(consents, 'attendance_records')).toBe(false);
  });

  it('is append-only: the most recently created row wins, regardless of array order', () => {
    const consents = [
      consent({ created_at: '2026-01-01T00:00:00Z', granted: true }),
      consent({ created_at: '2026-03-01T00:00:00Z', granted: false }),
      consent({ created_at: '2026-02-01T00:00:00Z', granted: true }),
    ];
    expect(latestConsent(consents, 'attendance_records')).toBe(false);
  });

  it('a withdrawal after a grant reads as not granted', () => {
    const consents = [
      consent({ created_at: '2026-01-01T00:00:00Z', granted: true }),
      consent({ created_at: '2026-01-02T00:00:00Z', granted: false }),
    ];
    expect(latestConsent(consents, 'attendance_records')).toBe(false);
  });
});
