import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';
import { ArrowLeft, ExternalLink, ShoppingCart } from 'lucide-react';

import { requireActivePractice } from '@/lib/auth';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';

import { PracticeSupplierForm } from '../_components/practice-supplier-form';
import { SupplierStatusBadges } from '../_components/supplier-status-badges';
import { DeleteSupplierButton } from './_components/delete-supplier-button';
import { getPracticeSupplierDisplay } from '../_utils/supplier-display';

interface SupplierDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const { id } = await params;
  const { session, practiceId } = await requireActivePractice();

  // Fetch practice supplier with global supplier info
  const repository = getPracticeSupplierRepository();
  let practiceSupplier;
  
  try {
    practiceSupplier = await repository.findPracticeSupplierById(id, practiceId);
  } catch (error) {
    notFound();
  }

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const { name: displayName } = getPracticeSupplierDisplay(practiceSupplier);
  const supplier = practiceSupplier.globalSupplier;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/suppliers"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {displayName}
              </h1>
              <SupplierStatusBadges
                isPreferred={practiceSupplier.isPreferred}
                isBlocked={practiceSupplier.isBlocked}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {practiceSupplier.customLabel && supplier?.name && (
                <p className="text-slate-500 dark:text-slate-500">
                  Also known as: {supplier.name}
                </p>
              )}
              {practiceSupplier.accountNumber && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  Account: {practiceSupplier.accountNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {!practiceSupplier.isBlocked && (
          <Link
            href={`/orders/new?supplierId=${practiceSupplier.id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 hover:shadow dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Create Order
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <h2 className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">
              Contact Details
            </h2>
            <dl className="space-y-4 text-sm">
              {supplier?.name && (
                <div>
                  <dt className="mb-1 font-medium text-slate-600 dark:text-slate-400">Name</dt>
                  <dd className="text-slate-900 dark:text-slate-100">{supplier.name}</dd>
                </div>
              )}

              {supplier?.email && (
                <div>
                  <dt className="mb-1 font-medium text-slate-600 dark:text-slate-400">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      {supplier.email}
                    </a>
                  </dd>
                </div>
              )}

              {supplier?.phone && (
                <div>
                  <dt className="mb-1 font-medium text-slate-600 dark:text-slate-400">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      {supplier.phone}
                    </a>
                  </dd>
                </div>
              )}

              {supplier?.website && (
                <div>
                  <dt className="mb-1 font-medium text-slate-600 dark:text-slate-400">Website</dt>
                  <dd>
                    <a
                      href={supplier.website}
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {supplier.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}

              {supplier?.notes && (
                <div>
                  <dt className="mb-1 font-medium text-slate-600 dark:text-slate-400">General Notes</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{supplier.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Account Information */}
          {practiceSupplier.orderingNotes && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
              <h2 className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">
                Ordering & Delivery Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {practiceSupplier.orderingNotes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {canManage ? (
            <>
              {/* Edit Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  Edit Settings
                </h2>
                <PracticeSupplierForm practiceSupplier={practiceSupplier} />
              </div>

              {/* Danger Zone */}
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-900/20">
                <h2 className="mb-2 text-lg font-semibold text-rose-900 dark:text-rose-400">
                  Remove Supplier
                </h2>
                <p className="mb-4 text-sm text-rose-700 dark:text-rose-300">
                  This will remove the supplier from your practice. Your existing orders and item records will be preserved, but you won&apos;t be able to create new orders with this supplier unless you add them back.
                </p>
                <DeleteSupplierButton supplierId={practiceSupplier.id} />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
              <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">View Only</h2>
              <p>
                You can view supplier details, but only staff and administrators can modify settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

