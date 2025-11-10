import { PracticeRole } from '@prisma/client';
import { MapPin } from 'lucide-react';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';

import { CreateLocationForm } from './_components/create-location-form';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteLocationAction, upsertLocationInlineAction } from '../inventory/actions';

export default async function LocationsPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  const locations = await getInventoryService().getLocationsWithInventory(ctx);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Locations</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Organise stock by physical location and understand how items are distributed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <LocationList locations={locations} canManage={canManage} />
        {canManage ? (
          <CreateLocationForm
            locations={locations.map((location) => ({ id: location.id, name: location.name }))}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">View only</h2>
            <p className="mt-2">
              Location hierarchy is managed by staff. Request access to reorganise storage areas or rooms.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function LocationList({
  locations,
  canManage,
}: {
  locations: any;
  canManage: boolean;
}) {
  if (locations.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No locations yet"
        description={
          canManage
            ? 'Add your first location to organize stock by storage area or room.'
            : 'Locations will be set up by staff members to organize inventory.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {locations.map((location: any) => {
        const totalQuantity = location.inventory.reduce((sum: number, row: any) => sum + row.quantity, 0);

        return (
          <div key={location.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{location.name}</h2>
                  {location.code ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {location.code}
                    </span>
                  ) : null}
                </div>
                {location.parent ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Parent: <span className="text-slate-900 dark:text-slate-200">{location.parent.name}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Top level location</p>
                )}
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total quantity recorded: <span className="text-slate-900 dark:text-slate-200">{totalQuantity}</span>
                </p>
                {location.description ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300">{location.description}</p>
                ) : null}
                {location.children.length ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Sub-locations: {location.children.map((child: any) => child.name).join(', ')}
                  </p>
                ) : null}
              </div>

              {canManage ? (
                <form action={deleteLocationAction.bind(null, location.id)} className="self-start">
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-rose-500 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-500 dark:hover:text-rose-300"
                  >
                    Delete
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Items on hand</h3>
                {location.inventory.length ? (
                  <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {location.inventory.map((row: any) => (
                      <li key={row.itemId} className="flex items-center justify-between">
                        <span>{row.item.name}</span>
                        <span className="text-slate-900 dark:text-slate-100">{row.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No recorded stock.</p>
                )}
              </div>

              {canManage ? (
                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                  <summary className="cursor-pointer text-sm font-medium text-slate-900 dark:text-slate-200">Edit location</summary>
                  <form action={upsertLocationInlineAction} className="mt-3 space-y-3">
                    <input type="hidden" name="locationId" value={location.id} />
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 dark:text-slate-400" htmlFor={`location-name-${location.id}`}>
                        Name
                      </label>
                      <input
                        id={`location-name-${location.id}`}
                        name="name"
                        defaultValue={location.name}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-600 dark:text-slate-400" htmlFor={`location-code-${location.id}`}>
                          Code
                        </label>
                        <input
                          id={`location-code-${location.id}`}
                          name="code"
                          defaultValue={location.code ?? ''}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-600 dark:text-slate-400" htmlFor={`location-parent-${location.id}`}>
                          Parent
                        </label>
                        <select
                          id={`location-parent-${location.id}`}
                          name="parentId"
                          defaultValue={location.parent?.id ?? 'none'}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="none">Top level</option>
                          {locations
                            .filter((candidate: any) => candidate.id !== location.id)
                            .map((candidate: any) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 dark:text-slate-400" htmlFor={`location-description-${location.id}`}>
                        Description
                      </label>
                      <textarea
                        id={`location-description-${location.id}`}
                        name="description"
                        rows={2}
                        defaultValue={location.description ?? ''}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      Save changes
                    </button>
                  </form>
                </details>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}


