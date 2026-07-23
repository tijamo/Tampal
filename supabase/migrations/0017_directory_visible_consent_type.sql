-- =============================================================================
-- Replace directory_hidden (granted=true meant "hide me", default visible)
-- with directory_visible, so all four directory consents share the same
-- polarity: granted=true always means "show this". directory_visible
-- defaults to visible (true) when no consent row exists at all, same
-- externally-observable default as directory_hidden had.
--
-- Enum value only in this migration; ALTER TYPE ... ADD VALUE can't be used
-- in the same transaction as a statement that references the new value (same
-- reasoning as 0004_self_service.sql's directory_listing addition).
-- =============================================================================

alter type consent_type add value if not exists 'directory_visible';
