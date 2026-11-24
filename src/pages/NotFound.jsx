import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Page introuvable</h1>
      <Link to="/" className="mt-4 inline-block font-medium text-teal-700 hover:underline">
        Retour à l’accueil
      </Link>
    </div>
  )
}
