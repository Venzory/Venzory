import { redirect } from 'next/navigation';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { InviteUserForm } from './_components/invite-user-form';
import { PracticeSettingsForm } from './_components/practice-settings-form';
import { RemoveUserButton } from './_components/remove-user-button';
import { UserRoleSelector } from './_components/user-role-selector';
import {
  updatePracticeSettingsInlineAction,
  updateUserRoleInlineAction,
  removeUserAction,
  cancelInviteAction,
} from './actions';

// Helper to safely format role labels
function formatRoleLabel(role: string | null | undefined): string {
  if (!role || typeof role !== 'string') return 'Viewer';
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN') return 'Admin';
  if (normalized === 'STAFF') return 'Staff';
  if (normalized === 'VIEWER') return 'Viewer';
  return 'Viewer'; // Default fallback
}

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

  // Defensive defaults for memberships
  const memberships = session.user.memberships ?? [];

  // Check if user is admin (treat missing membership as no privileges)
  const isAdmin = hasRole({
    memberships,
    practiceId: activePracticeId,
    minimumRole: PracticeRole.ADMIN,
  });

  // Fetch practice details with null-safe error handling
  let practice: any = null;
  let users: any[] = [];
  let invites: any[] = [];
  let fetchError: string | null = null;

  try {
    const ctx = buildRequestContextFromSession(session);
    
    // Fetch data with individual try/catch for partial failures
    try {
      practice = await getSettingsService().getPracticeSettings(ctx);
    } catch (err) {
      console.error('[Settings] Failed to fetch practice settings:', err);
      fetchError = 'Failed to load practice settings';
    }

    try {
      const rawUsers = await getSettingsService().getPracticeUsers(ctx);
      users = Array.isArray(rawUsers) ? rawUsers : [];
    } catch (err) {
      console.error('[Settings] Failed to fetch practice users:', err);
      users = [];
    }

    try {
      const rawInvites = await getSettingsService().getPendingInvites(ctx);
      invites = Array.isArray(rawInvites) ? rawInvites : [];
    } catch (err) {
      console.error('[Settings] Failed to fetch pending invites:', err);
      invites = [];
    }
  } catch (err) {
    console.error('[Settings] Failed to build request context:', err);
    fetchError = 'Unable to load settings';
  }

  // If we couldn't load practice at all, show error state
  if (!practice && fetchError) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Manage your practice settings, users, and preferences.
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20">
          <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{fetchError}</p>
          <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  // Defensive defaults for practice metadata
  const practiceName = practice?.name ?? 'your practice';
  const pendingInvites = invites;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Manage your practice settings, users, and preferences.
        </p>
      </div>

      {/* Practice Settings Section - Only for admins */}
      {isAdmin && practice && (
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
                {users.map((membership: any) => {
                  // Safe guards for partial membership data
                  const user = membership?.user ?? {};
                  const userId = user.id ?? '';
                  const userName = user.name || '-';
                  const userEmail = user.email || '-';
                  const membershipRole = membership?.role ?? 'VIEWER';
                  const membershipStatus = membership?.status ?? 'ACTIVE';
                  const membershipId = membership?.id ?? `unknown-${Math.random()}`;

                  return (
                    <tr key={membershipId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {userName}
                        {userId && userId === session.user.id && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">(You)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isAdmin && userId && userId !== session.user.id ? (
                          <UserRoleSelector
                            userId={userId}
                            currentRole={membershipRole}
                            updateRoleAction={updateUserRoleInlineAction}
                          />
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              membershipRole === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : membershipRole === 'STAFF'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                            }`}
                          >
                            {formatRoleLabel(membershipRole)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            membershipStatus === 'ACTIVE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : membershipStatus === 'INVITED'
                                ? 'bg-amber-100 text-amber-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400'
                          }`}
                        >
                          {membershipStatus ? membershipStatus.charAt(0) + membershipStatus.slice(1).toLowerCase() : 'Unknown'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {userId && userId !== session.user.id && (
                            <RemoveUserButton 
                              userId={userId} 
                              userName={userName !== '-' ? userName : userEmail}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
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
                  {pendingInvites.map((invite: any) => {
                    // Safe guards for partial invite data
                    const inviteId = invite?.id ?? `unknown-${Math.random()}`;
                    const inviteEmail = invite?.email ?? '-';
                    const inviteRole = invite?.role ?? 'VIEWER';
                    const createdAt = invite?.createdAt;
                    const expiresAt = invite?.expiresAt;

                    return (
                      <tr key={inviteId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {inviteEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {formatRoleLabel(inviteRole)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {createdAt ? new Date(createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {expiresAt ? new Date(expiresAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {inviteId && inviteId.startsWith('unknown-') ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <form action={cancelInviteAction.bind(null, inviteId)} className="inline">
                              <button
                                type="submit"
                                className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
            <InviteUserForm practiceId={activePracticeId} practiceName={practiceName} />
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

