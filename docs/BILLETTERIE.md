# Billetterie 2ALSY

Module de billetterie intégré à l'application 2ALSY CUP. Il réutilise la même base Supabase, les mêmes comptes administrateurs et le même hébergement Vercel.

## Le parcours

1. **Participant** - ouvre `/evenement/octobre-rose-2026`, choisit ses places, paie par Wave ou Orange Money, saisit nom, téléphone, e-mail et, s'il est membre, son code promo (ex. AS45), ajoute la capture (ou la référence) et envoie.
2. **Administrateur** - reçoit un e-mail à chaque nouvelle inscription, avec un bouton vers l'espace admin. Dans `Administration > Billetterie`, vérifie la capture et clique sur **Valider**. Le participant reçoit aussitôt par e-mail son reçu en PDF avec un code QR, et un lien vers son billet en ligne.
3. **Agent d'accueil** - le jour J, ouvre `/scan/octobre-rose-2026` sur son téléphone, saisit le code à 6 chiffres donné par l'administrateur, et scanne les codes QR. L'écran devient vert (entrée validée), orange (déjà entré) ou rouge (billet inconnu ou non payé). Sans code QR, il recherche la personne par nom ou téléphone.

## Mise en service

1. **Base de données** : Supabase > SQL Editor > coller et exécuter `supabase/migration-billetterie.sql` (sans risque si relancé).
   Puis `supabase/admins-billetterie.sql` pour donner le rôle admin aux comptes concernés (étape 1 : vérifier la liste, étape 2 : promouvoir).
2. **Variables d'environnement Vercel** (Settings > Environment Variables) :

| Variable | Valeur |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` (secrète) |
| `RESEND_API_KEY` | Clé API Resend |
| `BILLETTERIE_FROM_EMAIL` | Expéditeur sur le domaine vérifié dans Resend, ex. `2ALSY Billetterie <billetterie@fierlah-agency.com>` |
| `BILLETTERIE_SECRET` | Texte aléatoire de 32 caractères minimum (signe les sessions des agents) |
| `BILLETTERIE_ADMIN_EMAILS` | Facultatif. Liste d'e-mails séparés par des virgules qui reçoivent l'alerte de nouvelle inscription. Si absent : tous les admins actifs. |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application, ex. `https://2alsy.fierlah-vertex.com` |

3. **Déployer** (fusion de la branche sur `main`).
4. **Définir le code des agents** : Administration > Billetterie > l'événement > « Code d'accès des agents d'accueil ».
5. **Test réel** : faire une inscription avec son propre e-mail, la valider, scanner le billet reçu.

## Administrateurs

- Un administrateur de la billetterie est un compte 2ALSY CUP avec le rôle `admin` ou `super_admin` (table `profiles`). Il n'y a pas de compte séparé.
- Connexion : `/connexion` avec son e-mail et son mot de passe habituels, puis menu **Administration > Billetterie**. Mot de passe oublié : `/mot-de-passe-oublie`.
- Ajouter un administrateur : il crée d'abord son compte membre normalement, puis on exécute `supabase/admins-billetterie.sql` avec son nom ou son e-mail.
- Les agents d'accueil n'ont pas besoin de compte : ils utilisent `/scan/<slug>` et le code à 6 chiffres. Un administrateur connecté peut scanner sans code.

## Changement de domaine

1. Vercel > Settings > Domains : ajouter le nouveau domaine.
2. Vercel > Environment Variables : mettre `NEXT_PUBLIC_APP_URL` à la nouvelle adresse, puis redéployer. Les codes QR déjà envoyés contiennent l'ancienne adresse : ils restent lisibles par le scanner (seul le jeton est lu), mais garder l'ancien domaine actif jusqu'à l'événement pour le lien « Afficher mon billet ».
3. Supabase > Authentication > URL Configuration : mettre la nouvelle adresse dans **Site URL** et l'ajouter aux **Redirect URLs** (sinon les e-mails de mot de passe oublié pointent vers l'ancien domaine).
4. Resend : l'expéditeur (`BILLETTERIE_FROM_EMAIL`) doit rester sur un domaine vérifié dans Resend, qui peut être différent du domaine du site.

## Sécurité

- Les prix sont toujours recalculés côté serveur : le montant envoyé par le navigateur est ignoré.
- Les captures sont stockées dans un espace privé, visibles seulement par les administrateurs (lien temporaire de 5 minutes).
- Le fichier envoyé est contrôlé par son contenu réel (JPG, PNG, WEBP ou PDF), pas par son nom.
- Le code QR contient un jeton aléatoire de 192 bits : impossible à deviner.
- L'entrée est enregistrée de façon atomique : un billet ne peut passer qu'une fois, même si deux agents le scannent en même temps.
- Changer le code des agents déconnecte immédiatement tous les agents.
- Les tables de la billetterie n'ont aucune politique d'accès public : tout passe par les routes serveur.
- La migration ferme aussi une faille existante : un membre pouvait modifier son propre rôle.

## Limites

- Resend gratuit : 100 e-mails par jour. Chaque inscription déclenche 1 message aux admins (tous en destinataires) et chaque validation 1 message (billet). Surveiller le compteur dans le tableau de bord Resend les jours de forte affluence ; au besoin, limiter l'alerte à 1 ou 2 personnes avec `BILLETTERIE_ADMIN_EMAILS`. Si l'e-mail échoue, l'inscription reste validée ; l'administrateur peut cliquer sur **Renvoyer** ou télécharger le billet PDF pour l'envoyer par WhatsApp.
- Le scan demande une connexion internet. Sans réseau, l'agent utilise la recherche par nom dès que le réseau revient, ou l'export Excel imprimé la veille.

## Tests

```bash
npm test              # tests unitaires (calculs, jetons, PDF dont le code QR est relu)
npm run test:e2e      # parcours complet dans un navigateur, avec une caméra simulée qui filme le code QR
```

Le parcours complet tourne en **mode test** (`BILLETTERIE_TEST_MODE=1`) : données en mémoire, e-mails écrits dans `.billetterie-test-mails/`. Ce mode est ignoré en production.

## Ajouter un autre événement

Insérer une ligne dans la table `events` (voir l'exemple Octobre Rose à la fin de la migration). Le lien d'inscription devient `/evenement/<slug>` et le contrôle `/scan/<slug>`.
