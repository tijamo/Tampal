-- =============================================================================
-- New role: register_taker. Sits between 'member' and 'admin' -- can view
-- meetings and take/edit attendance registers, but can't manage meetings,
-- people, or families.
--
-- Enum value only in this migration; ALTER TYPE ... ADD VALUE can't be used
-- in the same transaction as a statement that references the new value
-- (same reasoning as 0004_self_service.sql's directory_listing addition).
-- =============================================================================

alter type role add value if not exists 'register_taker';
