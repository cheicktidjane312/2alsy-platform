// Parcours complet de la billetterie, en mode test (memoire + e-mails dans un dossier local).
// Prerequis : serveur lance avec
//   BILLETTERIE_TEST_MODE=1 NEXT_PUBLIC_APP_URL=http://localhost:3100 npx next dev -p 3100
// Lancement : node tests/e2e/billetterie.e2e.mjs
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import QRCode from 'qrcode'

const BASE = process.env.E2E_BASE ?? 'http://localhost:3100'
const SLUG = 'octobre-rose-2026'
const ROOT = process.cwd()
const MAILS = path.join(ROOT, '.billetterie-test-mails')
const OUT = path.join(ROOT, '.billetterie-test-mails', 'captures')
mkdirSync(OUT, { recursive: true })

let passed = 0
function ok(cond, label) {
  if (!cond) throw new Error(`ECHEC : ${label}`)
  passed++
  console.log(`  ok  ${label}`)
}

function mails() {
  try { return readdirSync(MAILS).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(readFileSync(path.join(MAILS, f), 'utf8'))) } catch { return [] }
}

const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' }

async function inscrire(page, { nom, tel, email, adultes = 1, etudiants = 0, moyen = 'Wave', capture = false, reference = '' }) {
  await page.goto(`${BASE}/evenement/${SLUG}`)
  // Par defaut : 1 adulte
  for (let i = 1; i < adultes; i++) await page.getByRole('button', { name: 'Ajouter une place Adulte' }).click()
  for (let i = 0; i < etudiants; i++) await page.getByRole('button', { name: 'Ajouter une place Étudiant ou enfant' }).click()
  await page.getByLabel('Nom et prénoms').fill(nom)
  await page.getByLabel('Téléphone').fill(tel)
  await page.getByLabel('E-mail (votre billet sera envoyé ici)').fill(email)
  await page.getByRole('radio', { name: moyen }).click()
  if (capture) await page.getByLabel('Capture du paiement').setInputFiles(path.join(ROOT, 'tests/e2e/capture-paiement.jpg'))
  if (reference) await page.getByLabel('Référence de la transaction (si pas de capture)').fill(reference)
  await page.getByRole('button', { name: 'Envoyer mon inscription' }).click()
}

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM ?? undefined })

// ---------------------------------------------------------------- 1. Participant
console.log('1. Inscription des participants')
const participant = await browser.newContext(mobile)
const p = await participant.newPage()
await p.goto(`${BASE}/evenement/${SLUG}`)
await p.screenshot({ path: path.join(OUT, '01-inscription.png'), fullPage: true })
ok(await p.getByText('Pique-nique Octobre Rose').first().isVisible(), 'la page d\'inscription s\'affiche')

await p.getByRole('button', { name: 'Ajouter une place Adulte' }).click()
await p.getByRole('button', { name: 'Ajouter une place Étudiant ou enfant' }).click()
ok((await p.getByText('21 000 FCFA').count()) >= 1, 'le total se calcule (2 adultes + 1 étudiant = 21 000 FCFA)')

// Envoi sans preuve : refuse cote navigateur
await p.getByLabel('Nom et prénoms').fill('Aya Konan')
await p.getByLabel('Téléphone').fill('07 00 00 00 00')
await p.getByLabel('E-mail (votre billet sera envoyé ici)').fill('aya@example.com')
await p.getByLabel('Code promo membre 2ALSY (si vous êtes membre)').fill('as45')
ok(await p.getByLabel('Code promo membre 2ALSY (si vous êtes membre)').inputValue() === 'AS45', 'le code promo passe en majuscules à la saisie')
await p.getByRole('button', { name: 'Envoyer mon inscription' }).click()
ok(await p.getByRole('alert').getByText('Ajoutez la capture').isVisible(), 'impossible d\'envoyer sans capture ni référence')

