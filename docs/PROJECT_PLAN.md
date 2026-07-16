# TamFam Project Plan — Context, Gap Analysis & Roadmap

_Last updated: 2026-07-16. Update this document as phases land or requirements change._

## Purpose

TamFam is a Progressive Web App for Tamworth Christadelphian Church (TamFam)
to store member/visitor data (addresses, phone numbers, emails, etc.) and use
it to take attendance registers at configurable, repeatable meetings. Members
start as pure data; sending an invite to a member's email turns them into a
user who can log in, view the member list, take attendance registers, and
edit their own personal information. Only admin users can edit meeting
details and all member information. The site must be fully UK GDPR, DPA 2018
and Data (Use and Access) Act 2025 compliant, and WCAG 2.2 AA accessible.

## What already exists (verified in code)

- **People (members/visitors) CRUD** — `src/app/(app)/people/*`, admin-only.
- **Meetings** — create + archive, recurring (`none/weekly/monthly/annually`)
  via `src/lib/recurrence.ts`; no edit-existing-meeting page yet.
- **Attendance register** — `src/app/(app)/register/[meetingId]/[date]/`,
  admin-only today, with offline queue/sync (IndexedDB + Background Sync).
- **Auth** — Supabase magic-link, invite-only sign-up (`shouldCreateUser:
  false`), `profiles(user_id, person_id, role)` with `is_admin()` SQL helper
  driving RLS; `requireSession()`/`requireAdmin()` in `src/lib/auth.ts`.
- **GDPR machinery** — `consents` table (append-only), `audit_log` (trigger-
  populated), `/api/people/[id]/export` (Subject Access Request JSON export),
  `erasePerson` action (soft delete + anonymise attendance + 30-day hard
  purge via `0002_retention.sql`), `/privacy` notice page, London
  (`eu-west-2`) hosting, PECR note (no analytics/cookies).
- **Accessibility** — skip link, labelled fields, AA contrast tokens, ≥44px
  touch targets, `jest-axe` component tests.
- **In-app invite flow** — "Invite as user" action on a person record
  (`src/app/(app)/people/actions.ts` `invitePerson`, `components/invite-person.tsx`)
  calls `inviteUserByEmail` with `person_id` in the metadata;
  `handle_new_user()` (`0004_self_service.sql`) links the resulting profile
  to that person automatically.
- **Self-service profile editing** — `/profile` (`requireSession()`, not
  admin) lets a linked user edit their own contact details via the
  `update_own_contact_details` SECURITY DEFINER RPC
  (`0005_self_service_rls.sql`), which whitelists exactly the editable
  columns.
- **Directory with opt-in contact visibility** — `/directory` (non-admin
  nav entry) reads the `people_directory` view, which shows phone/email
  only where a live `directory_listing` consent exists; opt-in/out is
  self-service from `/profile` via `set_own_directory_consent`.
- **Open register-taking** — `register/[meetingId]/[date]` now uses
  `requireSession()`; `attendance` RLS allows any authenticated user to
  insert/update (delete stays admin-only).
- **In-app admin promotion** — `setUserRole` action + toggle on the person
  detail page, admin-only, self-demotion blocked.
- **Meeting edit page** — `meetings/[id]/edit` reuses `MeetingForm` in
  `edit` mode.
- **Missing entirely**: DUA 2025-specific privacy text, WCAG 2.2-specific
  gap audit (see Phase 2).

## Product decisions on file

1. **Member directory**: extend `people_directory` to show phone/email, but
   **only** for people who have opted in to a directory-visibility consent —
   everyone else still shows name-only. Requires a new `consent_type` value
   (e.g. `directory_listing`) and a directory view keyed off it.
2. **Register-taking scope**: any authenticated (invited) user can take the
   register for any meeting/date — no restriction to "upcoming only."
3. **Admin promotion**: add an in-app admin-only control to grant/revoke the
   `admin` role on another user, replacing the manual-SQL bootstrap step for
   everyone after the first admin.

## Status snapshot (2026-07-16)

Phases 1 and 2 are fully shipped. Phase 3 housekeeping is mostly done: test
coverage expansion (item 9) and type regeneration (item 10) are blocked on
a live Supabase/Postgres instance, which isn't available in this
environment; the self-hosted deploy path review (item 11) is complete.
Working tree is clean at v0.1.10 on `main`.

Considered and declined: standing up a Postgres-MCP bridge on the VPS
(Coolify resource talking to the `db` service, exposed to Claude as a
custom claude.ai connector) to unblock items 9/10 against the real
self-hosted instance. Decided against it — a permanent, full-`postgres`-
role, internet-reachable line into a GDPR-covered database is a lot of
standing attack surface and maintenance for two lower-priority
housekeeping items. Items 9/10 stay blocked and should instead be
unblocked opportunistically from a session with a working Docker daemon,
using a **disposable local stack** (`supabase start` or a throwaway
`docker run postgres` with `supabase/migrations/*.sql` applied) — never
production. Don't re-propose a remote DB connector for this; ask first if
it comes up again.

## Roadmap

