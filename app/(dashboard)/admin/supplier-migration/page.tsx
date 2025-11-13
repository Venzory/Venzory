import { PracticeRole } from '@prisma/client';
import { ArrowRight, CheckCircle2, Database, XCircle } from 'lucide-react';

import { requireActivePractice } from '@/lib/auth';
import { hasRole } from '@/lib/rbac';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';

export default async function SupplierMigrationPage() {
  const { session, practiceId } = await requireActivePractice();

  // Check if user is admin
  const isAdmin = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.ADMIN,
  });

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Access Denied</h1>
        <p className="text-sm text-slate-300">
          Only administrators can access this page.
        </p>
      </div>
    );
  }

  // Fetch statistics using SettingsService
  const ctx = buildRequestContextFromSession(session);
  const stats = await getSettingsService().getSupplierMigrationStats(ctx);

  const {
    totalSuppliers,
    totalGlobalSuppliers,
    totalPracticeSuppliers,
    migratedPracticeSuppliers,
    practices,
    supplierDetails,
    practiceSupplierLinks,
  } = stats;

  // Map for quick lookup
  const linksByOriginalId = new Map(
    practiceSupplierLinks.map(link => [link.migratedFromSupplierId!, link])
  );

  const migrationComplete = migratedPracticeSuppliers === totalSuppliers && totalSuppliers > 0;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Supplier Migration Status
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          View the migration status from legacy Supplier model to GlobalSupplier + PracticeSupplier architecture.
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Legacy Suppliers"
          value={totalSuppliers}
          icon={Database}
          description="Old model (practice-scoped)"
        />
        <StatCard
          title="Global Suppliers"
          value={totalGlobalSuppliers}
          icon={Database}
          description="New global supplier records"
        />
        <StatCard
          title="Practice Links"
          value={totalPracticeSuppliers}
          icon={ArrowRight}
          description="Practice-supplier connections"
        />
        <StatCard
          title="Migrated"
          value={migratedPracticeSuppliers}
          icon={migrationComplete ? CheckCircle2 : XCircle}
          description={`${migratedPracticeSuppliers} of ${totalSuppliers} migrated`}
          highlight={migrationComplete}
        />
      </div>

      {/* Migration Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
          Migration Status
        </h2>
        
        {migrationComplete ? (
          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Migration Complete
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                All {totalSuppliers} supplier(s) have been migrated to the new architecture.
                Each has a corresponding GlobalSupplier and PracticeSupplier link.
              </p>
            </div>
          </div>
        ) : totalPracticeSuppliers === 0 ? (
          <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <XCircle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                Migration Not Started
              </p>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                No PracticeSupplier records found with migration tracking.
                Run the backfill script to migrate existing suppliers.
              </p>
              <div className="mt-3 rounded bg-slate-900 p-3 font-mono text-xs text-slate-100">
                npm run backfill:suppliers
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <Database className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Partial Migration
              </p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                {migratedPracticeSuppliers} of {totalSuppliers} supplier(s) have been migrated.
                {totalSuppliers - migratedPracticeSuppliers} remaining.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-white">Quick Stats</h3>
          <ul className="space-y-1 text-slate-600 dark:text-slate-400">
            <li>• Total practices: {practices}</li>
            <li>• Legacy suppliers: {totalSuppliers}</li>
            <li>• Global suppliers: {totalGlobalSuppliers}</li>
            <li>• Practice-supplier links: {totalPracticeSuppliers}</li>
            <li>• Links with migration tracking: {migratedPracticeSuppliers}</li>
          </ul>
        </div>
      </div>

      {/* Data Comparison Table */}
      {supplierDetails.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="border-b border-slate-200 p-6 dark:border-slate-800">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Supplier Comparison
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Side-by-side comparison of legacy and new supplier architecture
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Practice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Legacy Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    New Architecture
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {supplierDetails.map((supplier) => {
                  const link = linksByOriginalId.get(supplier.id);
                  const isMigrated = !!link;

                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {supplier.practice.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {supplier.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          ID: {supplier.id.slice(0, 12)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {supplier.email && <div>{supplier.email}</div>}
                        {supplier.phone && <div>{supplier.phone}</div>}
                        {!supplier.email && !supplier.phone && <div className="text-slate-400">—</div>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isMigrated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Migrated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isMigrated ? (
                          <div className="text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {link.globalSupplier.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Global ID: {link.globalSupplier.id.slice(0, 12)}...
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Link ID: {link.id.slice(0, 12)}...
                            </div>
                            {link.isPreferred && (
                              <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Preferred
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 dark:text-slate-600">
                            Not migrated yet
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: any;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-6 shadow-sm ${
      highlight
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${
            highlight
              ? 'text-green-600 dark:text-green-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}>
            {title}
          </p>
          <p className={`mt-2 text-3xl font-bold ${
            highlight
              ? 'text-green-900 dark:text-green-100'
              : 'text-slate-900 dark:text-white'
          }`}>
            {value}
          </p>
          <p className={`mt-1 text-xs ${
            highlight
              ? 'text-green-700 dark:text-green-300'
              : 'text-slate-500 dark:text-slate-400'
          }`}>
            {description}
          </p>
        </div>
        <Icon className={`h-8 w-8 ${
          highlight
            ? 'text-green-600 dark:text-green-400'
            : 'text-slate-400 dark:text-slate-600'
        }`} />
      </div>
    </div>
  );
}

