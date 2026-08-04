import { NavLink, Outlet } from 'react-router-dom'

import { useAce } from '../providers/AceContext'
import { shortId } from '../lib/format'

const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/upload', label: 'New submission' },
  { to: '/consensus', label: 'Consensus report' },
]

export function AppLayout() {
  const { account, configError, connectWallet, isConnecting } = useAce()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">A</span>
            <span className="hidden sm:inline">Academic Consensus</span>
          </NavLink>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-paper hover:text-ink'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button type="button" className="button-secondary ml-auto" onClick={() => void connectWallet()} disabled={isConnecting || Boolean(account)}>
            {account ? shortId(account, 5) : isConnecting ? 'Connecting…' : 'Connect wallet'}
          </button>
        </div>
      </header>

      {configError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          {configError} Add it to your frontend environment to load contract data.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-line px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>Academic Consensus Engine</span>
        <span>Verifiable evaluation on GenLayer</span>
      </footer>
    </div>
  )
}