await p.getByLabel('Capture du paiement').setInputFiles(path.join(ROOT, 'tests/e2e/capture-paiement.jpg'))
await p.screenshot({ path: path.join(OUT, '02-formulaire-rempli.png'), fullPage: true })
await p.getByRole('button', { name: 'Envoyer mon inscription' }).click()
await p.getByText('Inscription envoyée').waitFor({ timeout: 15000 })
await p.screenshot({ path: path.join(OUT, '03-confirmation.png'), fullPage: true })
ok(await p.getByText('21 000 FCFA').isVisible(), 'confirmation avec le bon montant')
await new Promise(res => setTimeout(res, 1500))
const notif = mails().find(m => [m.to].flat().includes('admin@test.local') && m.subject.includes('Aya Konan'))
ok(!!notif && notif.html.includes('AS45') && notif.html.includes('/admin/billetterie/octobre-rose-2026'), 'les admins reçoivent un e-mail à chaque inscription (avec le lien vers l\'espace admin)')

const p2 = await participant.newPage()
await inscrire(p2, { nom: 'Koffi Yao', tel: '0505050505', email: 'koffi@example.com', moyen: 'Orange Money', reference: 'OM-123456' })
await p2.getByText('Inscription envoyée').waitFor({ timeout: 15000 })
ok(true, 'inscription avec référence seulement (sans capture)')

const p3 = await participant.newPage()
await inscrire(p3, { nom: 'Faux Paiement', tel: '0101010101', email: 'faux@example.com', reference: 'OM-123456' })
await p3.getByText('Inscription envoyée').waitFor({ timeout: 15000 })
ok(true, 'troisième inscription (réutilise la même référence)')

// Robot : champ piege rempli
const robot = await fetch(`${BASE}/api/billetterie/${SLUG}/inscription`, {
  method: 'POST',
  body: (() => { const f = new FormData(); f.set('site_web', 'spam'); f.set('nom_complet', 'Bot'); return f })(),
})
ok(robot.status === 400, 'un robot (champ piège rempli) est rejeté')

const faux = await fetch(`${BASE}/api/billetterie/${SLUG}/inscription`, {
  method: 'POST',
  body: (() => {
    const f = new FormData()
    f.set('nom_complet', 'Fichier Piege'); f.set('email', 'x@example.com'); f.set('telephone', '0707070707')
    f.set('moyen_paiement', 'wave'); f.set('quantites', JSON.stringify({ adulte: 1 }))
    f.set('preuve', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'faux.png')
    return f
  })(),
})
ok(faux.status === 400, 'un faux fichier image (contenu HTML) est rejeté')

const vip = await fetch(`${BASE}/api/billetterie/${SLUG}/inscription`, {
  method: 'POST',
  body: (() => {
    const f = new FormData()
    f.set('nom_complet', 'Tricheur'); f.set('email', 't@example.com'); f.set('telephone', '0707070707')
    f.set('moyen_paiement', 'wave'); f.set('reference_paiement', 'R1'); f.set('quantites', JSON.stringify({ vip: 1 }))
    return f
  })(),
})
const codeFaux = await fetch(`${BASE}/api/billetterie/${SLUG}/inscription`, {
  method: 'POST',
  body: (() => {
    const f = new FormData()
    f.set('nom_complet', 'Code Faux'); f.set('email', 'cf@example.com'); f.set('telephone', '0707070707')
    f.set('moyen_paiement', 'wave'); f.set('reference_paiement', 'R2'); f.set('quantites', JSON.stringify({ adulte: 1 }))
    f.set('code_promo', 'AS99')
    return f
  })(),
})
ok(codeFaux.status === 400 && (await codeFaux.json()).error.includes('Code promo'), 'un code promo hors format (AS99) est rejeté')

ok(vip.status === 400, 'une catégorie inventée est rejetée (le prix est toujours calculé côté serveur)')

// ---------------------------------------------------------------- 2. Securite
console.log('2. Accès protégés')
ok((await fetch(`${BASE}/api/admin/billetterie/${SLUG}/export`)).status === 401, 'export interdit sans compte admin')
ok((await fetch(`${BASE}/api/scan/${SLUG}/recherche?q=aya`)).status === 401, 'recherche agent interdite sans code')
ok((await fetch(`${BASE}/api/scan/${SLUG}/check`, { method: 'POST', body: '{}' })).status === 401, 'scan interdit sans code')

// ---------------------------------------------------------------- 3. Admin
console.log('3. Validation par l\'administrateur')
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' })
await admin.addCookies([{ name: 'bt_test_admin', value: '1', url: BASE }])
const a = await admin.newPage()
a.on('dialog', d => d.accept())
await a.goto(`${BASE}/admin/billetterie/${SLUG}`)
await a.getByText('Aya Konan').waitFor()
ok(await a.locator('li', { hasText: 'Aya Konan' }).getByText('AS45').isVisible(), 'l\'admin voit le code promo du membre')
ok((await a.getByText('Référence déjà utilisée').count()) === 2, 'les deux inscriptions avec la même référence sont signalées')
await a.screenshot({ path: path.join(OUT, '04-admin-a-verifier.png'), fullPage: true })

