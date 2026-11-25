import { useApi } from '../api.js'
import { Card, ErrorBox, Loading, PageTitle, Stat } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

/** The farmer's carbon: credits waiting for the verifier and credits approved, in tCO₂e. */
export default function Carbon() {
  const { t, fmt } = usePreferences()
  const { data, error, loading } = useApi('/carbon/summary')

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />

  const { pending_tco2e, approved_tco2e } = data.totals

  return (
    <div className="space-y-4">
      <PageTitle title={t('carbon.title')} subtitle={t('carbon.subtitle')} />
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('carbon.pending')} value={fmt.num(pending_tco2e)} unit="tCO₂e" tone="text-violet-700" />
          <Stat label={t('carbon.approved')} value={fmt.num(approved_tco2e)} unit="tCO₂e" tone="text-green-700" />
        </div>
      </Card>
    </div>
  )
}
