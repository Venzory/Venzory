import { redirect } from 'next/navigation';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { InviteUserForm } from './_components/invite-user-form';
import { PracticeSettingsForm } from './_components/practice-settings-form';
import { RemoveUserButton } from './_components/remove-user-button';
import {
  updatePracticeSettingsInlineAction,
  updateUserRoleInlineAction,
  removeUserAction,
  cancelInviteAction,
} from './actions';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const activePracticeId = session.user.activePracticeId;

  if (!activePracticeId) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-300">
            Manage your practice settings, users, and preferences.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">No active practice found.</p>
        </div>
      </div>
    );
  }

  // Build request context
  const ctx = buildRequestContextFromSession(session);

  // Check if user is admin
  const isAdmin = hasRole({
    memberships: session.user.memberships,
    practiceId: activePracticeId,
    minimumRole: PracticeRole.ADMIN,
  });

  // Fetch practice details with members using SettingsService
  const practice = await getSettingsService().getPracticeSettings(ctx);
  const users = await getSettingsService().getPracticeUsers(ctx);
  const invites = await getSettingsService().getPendingInvites(ctx);

  // Transform practice data to match the previous structure (if needed)
  const practiceWithMembers = {
    ...practice,
    users,
    invites,
    _count: { users: users.length },
  };

  // Alias for backward compatibility
  const practiceData = practiceWithMembers;
  const pendingInvites = invites;

  // Continue with existing code structure...
  const members = practiceWithMembers.users || [];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Manage your practice settings, users, and preferences.
        </p>
      </div>

      {/* Practice Settings Section - Only for admins */}
      {isAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Practice Settings</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <PracticeSettingsForm practice={practice} />
          </div>
        </div>
      )}

      {/* Team Members Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Team Members</h2>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {users.length} {users.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((membership: any) => (
                  <tr key={membership.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {membership.user.name || '-'}
                      {membership.user.id === session.user.id && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">(You)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {membership.user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isAdmin && membership.user.id !== session.user.id ? (
                        <form action={updateUserRoleInlineAction} className="inline">
                          <input type="hidden" name="userId" value={membership.user.id} />
                          <select
                            name="role"
                            defaultValue={membership.role}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            className="rounded-full border-0 px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-sky-500/30 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="STAFF">Staff</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </form>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            membership.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : membership.role === 'STAFF'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                          }`}
                        >
                          {membership.role.charAt(0) + membership.role.slice(1).toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          membership.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : membership.status === 'INVITED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400'
                        }`}
                      >
                        {membership.status.charAt(0) + membership.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {membership.user.id !== session.user.id && (
                          <RemoveUserButton 
                            userId={membership.user.id} 
                            userName={membership.user.name || membership.user.email}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Invites Section - Only for admins */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Pending Invitations</h2>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {pendingInvites.map((invite: any) => (
                    <tr key={invite.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {invite.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <form action={cancelInviteAction.bind(null, invite.id)} className="inline">
                          <button
                            type="submit"
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Section - Only for admins */}
      {isAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Invite User</h2>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <InviteUserForm practiceId={activePracticeId} practiceName={practice.name} />
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Only administrators can invite new users to the practice.
          </p>
        </div>
      )}
    </div>
  );
}

