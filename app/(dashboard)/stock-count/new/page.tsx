import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { NewCountForm } from './_components/new-count-form';

export const metadata = {
  title: 'New Stock Count - Remcura',
};

export default async function NewCountPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Fetch locations using InventoryService
  const locations = await getInventoryService().getLocations(ctx);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          New Stock Count
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Start a new count session to verify inventory levels
        </p>
      </div>

      <NewCountForm locations={locations} />
    </div>
  );
}


