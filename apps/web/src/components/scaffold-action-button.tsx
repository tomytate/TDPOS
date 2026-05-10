'use client'

import { useActionState } from 'react'

import type { ScaffoldActionResult, ScaffoldActionState } from '@/app/(dashboard)/actions'

type ScaffoldAction = (
  previousState: ScaffoldActionState,
  formData: FormData,
) => Promise<ScaffoldActionResult>

interface ScaffoldActionButtonProps {
  action: ScaffoldAction
  label: string
  fields?: ScaffoldField[]
}

function toneFor(state: ScaffoldActionResult): string {
  if (state.ok) return 'border-success-500/40 bg-success-500/10 text-success-600'
  if (state.reason === 'tier_locked') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (state.reason === 'scaffold_only') return 'border-teal-100 bg-teal-50 text-teal-700'
  if (state.reason === 'invalid_input') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-danger-500/40 bg-danger-500/10 text-danger-600'
}

type ScaffoldField =
  | {
      kind: 'text' | 'number'
      name: string
      label: string
      placeholder?: string
      defaultValue?: string
      required?: boolean
    }
  | {
      kind: 'select'
      name: string
      label: string
      defaultValue?: string
      options: Array<{ label: string; value: string }>
    }
  | {
      kind: 'checkbox'
      name: string
      label: string
      defaultChecked?: boolean
    }

function ScaffoldFieldInput({ field }: { field: ScaffoldField }) {
  if (field.kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
        <input
          name={field.name}
          type="checkbox"
          defaultChecked={field.defaultChecked}
          className="size-4 rounded border-ink-300 text-teal-700"
        />
        {field.label}
      </label>
    )
  }

  if (field.kind === 'select') {
    return (
      <label className="flex min-w-[10rem] flex-col gap-1 text-[12px] font-semibold text-ink-600">
        {field.label}
        <select
          name={field.name}
          defaultValue={field.defaultValue}
          className="rounded-md border border-ink-200 bg-white px-2 py-1.5 text-[13px] font-medium text-ink-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="flex min-w-[10rem] flex-col gap-1 text-[12px] font-semibold text-ink-600">
      {field.label}
      <input
        name={field.name}
        type={field.kind}
        placeholder={field.placeholder}
        defaultValue={field.defaultValue}
        required={field.required}
        className="rounded-md border border-ink-200 bg-white px-2 py-1.5 text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  )
}

export function ScaffoldActionButton({ action, label, fields = [] }: ScaffoldActionButtonProps) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      {fields.length > 0 ? (
        <div className="grid w-full grid-cols-1 gap-2 rounded-lg border border-ink-200 bg-white p-3 sm:grid-cols-2">
          {fields.map((field) => (
            <ScaffoldFieldInput key={field.name} field={field} />
          ))}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-teal-700 bg-teal-700 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-wait disabled:border-ink-300 disabled:bg-ink-200 disabled:text-ink-500"
      >
        {isPending ? 'Checking access…' : label}
      </button>
      {state ? (
        <p
          role="status"
          aria-live="polite"
          className={`m-0 max-w-[24rem] rounded-md border px-2.5 py-1.5 text-[12px] ${toneFor(state)}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
