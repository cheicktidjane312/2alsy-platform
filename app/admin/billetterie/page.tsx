import Link from 'next/link'
import { Ticket, ChevronRight } from 'lucide-react'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

export default async function AdminBilletteriePage() {
  const store = getStore()
  const events = await store.listEvents()
  const rows = await Promise.all(events.map(async e => {
    const regs = await store.listRegistrations(e.id)
    return {
      e,
      attente: regs.filter(r => r.statut === 'en_attente').length,
      valides: regs.filter(r => r.statut === 'valide').reduce((s, r) => s + r.nb_personnes, 0),
    }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl! font-bold text-blue-400">Billetterie</h1>
        <p className="text-sm text-slate-500 mt-1">Inscriptions, validation des paiements et contrôle des entrées</p>
      </div>
      {rows.length === 0 && <p className="text-slate-400">Aucun événement. Exécutez le script supabase/migration-billetterie.sql.</p>}
      <div className="space-y-3">
        {rows.map(({ e, attente, valides }) => (
          <Link key={e.id} href={`/admin/billetterie/${e.slug}`} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center"><Ticket className="h-5 w-5 text-pink-400" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{e.titre}</div>
              <div className="text-sm text-slate-400">{e.date_label} - {e.lieu}</div>
              <div className="sm:hidden mt-1 text-sm">
                {attente > 0 && <span className="text-orange-300 font-semibold">{attente} à vérifier - </span>}
                <span className="text-slate-400">{valides} personne{valides > 1 ? 's' : ''} validée{valides > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="hidden sm:block text-right text-sm shrink-0">
              {attente > 0 && <div className="text-orange-300 font-semibold">{attente} à vérifier</div>}
              <div className="text-slate-400">{valides} personne{valides > 1 ? 's' : ''} validée{valides > 1 ? 's' : ''}</div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