const capRes = await a.request.get(`${BASE}/api/admin/billetterie/inscriptions/${await (async () => {
  const href = await a.locator('a', { hasText: 'Capture' }).first().getAttribute('href')
  return href.split('/')[5]
})()}/preuve`)
ok(capRes.status() === 200 && capRes.headers()['content-type'].startsWith('image/'), 'l\'admin voit la capture du paiement')

const mailsAvant = mails().length
const carteAya = a.locator('li', { hasText: 'Aya Konan' })
await carteAya.getByRole('button', { name: 'Valider' }).click()
await a.getByText('Paiement validé : le billet a été envoyé par e-mail.').waitFor({ timeout: 20000 })
const mailAya = mails().at(-1)
ok(mails().length === mailsAvant + 1 && mailAya.to === 'aya@example.com', 'le billet part par e-mail à Aya')
ok(mailAya.attachments[0].startsWith('Billet-OR26-') && mailAya.subject.includes('Pique-nique'), 'l\'e-mail contient le billet PDF')
const billetUrl = mailAya.html.match(/href="(http[^"]+\/billet\/[A-Za-z0-9_-]{32})"/)[1]

// La double validation est impossible
const ayaId = (await a.locator('li', { hasText: 'Aya Konan' }).locator('a', { hasText: 'Capture' }).getAttribute('href')).split('/')[5]
const again = await a.request.post(`${BASE}/api/admin/billetterie/inscriptions/${ayaId}`, { data: { action: 'valider' } })
ok(again.status() === 409, 'une inscription ne peut pas être validée deux fois')

// Refus de l'inscription frauduleuse
await a.getByRole('button', { name: 'À vérifier' }).click()
const carteFaux = a.locator('li', { hasText: 'Faux Paiement' })
await carteFaux.getByRole('button', { name: 'Refuser' }).click()
await carteFaux.getByRole('button', { name: 'Paiement non reçu' }).click()
await carteFaux.getByRole('button', { name: 'Confirmer le refus' }).click()
await a.getByText('Inscription refusée, la personne a été prévenue par e-mail.').waitFor({ timeout: 15000 })
ok(mails().at(-1).to === 'faux@example.com' && mails().at(-1).html.includes('Paiement non reçu'), 'la personne refusée reçoit le motif par e-mail')

// Validation de Koffi
await a.locator('li', { hasText: 'Koffi Yao' }).getByRole('button', { name: 'Valider' }).click()
await a.getByText('Paiement validé : le billet a été envoyé par e-mail.').waitFor({ timeout: 20000 })
ok(mails().at(-1).to === 'koffi@example.com', 'le billet part par e-mail à Koffi')

// Code des agents
await a.getByLabel('Nouveau code d\'accès').fill('482917')
await a.getByRole('button', { name: 'Définir' }).click()
await a.getByText(/^Code enregistré/).waitFor()
ok(true, 'l\'admin définit le code d\'accès des agents')

await a.getByRole('button', { name: 'Validés' }).click()
await a.screenshot({ path: path.join(OUT, '05-admin-valides.png'), fullPage: true })

const csv = await a.request.get(`${BASE}/api/admin/billetterie/${SLUG}/export`)
const csvText = await csv.text()
ok(csv.status() === 200 && csvText.includes('Aya Konan') && csvText.includes('Refusé'), 'export Excel des inscriptions')

