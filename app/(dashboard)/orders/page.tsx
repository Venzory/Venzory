import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { hasRole } from '@/lib/rbac';

export default async function OrdersPage() {
  const { session, practiceId } = await requireActivePractice();

  const canPlaceOrders = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Orders</h1>
        <p className="text-sm text-slate-300">
          Track purchase orders from draft through receipt across suppliers.
        </p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        {canPlaceOrders ? (
          <div>
            <p className="font-medium text-white">Coming Soon</p>
            <p className="mt-2">
              Order workflows, status management, and receipts will be implemented in the next
              development phase. You will be able to create, edit, and manage purchase orders.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-white">View Only Access</p>
            <p className="mt-2">
              Orders are view-only for your role. Only staff members and administrators can create
              and manage purchase orders. Contact your practice administrator if you need elevated
              access.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

