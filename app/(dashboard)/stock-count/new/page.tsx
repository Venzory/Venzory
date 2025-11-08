import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NewCountForm } from './_components/new-count-form';

export const metadata = {
  title: 'New Stock Count - Remcura',
};

export default async function NewCountPage() {
  const { practiceId } = await requireActivePractice();

  // Fetch locations for form dropdown
  const locations = await prisma.location.findMany({
    where: { practiceId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });

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

