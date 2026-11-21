import 'server-only'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { emailFrom, isTestMode } from './config'
import { PAYMENT_LABELS, detailPlaces, escapeHtml, formatFCFA, ticketNumber, type EventRecord, type RegistrationRecord } from './core'

interface Attachment { filename: string; content: Uint8Array }

interface Mail {
  to: string | string[]
  subject: string
  html: string
  text: string
  attachments?: Attachment[]
}

async function send(mail: Mail): Promise<void> {
  if (isTestMode()) {
    const dir = path.join(process.cwd(), '.billetterie-test-mails')
    await mkdir(dir, { recursive: true })
    const base = `${Date.now()}-${[mail.to].flat().join('+').replace(/[^a-z0-9]/gi, '_')}`
    await writeFile(path.join(dir, `${base}.json`), JSON.stringify({ ...mail, attachments: mail.attachments?.map(a => a.filename) }, null, 2))
    for (const a of mail.attachments ?? []) await writeFile(path.join(dir, `${base}-${a.filename}`), a.content)
    return
  }

  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY manquante')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: emailFrom(),
      to: [mail.to].flat(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments?.map(a => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Envoi refusé par Resend (${res.status}) ${body.slice(0, 300)}`)
  }
}

function layout(title: string, inner: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4f2f6;font-family:Arial,Helvetica,sans-serif;color:#14214f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#d6246e;padding:22px 28px;color:#ffffff;font-size:13px;letter-spacing:1px;font-weight:bold">2ALSY - BILLETTERIE</td></tr>
<tr><td style="padding:28px">${inner}</td></tr>
<tr><td style="padding:16px 28px 24px;color:#7a7f8c;font-size:12px;border-top:1px solid #eee">2ALSY, les aînés au service des cadets. Billetterie propulsée par FIERLAH Vertex.</td></tr>
</table></td></tr></table></body></html>`
}

export async function sendTicketEmail(
  event: EventRecord,
  reg: RegistrationRecord,
  pdf: Uint8Array,
  billetUrl: string,
): Promise<void> {
  const num = ticketNumber(event.code, reg.numero)
  const prenom = reg.nom_complet.split(/\s+/)[0]
  const subject = `Votre billet ${num} - ${event.titre}`
  const html = layout(subject, `
<p style="font-size:16px;margin:0 0 14px">Bonjour ${escapeHtml(prenom)},</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 18px">Votre paiement de <strong>${escapeHtml(formatFCFA(reg.montant))}</strong> a bien été vérifié. Votre reçu et votre billet d'entrée sont joints à cet e-mail (fichier PDF).</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff0f6;border-radius:10px;margin:0 0 20px"><tr><td style="padding:16px 18px;font-size:14px;line-height:1.6">
<strong style="font-size:16px">${escapeHtml(event.titre)}</strong><br>
${escapeHtml(event.date_label)}${event.horaire ? ` - ${escapeHtml(event.horaire)}` : ''}<br>
${escapeHtml(event.lieu)}<br>
Billet <strong>${escapeHtml(num)}</strong>, valable pour ${reg.nb_personnes} personne${reg.nb_personnes > 1 ? 's' : ''}
</td></tr></table>
<p style="text-align:center;margin:0 0 22px"><a href="${escapeHtml(billetUrl)}" style="display:inline-block;background:#14214f;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:9px;font-size:15px">Afficher mon billet</a></p>
<p style="font-size:14px;line-height:1.55;margin:0 0 8px">Le jour J, présentez le code QR à l'entrée, sur votre téléphone ou imprimé. Il ne peut être utilisé qu'une seule fois : ne le partagez pas.</p>
${event.dress_code ? `<p style="font-size:14px;margin:0 0 8px">Tenue : ${escapeHtml(event.dress_code.toLowerCase())}.</p>` : ''}
${event.contact ? `<p style="font-size:13px;color:#7a7f8c;margin:14px 0 0">Une question ? ${escapeHtml(event.contact)}</p>` : ''}`)

  const text = [
    `Bonjour ${prenom},`,
    '',
    `Votre paiement de ${formatFCFA(reg.montant)} a bien été vérifié. Votre reçu et votre billet sont joints (PDF).`,
    '',
    `${event.titre} - ${event.date_label}${event.horaire ? ` - ${event.horaire}` : ''} - ${event.lieu}`,
    `Billet ${num}, valable pour ${reg.nb_personnes} personne(s).`,
    '',
    `Afficher mon billet : ${billetUrl}`,
    '',
    'Présentez le code QR à l\'entrée. Il ne peut être utilisé qu\'une seule fois.',
  ].join('\n')

  await send({ to: reg.email, subject, html, text, attachments: [{ filename: `Billet-${num}.pdf`, content: pdf }] })
}

export async function sendRejectionEmail(event: EventRecord, reg: RegistrationRecord, motif: string): Promise<void> {
  const prenom = reg.nom_complet.split(/\s+/)[0]
  const subject = `Votre inscription - ${event.titre}`
  const html = layout(subject, `
<p style="font-size:16px;margin:0 0 14px">Bonjour ${escapeHtml(prenom)},</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 14px">Nous n'avons pas pu valider votre inscription au <strong>${escapeHtml(event.titre)}</strong>.</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 14px;background:#f6f6f8;padding:12px 14px;border-radius:8px">Motif : ${escapeHtml(motif)}</p>
<p style="font-size:14px;line-height:1.55;margin:0">Vous pouvez refaire votre inscription avec les bonnes informations${event.contact ? `, ou nous contacter au ${escapeHtml(event.contact)}` : ''}.</p>`)
  const text = `Bonjour ${prenom},\n\nNous n'avons pas pu valider votre inscription au ${event.titre}.\nMotif : ${motif}\n\nVous pouvez refaire votre inscription${event.contact ? ` ou nous contacter au ${event.contact}` : ''}.`
  await send({ to: reg.email, subject, html, text })
}

/** Previent les administrateurs qu'une inscription attend leur verification. */
export async function sendAdminNotification(
  event: EventRecord,
  reg: RegistrationRecord,
  to: string[],
  adminUrl: string,
): Promise<void> {
  if (to.length === 0) return
  const num = ticketNumber(event.code, reg.numero)
  const detail = detailPlaces(event.categories, reg.quantites)
  const paiement = [PAYMENT_LABELS[reg.moyen_paiement], reg.reference_paiement ? `réf. ${reg.reference_paiement}` : null, reg.preuve_path ? 'capture jointe' : null]
    .filter(Boolean).join(' - ')
  const subject = `Nouvelle inscription ${num} à vérifier - ${reg.nom_complet}`
  const rows: [string, string][] = [
    ['Participant', reg.nom_complet],
    ...(reg.code_promo ? [['Code membre', reg.code_promo] as [string, string]] : []),
    ['Téléphone', reg.telephone],
    ['Places', detail],
    ['Montant annoncé', formatFCFA(reg.montant)],
    ['Paiement', paiement],
  ]
  const html = layout(subject, `
<p style="font-size:16px;margin:0 0 14px"><strong>Nouvelle inscription au ${escapeHtml(event.titre)}</strong></p>
<p style="font-size:14px;line-height:1.55;margin:0 0 16px">Vérifiez que le paiement est bien arrivé sur le compte ${escapeHtml(event.paiement_numero)}, puis validez l'inscription : le participant recevra aussitôt son billet.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;border-radius:10px;margin:0 0 20px">
${rows.map(([k, v]) => `<tr><td style="padding:7px 14px;font-size:13px;color:#7a7f8c;width:140px">${escapeHtml(k)}</td><td style="padding:7px 14px;font-size:14px;font-weight:bold">${escapeHtml(v)}</td></tr>`).join('')}
</table>
<p style="text-align:center;margin:0"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#d6246e;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:9px;font-size:15px">Ouvrir l'espace admin</a></p>`)
  const text = [
    `Nouvelle inscription ${num} au ${event.titre}`,
    '',
    ...rows.map(([k, v]) => `${k} : ${v}`),
    '',
    `Vérifiez le paiement puis validez : ${adminUrl}`,
  ].join('\n')
  await send({ to, subject, html, text })
}