### Phase 1 — Core requirements from the product brief — ✅ DONE (v0.1.3)
1. ✅ In-app invite-to-user flow.
2. ✅ Self-service profile editing.
3. ✅ Directory with opt-in contact visibility.
4. ✅ Open up register-taking to all authenticated users.
5. ✅ In-app admin promotion.
6. ✅ Meeting edit page.

All six landed together in `20527ec` (v0.1.3); see "What already exists"
above for where each lives. `npm run typecheck`, `npm run lint`, and
`npm test` all pass against this state.

### Phase 2 — Compliance formalisation — ✅ DONE (v0.1.8)
7. ✅ **UK GDPR / DPA 2018 / Data (Use and Access) Act 2025 review** (v0.1.6)
   - `/privacy` now cites the Data (Use and Access) Act 2025 alongside UK
     GDPR/DPA 2018, states plainly that we do no automated decision-making
     or bulk marketing (so DUA's ADM/soft-opt-in provisions stay out of
     scope), and has a dedicated "How to complain" section — internal route
     first (30-day response target), ICO after, complaining to us optional.
   - Wording is a starting point, not certified legal text — final
     sign-off is still a church-trustee decision (README already disclaims
     "not legal advice").
8. ✅ **WCAG 2.2 AA gap audit** (v0.1.8)
   - New 2.2 success criteria checked against current UI:
     - 2.4.11 Focus Not Obscured — pass, no sticky/fixed chrome to obscure a
       focused element (the erase-person dialog overlay is the only `fixed`
       content, and it's the active surface itself, not an obstruction).
     - 2.5.7 Dragging Movements — N/A, no drag interactions anywhere.
     - 2.5.8 Target Size Minimum — pass. `Button`/`LinkButton`/`Field` are
       ≥44px; radio/checkbox inputs are visually 20px but their wrapping
       `<label>` is the full ≥44px hit target; `ToggleSwitch` is 28×48px
       (above the 24×24 minimum, below the app's own 44px convention —
       left as-is, a Radix primitive at a still-compliant size).
     - 3.2.6 Consistent Help — N/A, no help/contact mechanism repeats across
       pages.
     - 3.3.7 Redundant Entry — N/A, no multi-step flows ask for previously
       given information again.
     - 3.3.8 Accessible Authentication — pass, magic-link sign-in has no
       password or cognitive test.
   - Manual keyboard pass (Playwright + `axe-core` against the rendered
     `/login` and `/privacy` pages, plus contrast maths for dark mode) found
     and fixed three real, pre-existing AA gaps, not just 2.2-specific ones:
     1. **2.4.7 Focus Visible** — `Button`/`LinkButton`/`Field` all carried
        `focus-visible:outline-none`, which in Tailwind compiles to
        `outline: 2px solid transparent` — more specific than the site-wide
        focus ring in `globals.css`, so it silently won and every button,
        link-button and text input had **no visible keyboard focus
        indicator at all**. Fix: dropped the redundant utility class.
     2. **1.4.11 Non-text Contrast (dark mode)** — the focus ring colour
        (`brand-600`) is 7.8:1 against the light background but only
        ~2.3–2.6:1 against the dark one, below the 3:1 minimum. Fix: dark
        mode now uses `brand-400` (~4.8–5.4:1) via a `prefers-color-scheme`
        override in `globals.css`.
     3. **4.1.2 Name, Role, Value + 1.4.11** — `ToggleSwitch` (used for
        every consent/directory/role toggle) relied on `<label for>` for its
        accessible name, which `axe-core`'s `button-name` rule (correctly)
        doesn't credit for a `<button role="switch">` — AT support for that
        association on buttons is inconsistent. Its unchecked track colour
        was also only ~1.5:1 (light) / ~2.7:1 (dark) against the page
        background. Fix: added `aria-label`, and swapped the unchecked
        track to `slate-500` (~4.2–4.8:1 in both modes).
   - Added an `a11y.test.tsx` case for `ToggleSwitch` (both states) so the
     accessible-name fix has regression coverage; `npm run typecheck`,
     `npm run lint`, `npm test` all pass.
   - README's WCAG claim updated to 2.2 AA. A full manual screen-reader
     pass is still recommended before release — not something this audit
     substitutes for.

9. ✅ **Post-v0.2.0 compliance re-check** (v0.2.1) — prompted by the Poppins/
   colour rebrand, mobile bottom nav, install prompt, and Brevo SMTP switch.
   - Poppins is loaded via `next/font/google`, which self-hosts the font
     files at build time (no runtime request to Google's CDN) — no PECR
     implication, unlike a traditional `<link>` to fonts.googleapis.com.
   - Colour swap only changed hex values within the existing `brand` scale
     structure; contrast ratios re-verified (all exceed the existing AA
     minimums) and `jest-axe` still passes.
   - Found and fixed: `InstallPrompt` was `position: fixed`, which can leave
     a keyboard-focused element on the page entirely hidden behind it (WCAG
     2.2's new 2.4.11 Focus Not Obscured) since native focus-scrolling can't
     route around an overlapping fixed sibling. Changed to a normal-flow top
     banner instead — pushes content down, never overlaps it.
   - Found and fixed: the privacy notice didn't disclose Brevo (the new
     SMTP/email-delivery provider) as a data processor, or that dismissing
     the install prompt uses local storage. Both added to `/privacy`'s "How
     we protect it" section.
   - `BottomNav`/`InstallPrompt` touch targets and text contrast checked
     directly (all comfortably exceed AA minimums); added `a11y.test.tsx`
     coverage for both. `npm run typecheck`, `npm run lint`, `npm test`
     (31/31), and `npm run build` all pass.
   - Not verified: real-device visual confirmation that the bottom nav's
     reserved space (`pb-[5rem+safe-area]`) fully clears its rendered
     height on every phone — reasoned from CSS, not screenshotted, since
     this app requires an authenticated session this sandbox can't reach.

### Phase 3 — Housekeeping (lower priority, do opportunistically)
9. 🟡 **Expand test coverage** (v0.1.9, partial)
   - Done: extracted the duplicated `latestConsent` helper into
     `src/lib/consent.ts` with unit tests (`consent.test.ts`); added
     `offline-queue.test.ts` (dedupe-by-key, dequeue) using `fake-indexeddb`
     (new devDependency — jsdom has no native IndexedDB); added
     `attendance-sync.test.ts` covering the offline/empty/success/retry
     paths of `flushAttendanceQueue` with mocked Supabase client + queue;
     added `people-actions.test.ts` covering `invitePerson` (missing email,
     metadata payload, "already registered" error mapping) and
     `setUserRole` (self-demotion guard) with mocked `requireAdmin` /
     Supabase clients. `jest.setup.ts` gained a `structuredClone` polyfill
     (via `node:v8` (de)serialize) that `fake-indexeddb` needs but
     `jest-environment-jsdom` doesn't provide.
   - Not done, and needs a real environment to do properly: **RLS-backed
     CRUD flows**. This needs an actual running Postgres/Supabase instance
     (e.g. `supabase start`, which needs Docker image pulls) to be a
     meaningful test — the RLS policies themselves are what's under test,
     and mocking the Supabase client can't exercise real Postgres policy
     evaluation. The `supabase` CLI isn't installed in this environment.
     Revisit with `supabase test db` (pgTAP) or a CI job that runs a local
     Supabase stack.
10. Regenerate `src/lib/supabase/types.ts` via `supabase gen types
    typescript` instead of hand-maintaining it. Blocked here too: needs
    either a linked Supabase project or a local stack, neither available in
    this environment/session.
11. ✅ **Self-hosted/Coolify deploy path review** (v0.1.10)
    - Read `docker-compose.yml`, `db/init/00-init.sh`, `kong/`, `migrate.sh`,
      `gen-keys.mjs` against the fix-commit history (Kong YAML-folding
      crash, auth `search_path`/ownership collisions, missing table
      grants). Current state is internally consistent and each historical
      fix is now commented in place — no regressions found. Cross-checked
      every `${VAR}` `docker-compose.yml` references against
      `self-hosting/.env.example`: nothing missing either way.
    - Found and fixed two real doc-drift bugs, not the config itself:
      1. `self-hosting/README.md` step 3 said `migrate.sh` runs only
         `0001_init.sql` and `0002_retention.sql` — stale since `0003`–`0005`
         were added. Worth fixing specifically because `0003_grants.sql` is
         the one whose own comment says a self-hosted stack gets
         **"permission denied for table x" on every query** without it —
         exactly the class of bug this project's fix history shows is easy
         to hit and hard to debug from the error message alone.
      2. `deploy/MORNING-WALKTHROUGH.md` told the operator to deploy from
         git branch `claude/tamfam-church-pwa-ixtasz` in four places. That
         branch is real but is 10 commits behind `main` (confirmed via
         `git merge-base --is-ancestor`) — it predates all of Phase 1, 2 and
         3. Following the walkthrough today would deploy a build missing
         the invite flow, self-service profile/directory, the WCAG fixes,
         and the DUA 2025 privacy copy. Repointed all four to `main`.
    - `deploy/coolify.md` was already correct (uses `*.sql` glob language,
      no branch pinning) — not every self-hosting doc had drifted, just the
      one written for one specific one-off deployment session.

## Files most relevant to Phase 3

- `__tests__/*.test.ts(x)` — six suites now (`a11y`, `recurrence`,
  `consent`, `offline-queue`, `attendance-sync`, `people-actions`); item 9's
  remaining piece (RLS-backed CRUD) needs a running Supabase stack, not
  more `__tests__` files.
- `src/lib/supabase/types.ts` — hand-maintained today; item 10 replaces it
  with `supabase gen types typescript` output, once there's a project to
  generate against.
- `self-hosting/` — Coolify/Kong deploy path; item 11.

## Verification checklist (per phase)

- `npm run typecheck`, `npm run lint`, `npm test`.
- Manually exercise: invite a test email → confirm login → self-edit profile
  → appears/doesn't appear in directory per consent → take a register entry
  → non-admin cannot reach `/people` or admin toggles.
- Re-run `jest-axe` suite plus a manual keyboard-only pass over new pages
  (`/profile`, `/directory`, meeting edit) for the WCAG 2.2 items above.
