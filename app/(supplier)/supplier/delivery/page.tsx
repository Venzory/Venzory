import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChannelSettings } from './_components/channel-settings';
import { Truck, Mail, FileText, Webhook, Settings } from 'lucide-react';

export default async function DeliverySettingsPage() {
  const session = await auth();
  const supplierContext = await getSupplierContext(session?.user?.email);

  if (!supplierContext) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
      </div>
    );
  }

  // Mock delivery settings - in real implementation, fetch from database
  const deliverySettings = {
    email: {
      enabled: true,
      recipients: ['orders@example.com'],
      format: 'detailed',
    },
    pdf: {
      enabled: false,
      template: 'standard',
    },
    api: {
      enabled: false,
      endpoint: null,
      apiKey: null,
    },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/20">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <PageHeader
          title="Delivery Settings"
          subtitle="Configure how you receive orders and catalog updates"
        />
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-800/50 dark:bg-teal-900/20">
        <div className="flex items-start gap-4">
          <Settings className="mt-0.5 h-5 w-5 text-teal-600 dark:text-teal-400" />
          <div>
            <h3 className="font-medium text-teal-900 dark:text-teal-200">
              Configure Your Delivery Channels
            </h3>
            <p className="mt-1 text-sm text-teal-700 dark:text-teal-300">
              Choose how you want to receive orders from practices using Venzory. You can enable multiple channels for redundancy.
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Channels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Email Channel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Email</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive orders via email</p>
              </div>
            </div>
            <ChannelToggle enabled={deliverySettings.email.enabled} channel="email" />
          </div>
          {deliverySettings.email.enabled && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Recipients</label>
                <p className="text-sm text-slate-900 dark:text-white">
                  {deliverySettings.email.recipients.join(', ')}
                </p>
              </div>
              <button className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
                Edit Settings
              </button>
            </div>
          )}
        </div>

        {/* PDF Channel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/30">
                <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">PDF Export</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Download PDF order forms</p>
              </div>
            </div>
            <ChannelToggle enabled={deliverySettings.pdf.enabled} channel="pdf" />
          </div>
          {deliverySettings.pdf.enabled && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Template</label>
                <p className="text-sm text-slate-900 dark:text-white capitalize">
                  {deliverySettings.pdf.template}
                </p>
              </div>
              <button className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
                Edit Settings
              </button>
            </div>
          )}
        </div>

        {/* API Channel - Coming Soon */}
        <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="absolute right-4 top-4">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Coming Soon
            </span>
          </div>
          <div className="flex items-center gap-3 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
              <Webhook className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">API Integration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time webhook delivery</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connect your systems directly via webhook for real-time order delivery and inventory sync.
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Settings */}
      <ChannelSettings />
    </div>
  );
}

function ChannelToggle({ enabled, channel }: { enabled: boolean; channel: string }) {
  return (
    <button
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

