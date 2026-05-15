import { DATA_RETENTION_POLICIES, type DataRetentionPolicy } from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

import { acknowledgePrivacyNoticeAction } from '../actions'

interface LatestAcknowledgement {
  acknowledgedAt: string | null
  recordedAt: string | null
}

async function getLatestAcknowledgement(): Promise<LatestAcknowledgement> {
  try {
    const supabase = await getServerSupabase()
    const { data: businessId, error: businessError } = await supabase.rpc('current_business_id')
    if (businessError || !businessId) return { acknowledgedAt: null, recordedAt: null }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('created_at, after')
      .eq('business_id', businessId)
      .eq('action', 'privacy.notice_acknowledged')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return { acknowledgedAt: null, recordedAt: null }

    const after = data.after
    const acknowledgedAt =
      typeof after === 'object' &&
      after !== null &&
      'acknowledged_at' in after &&
      typeof after.acknowledged_at === 'string'
        ? after.acknowledged_at
        : null

    return {
      acknowledgedAt,
      recordedAt: typeof data.created_at === 'string' ? data.created_at : null,
    }
  } catch {
    return { acknowledgedAt: null, recordedAt: null }
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Not recorded yet'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function RetentionRow({ policy }: { policy: DataRetentionPolicy }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{policy.piiSurface}</h3>
          <p className="mt-1 text-[12px] text-ink-500">
            {policy.module ? `Module: ${policy.module}` : 'Core TD POS record'}
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-800">
          {policy.category}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-[13px] md:grid-cols-3">
        <div>
          <dt className="font-semibold text-ink-900">Local device</dt>
          <dd className="mt-1 text-ink-600">{policy.localRetention}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-900">Server</dt>
          <dd className="mt-1 text-ink-600">{policy.serverRetention}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-900">Disabled module cleanup</dt>
          <dd className="mt-1 text-ink-600">{policy.disabledModuleCleanup}</dd>
        </div>
      </dl>
    </div>
  )
}

export default async function DashboardPrivacyPage() {
  const acknowledgement = await getLatestAcknowledgement()

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Privacy Notice
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-ink-900">Tenant data posture</h1>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              TD POS keeps sales and inventory durable for offline work while optional
              customer-facing modules stay hidden and cleared when disabled. This dashboard copy is
              a v0.9 scaffold for operational review and legal refinement.
            </p>
          </div>
          <form action={acknowledgePrivacyNoticeAction}>
            <button
              type="submit"
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              Acknowledge notice
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-teal-800">Status</p>
          <p className="mt-2 text-lg font-semibold text-ink-900">
            {acknowledgement.acknowledgedAt ? 'Acknowledged' : 'Pending'}
          </p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
            Acknowledged at
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-900">
            {formatDate(acknowledgement.acknowledgedAt)}
          </p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
            Audit recorded
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-900">
            {formatDate(acknowledgement.recordedAt)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Retention table</h2>
          <p className="mt-1 text-sm text-ink-600">
            Shared with the mobile app from `@tdpos/shared`, so mobile and web review the same
            policy rows.
          </p>
        </div>
        <div className="space-y-3">
          {DATA_RETENTION_POLICIES.map((policy) => (
            <RetentionRow key={policy.id} policy={policy} />
          ))}
        </div>
      </section>
    </div>
  )
}
