import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';

import { DeleteTemplateButton } from './_components/delete-template-button';
import { QuickOrderButton } from '../_components/quick-order-button';

export default async function TemplatesPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  const templates = await getOrderService().findTemplates(ctx);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/app/orders"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Orders
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Order Templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Create reusable order templates for quick ordering. Quick order creates one draft per supplier.
          </p>
        </div>
        {canManage ? (
          <Link href="/app/orders/templates/new">
            <Button variant="primary" size="md">
              New Template
            </Button>
          </Link>
        ) : null}
      </div>

      {!canManage ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          You can view templates but need staff permissions to create or edit them.
        </div>
      ) : null}

      <TemplatesList templates={templates} canManage={canManage} />
    </section>
  );
}

function TemplatesList({
  templates,
  canManage,
}: {
  templates: any[];
  canManage: boolean;
}) {
  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
        <div className="space-y-3">
          <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No templates yet</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create your first order template to streamline ordering.
          </p>
          {canManage ? (
            <Link href="/app/orders/templates/new">
              <Button variant="primary" size="md">
                Create Template
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          canManage={canManage}
        />
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  canManage,
}: {
  template: any;
  canManage: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div className="space-y-2">
        <Link
          href={`/orders/templates/${template.id}`}
          className="block text-lg font-semibold text-slate-900 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-400"
        >
          {template.name}
        </Link>
        {template.description ? (
          <p className="text-sm text-slate-600 line-clamp-2 dark:text-slate-400">
            {template.description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {template.items.length}
          </span>
          <span>{template.items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        <div>
          Created {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Link href={`/orders/templates/${template.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            View
          </Button>
        </Link>
        {canManage ? (
          <>
            <QuickOrderButton
              templateId={template.id}
              templateName={template.name}
              size="sm"
              variant="primary"
              className="flex-1"
            />
            <Link href={`/orders/templates/${template.id}/preview`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">
                Review & create
              </Button>
            </Link>
            <DeleteTemplateButton templateId={template.id} />
          </>
        ) : (
          <Link href={`/orders/templates/${template.id}/preview`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}



