import { useOutletContext, useSearchParams } from 'react-router-dom'
import { PAGES } from './nav'
import { SECTIONS } from './fields'
import PageHeader from './PageHeader'
import Section from './Section'
import { Setting } from './SettingRow'

export function ConfigPage({ pageKey }) {
  const { cfg } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const page = PAGES.find((p) => p.key === pageKey)
  const tab = SECTIONS[pageKey][params.get('tab')] ? params.get('tab') : page.tabs[0].value
  return (
    <>
      <PageHeader page={page} tabs={page.tabs} tab={tab} onTab={(t) => setParams({ tab: t }, { replace: true })} />
      <div className="flex flex-col gap-4">
        {SECTIONS[pageKey][tab].map(({ fields, ...s }) => (
          <Section key={s.title} {...s}>
            {fields.filter((f) => !f.show || f.show(cfg.draft)).map((f) => <Setting key={f.key + (f.control ?? '')} f={f} cfg={cfg} />)}
          </Section>
        ))}
      </div>
    </>
  )
}

export default function PricingPage() {
  return <ConfigPage pageKey="pricing" />
}
