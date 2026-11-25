import { Camera, Check, ImagePlus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePreferences } from '../preferences.jsx'

/** Preview URL for the chosen file, released when it changes or the picker closes. */
function usePreview(file) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

const CHOICE =
  'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-600'
const PRIMARY = 'bg-green-700 text-white hover:bg-green-800'
const SECONDARY = 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100'

/** A button that opens the photo picker; `camera` goes straight to the back camera on phones. */
function PickButton({ camera = false, className, onPick, children }) {
  const pick = (e) => {
    const file = e.target.files[0]
    if (file) onPick(file)
    e.target.value = '' // picking the same file again still counts
  }
  return (
    <label className={`${CHOICE} ${className}`}>
      <input type="file" accept="image/*" capture={camera ? 'environment' : undefined} onChange={pick} className="sr-only" />
      {children}
    </label>
  )
}

/**
 * Evidence photo: a large area to take a photo with the camera or pick one from the
 * gallery, then a preview of the chosen photo with "Change photo".
 */
export default function PhotoPicker({ label, hint, photo, onChange }) {
  const { t } = usePreferences()
  const preview = usePreview(photo)

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{label}</p>
      {preview ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
          <img src={preview} alt="" className="h-52 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 p-2">
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-green-700">
              <Check size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{photo.name}</span>
            </span>
            <PickButton className={`shrink-0 ${SECONDARY}`} onPick={onChange}>
              <RefreshCw size={16} aria-hidden="true" />
              {t('photo.change')}
            </PickButton>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Camera size={28} aria-hidden="true" />
          </span>
          {hint && <p className="mx-auto mb-3 max-w-xs text-xs text-stone-500">{hint}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <PickButton camera className={PRIMARY} onPick={onChange}>
              <Camera size={18} aria-hidden="true" />
              {t('photo.take')}
            </PickButton>
            <PickButton className={SECONDARY} onPick={onChange}>
              <ImagePlus size={18} aria-hidden="true" />
              {t('photo.choose')}
            </PickButton>
          </div>
        </div>
      )}
    </div>
  )
}
