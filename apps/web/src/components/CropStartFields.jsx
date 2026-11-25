import { todayISO } from '../format.js'
import { usePreferences } from '../preferences.jsx'
import PhotoPicker from './PhotoPicker.jsx'
import { Field, inputClass } from './ui.jsx'

export const emptyCrop = () => ({ planting_date: todayISO(), photo: null })

/** Adds the crop fields to a FormData for POST /paddies. */
export function appendCrop(body, crop, capturedAt) {
  body.append('planting_date', crop.planting_date)
  body.append('photo', crop.photo)
  body.append('captured_at', capturedAt)
}

/**
 * Starting an AWD rice crop: the planting date and the planting-day photo. Rice variety and
 * sowing vs transplanting aren't asked: the IPCC Tier 1 CH4 calculation doesn't use them.
 */
export default function CropStartFields({ crop, onChange }) {
  const { t } = usePreferences()
  return (
    <>
      <Field label={t('newCrop.plantingDate')}>
        <input
          required
          type="date"
          max={todayISO()}
          value={crop.planting_date}
          onChange={(e) => onChange({ ...crop, planting_date: e.target.value })}
          className={inputClass}
        />
      </Field>
      <PhotoPicker
        label={t('newCrop.photo')}
        hint={t('newCrop.photoHint')}
        photo={crop.photo}
        onChange={(photo) => onChange({ ...crop, photo })}
      />
    </>
  )
}
