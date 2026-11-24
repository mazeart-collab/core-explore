import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useMetiers } from '../lib/MetiersContext'
import { useSelection } from '../lib/SelectionContext'
import { HeartIcon } from './SelectionButtons'

const NAV = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/univers', label: 'L’univers des possibles' },
  { to: '/ce-qui-m-anime', label: 'Je trouve ce qui m’anime' },
  { to: '/a-propos', label: 'À propos' },
]

function navClass({ isActive }) {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')
}

function PanierButton() {
  const { favoris } = useSelection()
  const n = Object.keys(favoris).length
  return (
    <NavLink
      to="/panier"
      className={({ isActive }) =>
        `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
          isActive ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-700'
        }`
      }
    >
      <HeartIcon filled={n > 0} size={16} />
      <span>
        Mon panier <span className="tabular-nums">({n})</span>
      </span>
    </NavLink>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)
  // Referme le menu mobile à chaque changement de page.
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900">
          CORE <span className="text-teal-700">Explore</span>
        </Link>
        <div className="flex items-center gap-2">
        <nav className="hidden lg:block" aria-label="Navigation principale">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <PanierButton />
        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        </div>
      </div>
      {open && (
        <nav id="menu-mobile" className="border-t border-slate-200 px-4 py-2 lg:hidden" aria-label="Navigation principale">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}

export function DataCount({ className = '' }) {
  const { status, meta, metiers } = useMetiers()
  if (status !== 'ready') return null
  const total = meta?.nb_fiches_rome
  const n = meta?.nb_metiers ?? metiers.length
  return (
    <span className={className}>
      {n.toLocaleString('fr-FR')} métier{n > 1 ? 's' : ''} chargé{n > 1 ? 's' : ''}
      {total ? ` sur ${total.toLocaleString('fr-FR')} fiches ROME` : ''}
    </span>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Source officielle : ROME 4.0 (France Travail), Licence Ouverte. Repères complémentaires enrichis par IA.
        </p>
        <DataCount />
      </div>
    </footer>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <ScrollToTop />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:p-2">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
