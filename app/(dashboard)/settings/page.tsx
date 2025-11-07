import { redirect } from 'next/navigation';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';
import { InviteUserForm } from './_components/invite-user-form';
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

  // Check if user is admin
  const isAdmin = hasRole({
    memberships: session.user.memberships,
    practiceId: activePracticeId,
    minimumRole: PracticeRole.ADMIN,
  });

  // Fetch practice details with members
  const practice = await prisma.practice.findUnique({
    where: { id: activePracticeId },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!practice) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-300">
            Manage your practice settings, users, and preferences.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Practice not found.</p>
        </div>
      </div>
    );
  }

  // Fetch pending invites if admin
  const pendingInvites = isAdmin
    ? await prisma.userInvite.findMany({
        where: {
          practiceId: activePracticeId,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

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
            <form action={updatePracticeSettingsInlineAction} className="space-y-6">
              {/* Practice Name */}
              <div className="space-y-2">
                <label htmlFor="practice-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Practice Name
                </label>
                <input
                  id="practice-name"
                  name="name"
                  type="text"
                  defaultValue={practice.name}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This name appears in invitations and throughout the application.
                </p>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Address</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="street" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Street
                    </label>
                    <input
                      id="street"
                      name="street"
                      type="text"
                      defaultValue={practice.street ?? ''}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      defaultValue={practice.city ?? ''}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="postalCode" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Postal Code
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      defaultValue={practice.postalCode ?? ''}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="country" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Country
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      defaultValue={practice.country ?? ''}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Contact Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contactEmail" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Contact Email
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      defaultValue={practice.contactEmail ?? ''}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contactPhone" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Contact Phone
                    </label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      defaultValue={practice.contactPhone ?? ''}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <label htmlFor="logoUrl" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Logo URL
                </label>
                <input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  defaultValue={practice.logoUrl ?? ''}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the URL of your practice logo image.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                Save Practice Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Team Members Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Team Members</h2>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {practice.users.length} {practice.users.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
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
                {practice.users.map((membership) => (
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
                              ? 'bg-purple-900/30 text-purple-300'
                              : membership.role === 'STAFF'
                                ? 'bg-blue-900/30 text-blue-300'
                                : 'bg-slate-800/30 text-slate-300'
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
                            ? 'bg-green-900/30 text-green-300'
                            : membership.status === 'INVITED'
                              ? 'bg-yellow-900/30 text-yellow-300'
                              : 'bg-slate-800/30 text-slate-400'
                        }`}
                      >
                        {membership.status.charAt(0) + membership.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {membership.user.id !== session.user.id && (
                          <form action={removeUserAction.bind(null, membership.user.id)} className="inline">
                            <button
                              type="submit"
                              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-medium"
                              onClick={(e) => {
                                if (!confirm('Are you sure you want to remove this user from the practice?')) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              Remove
                            </button>
                          </form>
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
                <thead className="bg-slate-50 dark:bg-slate-800/50">
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
                  {pendingInvites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {invite.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex rounded-full bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-300">
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
