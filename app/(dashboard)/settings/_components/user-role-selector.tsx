'use client';

import { PracticeRole } from '@prisma/client';

interface UserRoleSelectorProps {
  userId: string;
  currentRole: PracticeRole;
  updateRoleAction: (formData: FormData) => Promise<void>;
}

export function UserRoleSelector({ userId, currentRole, updateRoleAction }: UserRoleSelectorProps) {
  // Defensive validation - if props are invalid, show static label
  if (!userId || !currentRole || !updateRoleAction) {
    const displayRole = currentRole || 'VIEWER';
    return (
      <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
        {displayRole === 'ADMIN' ? 'Admin' : displayRole === 'STAFF' ? 'Staff' : 'Viewer'}
      </span>
    );
  }

  return (
    <form action={updateRoleAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border-0 px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-sky-500/30 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200"
      >
        <option value="ADMIN">Admin</option>
        <option value="STAFF">Staff</option>
        <option value="VIEWER">Viewer</option>
      </select>
    </form>
  );
}

