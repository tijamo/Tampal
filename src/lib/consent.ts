import type { Consent, ConsentType } from '@/lib/supabase/types';

/** Latest consent decision per type wins (consents are append-only). */
export function latestConsent(consents: Consent[], type: ConsentType): boolean {
  const rows = consents
    .filter((c) => c.consent_type === type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows[0]?.granted ?? false;
}
