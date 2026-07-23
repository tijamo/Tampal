'use client';

import { useTransition } from 'react';
import { setUserRole } from '@/app/(app)/people/actions';
import type { Role } from '@/lib/supabase/types';

const ROLE_LABELS: Record<Role, string> = {
  member: 'Member',
  register_taker: 'Register taker (can take attendance registers)',
  admin: 'Admin',
};

export function RoleSelect({
  targetUserId,
  personId,
  role,
}: {
  targetUserId: string;
  personId: string;
  role: Role;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="user-role" className="font-medium">
        Role
      </label>
      <select
        id="user-role"
        defaultValue={role}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => {
            void setUserRole(targetUserId, personId, e.target.value as Role);
          })
        }
        className="min-h-touch rounded-md border border-slate-400 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
      >
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}
