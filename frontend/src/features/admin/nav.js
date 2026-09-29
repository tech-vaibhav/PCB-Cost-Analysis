import { FlaskConical, Factory, LayoutDashboard, Tags, Users } from 'lucide-react'

// Single registry for admin pages: navigation, headers, mobile home list and tab bar all read from here.
// color = tint classes for the page icon chip.
export const PAGES = [
  {
    key: 'overview', to: '/admin', label: 'Overview', short: 'Home', icon: LayoutDashboard,
    color: 'bg-slate-100 text-slate-700',
    description: 'Status of your pricing setup and shortcuts to each area.',
  },
  {
    key: 'pricing', to: '/admin/pricing', label: 'Pricing rules', short: 'Pricing', icon: Tags,
    color: 'bg-slate-100 text-slate-900',
    description: 'How each board option changes the price, and the policy that turns cost into a quote.',
    tabs: [
      { value: 'rules', label: 'Board options', description: 'Multipliers and per-board charges for layers, thickness, copper, finish, mask and extras.' },
      { value: 'policy', label: 'Quote policy', description: 'Markup ladder, competitor beating, engineering fees, GST and exchange rate.' },
    ],
  },
  {
    key: 'costs', to: '/admin/costs', label: 'Cost sheet', short: 'Costs', icon: Factory,
    color: 'bg-slate-100 text-slate-900',
    description: 'What it costs you to make a board: materials, panel usage, labour, energy and overheads.',
    tabs: [
      { value: 'production', label: 'Production', description: 'Panel layout, laminate and process rates, components, consumables and fab source.' },
      { value: 'operations', label: 'Operations', description: 'Monthly labour, energy, overheads, packaging, tooling and fees shared across orders.' },
    ],
  },
  {
    key: 'lab', to: '/admin/quote-lab', label: 'Quote lab', short: 'Lab', icon: FlaskConical,
    color: 'bg-slate-100 text-slate-900',
    description: 'Price any board with the current rates and see cost, margin and competitor comparison.',
  },
  {
    key: 'team', to: '/admin/team', label: 'Team', short: 'Team', icon: Users,
    color: 'bg-slate-100 text-slate-900',
    description: 'Approve access requests and manage who can sign in.',
  },
]

export const pageFor = (pathname) => PAGES.find((p) => p.to === pathname.replace(/\/$/, '')) ?? PAGES[0]

// Sidebar and mobile home grouping. label null = ungrouped.
export const GROUPS = [
  { label: null, keys: ['overview'] },
  { label: 'Pricing', keys: ['pricing', 'costs'] },
  { label: 'Tools', keys: ['lab'] },
  { label: 'Account', keys: ['team'] },
]
export const pageByKey = Object.fromEntries(PAGES.map((p) => [p.key, p]))
