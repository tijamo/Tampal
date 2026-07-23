-- =============================================================================
-- New consent type: directory_hidden. Lets someone (or an admin, on their
-- behalf) opt out of the member directory entirely, not just hide specific
-- fields -- their name/type won't appear at all, same as if they didn't
-- exist in the directory.
--
-- Enum value only in this migration; ALTER TYPE ... ADD VALUE can't be used
-- in the same transaction as a statement that references the new value (same
-- reasoning as 0004_self_service.sql's directory_listing addition).
-- =============================================================================

alter type consent_type add value if not exists 'directory_hidden';
