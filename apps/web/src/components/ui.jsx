export function Card({ className = '', children }) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </section>
  )
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const BUTTON = {
  primary: 'bg-green-700 text-white hover:bg-green-800 disabled:bg-stone-300',
  secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 disabled:text-stone-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-stone-300',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed ${BUTTON[variant]} ${className}`}
      {...props}
    />
  )
}

const BADGE = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  sky: 'bg-sky-100 text-sky-800',
  red: 'bg-red-100 text-red-700',
  stone: 'bg-stone-100 text-stone-700',
  violet: 'bg-violet-100 text-violet-800',
}

export function Badge({ color = 'stone', children }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[color]}`}>
      {children}
    </span>
  )
}

export const PHASE_COLOR = { flooded: 'sky', reflood: 'sky', drying: 'amber', final_drain: 'stone', no_data: 'red' }
export const VERIFICATION_COLOR = { pending: 'violet', in_review: 'sky', approved: 'green', rejected: 'red' }

export function Field({ label, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20'

export function Loading() {
  return <p className="py-10 text-center text-stone-500">กำลังโหลด…</p>
}

export function ErrorBox({ error }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
      {error.message || String(error)}
    </p>
  )
}

export function Empty({ children }) {
  return <p className="py-6 text-center text-sm text-stone-500">{children}</p>
}

export function Stat({ label, value, unit, tone = 'text-stone-900' }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-stone-500">{unit}</span>}
      </p>
    </div>
  )
}

/** Evidence photo; shows a placeholder if the file is missing (e.g. sample-data paths). */
export function Photo({ src, alt, className = '' }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`rounded-lg bg-stone-200 object-cover ${className}`}
      onError={(e) => {
        const img = e.currentTarget
        if (img.dataset.fallback) return // the placeholder itself failed; stop here
        img.dataset.fallback = '1'
        img.src = '/mock/missing.svg'
      }}
    />
  )
}