// ---------------------------------------------------------------- 4. Billet du participant
console.log('4. Billet du participant')
const b = await participant.newPage()
await b.goto(billetUrl)
ok(await b.getByText('Valable pour 3 personnes').isVisible(), 'la page billet affiche le code QR et 3 personnes')
await b.screenshot({ path: path.join(OUT, '06-billet.png'), fullPage: true })
const pdfRes = await b.request.get(`${billetUrl.replace('/billet/', '/api/billet/')}/pdf`)
ok(pdfRes.status() === 200 && (await pdfRes.body()).subarray(0, 4).toString() === '%PDF', 'le reçu PDF se télécharge')
ok((await b.request.get(`${BASE}/billet/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).status() === 404, 'un faux billet renvoie une page introuvable')

// ---------------------------------------------------------------- 5. Agent : scan reel par la camera
console.log('5. Contrôle à l\'entrée (caméra simulée qui filme le code QR)')
const qrPng = path.join(OUT, 'qr.png')
await QRCode.toFile(qrPng, billetUrl, { width: 520, margin: 4 })
const y4m = path.join(OUT, 'qr.y4m')
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', qrPng, '-vf', 'pad=640:640:(ow-iw)/2:(oh-ih)/2:white', '-t', '2', '-r', '10', '-pix_fmt', 'yuv420p', y4m])

const camBrowser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM ?? undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`],
})
const agent = await camBrowser.newContext({ ...mobile, permissions: ['camera'] })
const s = await agent.newPage()
await s.goto(`${BASE}/scan/${SLUG}`)
await s.getByLabel('Votre prénom').fill('Moussa')
await s.getByLabel('Code d\'accès (6 chiffres)').fill('111111')
await s.getByRole('button', { name: 'Commencer le contrôle' }).click()
await s.getByText('Code incorrect.').waitFor()
ok(true, 'un mauvais code est refusé')
await s.getByLabel('Code d\'accès (6 chiffres)').fill('482917')
await s.screenshot({ path: path.join(OUT, '07-agent-code.png') })
await s.getByRole('button', { name: 'Commencer le contrôle' }).click()

await s.getByText('ENTRÉE VALIDÉE').waitFor({ timeout: 20000 })
ok(await s.getByText('Aya Konan').isVisible() && await s.getByText('3 personnes').isVisible(), 'scan du code QR : ENTRÉE VALIDÉE, Aya Konan, 3 personnes')
await s.screenshot({ path: path.join(OUT, '08-scan-valide.png') })

await s.getByText('DÉJÀ ENTRÉ').waitFor({ timeout: 20000 })
ok(await s.getByText(/contrôlé par Moussa/).isVisible(), 'le même billet scanné une 2e fois : DÉJÀ ENTRÉ, avec l\'heure et l\'agent')
await s.screenshot({ path: path.join(OUT, '09-scan-deja-entre.png') })

// Recherche manuelle (telephone oublie)
await s.getByText('Toucher pour continuer').click()
await s.getByRole('button', { name: 'Rechercher un nom' }).click()
await s.getByLabel('Rechercher un participant').fill('koffi')
await s.getByText('Koffi Yao').waitFor()
ok((await s.getByText('Faux Paiement').count()) === 0, 'la recherche ne montre que les paiements validés')
await s.screenshot({ path: path.join(OUT, '10-recherche.png') })
await s.getByRole('button', { name: 'Faire entrer' }).click()
await s.getByText('ENTRÉE VALIDÉE').waitFor({ timeout: 10000 })
ok(await s.getByText('Koffi Yao').isVisible(), 'entrée manuelle de Koffi après recherche par nom')

// Changer le code deconnecte les agents
await a.getByLabel('Nouveau code d\'accès').fill('555555')
await a.getByRole('button', { name: 'Changer' }).click()
await a.getByText(/^Code enregistré/).waitFor()
const apres = await s.request.get(`${BASE}/api/scan/${SLUG}/recherche?q=aya`)
ok(apres.status() === 401, 'changer le code déconnecte immédiatement les agents')

// L'admin voit les entrees
await a.reload()
await a.getByRole('button', { name: 'Validés' }).click()
ok(await a.getByText('4 / 4').isVisible(), 'le tableau de bord admin compte 4 personnes entrées sur 4')
await a.screenshot({ path: path.join(OUT, '11-admin-entrees.png'), fullPage: true })

// Fermeture des inscriptions
await a.getByLabel('Inscriptions ouvertes').uncheck()
await a.getByText(/^Inscriptions fermées\./).waitFor()
await p.goto(`${BASE}/evenement/${SLUG}`)
ok(await p.getByRole('heading', { name: 'Inscriptions fermées' }).isVisible(), 'quand l\'admin ferme les inscriptions, le formulaire disparaît')
await a.getByLabel('Inscriptions ouvertes').check()

await camBrowser.close()
await browser.close()
console.log(`\nTous les tests sont passés (${passed} vérifications).`)
