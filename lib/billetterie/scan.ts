import 'server-only'
import { detailPlaces, ticketNumber, type EventRecord, type RegistrationRecord } from './core'
import type { CheckInResult } from './store'

/** Ce que l'agent voit : le strict necessaire pour faire entrer (pas d'e-mail ni de montant). */
export function scanView(event: EventRecord, r: RegistrationRecord) {
  return {
    id: r.id,
    billet: ticketNumber(event.code, r.numero),
    nom: r.nom_complet,
    code_promo: r.code_promo,
    nb_personnes: r.nb_personnes,
    detail: detailPlaces(event.categories, r.quantites),
    statut: r.statut,
    entre_at: r.entre_at,
    entre_par: r.entre_par,
  }
}

export function checkInPayload(event: EventRecord, result: CheckInResult) {
  if (result.status === 'inconnu') return { status: result.status }
  return { status: result.status, billet: scanView(event, result.registration) }
}
