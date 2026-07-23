import type { Consent, ConsentType } from '@/lib/supabase/types';

/**
 * Latest consent decision per type wins (consents are append-only).
 * `defaultValue` is what to return when there's no consent history at all
 * for that type -- most consents default to false (opt-in), but
 * directory_visible defaults to true (visible unless explicitly turned off).
 */
export function latestConsent(
  consents: Consent[],
  type: ConsentType,
  defaultValue = false,
): boolean {
  const rows = consents
    .filter((c) => c.consent_type === type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows[0]?.granted ?? defaultValue;
}
