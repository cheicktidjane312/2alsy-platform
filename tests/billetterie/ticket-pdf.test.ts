import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { generateToken, ticketUrl, type EventRecord, type RegistrationRecord } from '@/lib/billetterie/core'
import { buildTicketPdf, pdfSafe } from '@/lib/billetterie/ticket-pdf'

const event: EventRecord = {
  id: 'e1', created_at: '', slug: 'octobre-rose-2026', code: 'OR26', titre: 'Pique-nique Octobre Rose',
  sous_titre: null, date_label: 'Samedi 31 octobre 2026', horaire: '9 h - 14 h', lieu: 'Jardin botanique de Bingerville',
  starts_at: null, description: null, dress_code: 'Un vêtement rose',
  categories: [{ code: 'adulte', label: 'Adulte', prix: 8000 }, { code: 'etudiant', label: 'Étudiant ou enfant', prix: 5000 }],
  paiement_numero: '+225 07 00 00 00 00', paiement_moyens: 'Wave et Orange Money', paiement_beneficiaire: '2ALSY',
  date_limite: null, contact: '+225 05 00 00 00 00', places_max: null, inscriptions_ouvertes: true, scan_pin_hash: null,
}

function reg(token: string): RegistrationRecord {
  return {
    id: 'r1', numero: 42, created_at: '2026-10-14T10:00:00Z', event_id: 'e1',
    nom_complet: 'Aïssata N’Guessan Kouadio', email: 'aissata@example.com', telephone: '+2250700000000', code_promo: 'AS45',
    quantites: { adulte: 2, etudiant: 1 }, nb_personnes: 3, montant: 21000, moyen_paiement: 'wave',
    reference_paiement: 'TX-98765', preuve_path: null, statut: 'valide', motif_refus: null,
    valide_at: '2026-10-14T12:30:00Z', valide_par: null, ticket_token: token,
    email_envoye_at: null, email_erreur: null, entre_at: null, entre_par: null,
  }
}

describe('billet PDF', () => {
  it('nettoie les caractères non imprimables par les polices PDF', () => {
    expect(pdfSafe('N’Guessan – “ok”…')).toBe('N\'Guessan - "ok"...')
    expect(pdfSafe('Aïssata Éloïse')).toBe('Aïssata Éloïse')
  })

  it('produit un PDF dont le code QR imprimé se relit et contient l\'URL du billet', async () => {
    const token = generateToken()
    const url = ticketUrl('https://2alsy.fierlah-vertex.com', token)
    const pdf = await buildTicketPdf(event, reg(token), url)
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')

    const dir = mkdtempSync(path.join(tmpdir(), 'billet-'))
    writeFileSync(path.join(dir, 'b.pdf'), pdf)
    // Plusieurs resolutions : ecran de telephone (72 dpi) a impression (200 dpi)
    for (const dpi of ['72', '150', '200']) {
      execFileSync('pdftoppm', ['-r', dpi, '-png', '-singlefile', path.join(dir, 'b.pdf'), path.join(dir, `b${dpi}`)])
      const png = PNG.sync.read(readFileSync(path.join(dir, `b${dpi}.png`)))
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
      expect(decoded?.data, `lecture a ${dpi} dpi`).toBe(url)
    }

    const text = execFileSync('pdftotext', [path.join(dir, 'b.pdf'), '-']).toString()
    expect(text).toContain('OR26-0042')
    expect(text).toContain('21 000 FCFA')
    expect(text).toContain("Aïssata N'Guessan Kouadio")
    expect(text).toContain('Valable pour 3 personnes')
    expect(text).toContain('AS45')
  })

  it('refuse de produire un billet pour une inscription non validée', async () => {
    const r = { ...reg(generateToken()), statut: 'en_attente' as const }
    await expect(buildTicketPdf(event, r, 'x')).rejects.toThrow()
  })
})
