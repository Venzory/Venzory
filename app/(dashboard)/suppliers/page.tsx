import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';

import { PracticeSupplierList } from './_components/practice-supplier-list';

export default async function SuppliersPage() {
  const { session, practiceId } = await requireActivePractice();

  const repository = getPracticeSupplierRepository();

  // Fetch practice suppliers with global supplier info
  const practiceSuppliers = await repository.findPracticeSuppliers(
    practiceId,
    {
      includeBlocked: true, // Show all suppliers, including blocked ones
    }
  );

  // Fetch all global suppliers for the "Add Supplier" modal
  const globalSuppliers = await repository.findGlobalSuppliers();

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Suppliers
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Manage your practice's supplier relationships, account details, and ordering preferences.
        </p>
      </div>

      <PracticeSupplierList 
        suppliers={practiceSuppliers} 
        globalSuppliers={globalSuppliers}
        canManage={canManage} 
      />
    </section>
  );
}
