import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services';
import { hasRole } from '@/lib/rbac';

import { DeleteTemplateButton } from './_components/delete-template-button';

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
              href="/orders"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              ← Back to Orders
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-white">Order Templates</h1>
          <p className="text-sm text-slate-300">
            Create reusable order templates for quick ordering.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/orders/templates/new"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            New Template
          </Link>
        ) : null}
      </div>

      {!canManage ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
        <div className="space-y-3">
          <p className="text-lg font-medium text-slate-200">No templates yet</p>
          <p className="text-sm text-slate-400">
            Create your first order template to streamline ordering.
          </p>
          {canManage ? (
            <Link
              href="/orders/templates/new"
              className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Create Template
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 transition hover:border-slate-700">
      <div className="space-y-2">
        <Link
          href={`/orders/templates/${template.id}`}
          className="block text-lg font-semibold text-white transition hover:text-sky-400"
        >
          {template.name}
        </Link>
        {template.description ? (
          <p className="text-sm text-slate-400 line-clamp-2">
            {template.description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-300">
            {template.items.length}
          </span>
          <span>{template.items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div className="h-1 w-1 rounded-full bg-slate-600" />
        <div>
          Created {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Link
          href={`/orders/templates/${template.id}`}
          className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center text-sm font-medium text-slate-300 transition hover:bg-slate-800"
        >
          View
        </Link>
        {canManage ? (
          <>
            <Link
              href={`/orders/templates/${template.id}/preview`}
              className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Create Order
            </Link>
            <DeleteTemplateButton templateId={template.id} />
          </>
        ) : (
          <Link
            href={`/orders/templates/${template.id}/preview`}
            className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            View Details
          </Link>
        )}
      </div>
    </div>
  );
}



