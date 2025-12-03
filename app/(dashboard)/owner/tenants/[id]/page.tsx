import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  
  if (!isPlatformOwner(session?.user?.email)) {
    redirect('/access-denied');
  }

  const practiceData = await prisma.practice.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      },
      locations: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
        }
      },
      _count: {
        select: {
          users: true,
          locations: true,
        }
      }
    }
  });
  
  if (!practiceData) {
    notFound();
  }

  // Transform the data for display
  const practice = {
    ...practiceData,
    status: practiceData.onboardingCompletedAt ? 'Active' : 'Onboarding',
    userCount: practiceData._count.users,
    locationCount: practiceData._count.locations,
    memberships: practiceData.users.map(u => ({
      id: u.id,
      role: u.role,
      user: u.user,
    })),
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/owner/tenants"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-owner-light dark:bg-owner/20">
            <Building2 className="h-5 w-5 text-owner dark:text-owner" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{practice.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{practice.slug}</p>
          </div>
          <Badge variant={practice.status === 'Active' ? 'success' : 'warning'} className="ml-auto">
            {practice.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Practice Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Practice Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Name</dt>
              <dd className="text-slate-900 dark:text-white">{practice.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Slug</dt>
              <dd className="text-slate-900 dark:text-white font-mono text-sm">{practice.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Created</dt>
              <dd className="text-slate-900 dark:text-white">{format(practice.createdAt, 'PPP')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</dt>
              <dd>
                <Badge variant={practice.status === 'Active' ? 'success' : 'warning'}>
                  {practice.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{practice.userCount}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Users</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{practice.locationCount}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Locations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      {practice.memberships && practice.memberships.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Team Members</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {practice.memberships.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{member.user.name || 'Unnamed User'}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{member.user.email}</div>
                </div>
                <Badge variant="outline">{member.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locations */}
      {practice.locations && practice.locations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Locations</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {practice.locations.map((location) => (
              <div key={location.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{location.name}</div>
                  {location.code && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">{location.code}</div>
                  )}
                  {location.description && (
                    <div className="text-sm text-slate-500 dark:text-slate-400">{location.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

