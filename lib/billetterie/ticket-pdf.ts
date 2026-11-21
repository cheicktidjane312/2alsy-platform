import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'
import { LOGO_JPEG_BASE64 } from './logo'
import {
  PAYMENT_LABELS,
  formatFCFA,
  ticketNumber,
  type EventRecord,
  type RegistrationRecord,
} from './core'

const PINK = rgb(0.84, 0.14, 0.43)
const NAVY = rgb(0.08, 0.13, 0.33)
const GREY = rgb(0.38, 0.4, 0.46)
const LIGHT = rgb(0.96, 0.95, 0.97)

/** Les polices standard du PDF (WinAnsi) ne couvrent pas tout l'Unicode. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[   ]/g, ' ')
    .normalize('NFC')
    .replace(/[^\x20-\x7E -ÿ]/g, '?')
}

function formatDateFr(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => n.toString().padStart(2, '0')
  // Abidjan et Dakar sont en UTC toute l'annee
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} à ${p(d.getUTCHours())} h ${p(d.getUTCMinutes())}`
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfSafe(text).split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function text(page: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont, color = NAVY) {
  page.drawText(pdfSafe(s), { x, y, size, font, color })
}

export async function buildTicketPdf(
  event: EventRecord,
  reg: RegistrationRecord,
  qrContent: string,
): Promise<Uint8Array> {
  if (reg.statut !== 'valide' || !reg.ticket_token) throw new Error('Billet non valide')

  const doc = await PDFDocument.create()
  doc.setTitle(pdfSafe(`Billet ${ticketNumber(event.code, reg.numero)} - ${event.titre}`))
  doc.setAuthor('2ALSY')
  doc.setCreator('2ALSY Billetterie - FIERLAH Vertex')

  const page = doc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const logo = await doc.embedJpg(Buffer.from(LOGO_JPEG_BASE64, 'base64'))

  const margin = 48
  const num = ticketNumber(event.code, reg.numero)

  // Bandeau
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: PINK })
  page.drawRectangle({ x: margin, y: height - 92, width: 74, height: 74, color: rgb(1, 1, 1) })
  page.drawImage(logo, { x: margin + 5, y: height - 87, width: 64, height: 64 })
  text(page, 'REÇU ET BILLET D\'ENTRÉE', margin + 92, height - 50, 18, bold, rgb(1, 1, 1))
  text(page, `2ALSY - Les aînés au service des cadets`, margin + 92, height - 72, 11, regular, rgb(1, 1, 1))

  // Evenement
  let y = height - 160
  for (const l of wrap(event.titre, bold, 24, width - margin * 2)) {
    text(page, l, margin, y, 24, bold)
    y -= 30
  }
  text(page, [event.date_label, event.horaire].filter(Boolean).join('  -  '), margin, y, 13, bold, PINK)
  y -= 20
  text(page, event.lieu, margin, y, 12, regular, GREY)
  y -= 34

  // Code QR
  const qrPng = await QRCode.toBuffer(qrContent, { errorCorrectionLevel: 'M', margin: 1, width: 600 })
  const qr = await doc.embedPng(qrPng)
  const qrSize = 230
  const qrX = (width - qrSize) / 2
  const qrY = y - qrSize
  page.drawRectangle({ x: qrX - 14, y: qrY - 52, width: qrSize + 28, height: qrSize + 66, color: LIGHT })
  page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize })
  const numW = bold.widthOfTextAtSize(num, 20)
  text(page, num, (width - numW) / 2, qrY - 26, 20, bold)
  const pers = `Valable pour ${reg.nb_personnes} personne${reg.nb_personnes > 1 ? 's' : ''}`
  const persW = regular.widthOfTextAtSize(pers, 11)
  text(page, pers, (width - persW) / 2, qrY - 42, 11, regular, GREY)
  y = qrY - 84

  // Details
  const quantitesLabel = event.categories
    .filter(c => (reg.quantites[c.code] ?? 0) > 0)
    .map(c => `${reg.quantites[c.code]} x ${c.label} (${formatFCFA(c.prix)})`)
    .join(', ')

  const rows: [string, string][] = [
    ['Participant', reg.nom_complet],
    ['Téléphone', reg.telephone],
    ...(reg.code_promo ? [['Code membre', reg.code_promo] as [string, string]] : []),
    ['E-mail', reg.email],
    ['Détail', quantitesLabel],
    ['Montant payé', formatFCFA(reg.montant)],
    ['Paiement', [PAYMENT_LABELS[reg.moyen_paiement], reg.reference_paiement ? `réf. ${reg.reference_paiement}` : null].filter(Boolean).join(' - ')],
    ['Paiement vérifié le', reg.valide_at ? formatDateFr(reg.valide_at) : '-'],
  ]

  page.drawLine({ start: { x: margin, y: y + 14 }, end: { x: width - margin, y: y + 14 }, thickness: 1, color: rgb(0.88, 0.86, 0.9) })
  for (const [label, value] of rows) {
    text(page, label, margin, y, 10, regular, GREY)
    const lines = wrap(value, bold, 11, width - margin * 2 - 140)
    lines.forEach((l, i) => text(page, l, margin + 140, y - i * 14, 11, bold))
    y -= 14 * Math.max(1, lines.length) + 8
  }

  // Consignes
  y -= 6
  page.drawRectangle({ x: margin, y: y - 46, width: width - margin * 2, height: 58, color: rgb(1, 0.94, 0.97) })
  text(page, 'À l\'entrée', margin + 12, y - 6, 11, bold, PINK)
  const consigne = 'Présentez ce billet sur votre téléphone ou imprimé. Il ne peut être utilisé qu\'une seule fois.' + (event.dress_code ? ` Tenue : ${event.dress_code.toLowerCase()}.` : '')
  wrap(consigne, regular, 10, width - margin * 2 - 24).forEach((l, i) => text(page, l, margin + 12, y - 22 - i * 13, 10, regular, NAVY))

  // Pied de page
  const foot = [
    event.contact ? `Informations : ${event.contact}` : null,
    'Ce document vaut reçu de paiement. Billetterie 2ALSY propulsée par FIERLAH Vertex.',
  ].filter(Boolean) as string[]
  foot.forEach((l, i) => {
    const w = regular.widthOfTextAtSize(pdfSafe(l), 9)
    text(page, l, (width - w) / 2, 46 - i * 13, 9, regular, GREY)
  })

  return doc.save()
}
