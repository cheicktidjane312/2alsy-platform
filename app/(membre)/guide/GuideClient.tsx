'use client'

import { BookOpen, UserPlus, LogIn, LayoutDashboard, Target, Award, Clock, BarChart2, History, UserCog, KeyRound } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import Card from '@/components/ui/Card'
import GlassCard from '@/components/ui/GlassCard'

const sections = [
  { id: 'creer-compte', label: 'Créer son compte', icon: UserPlus },
  { id: 'se-connecter', label: 'Se connecter', icon: LogIn },
  { id: 'tableau-de-bord', label: 'Comprendre le tableau de bord', icon: LayoutDashboard },
  { id: 'soumettre-pronostic', label: 'Soumettre un pronostic', icon: Target },
  { id: 'systeme-points', label: 'Système de points', icon: Award },
  { id: 'fenetre-malus', label: 'Fenêtre de jeu et malus', icon: Clock },
  { id: 'classement', label: 'Consulter le classement', icon: BarChart2 },
  { id: 'historique', label: 'Historique de mes pronostics', icon: History },
  { id: 'profil', label: 'Modifier mon profil', icon: UserCog },
  { id: 'mot-de-passe', label: 'Mot de passe oublié', icon: KeyRound },
]

function SectionNumber({ n }: { n: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
      {n}
    </div>
  )
}

export default function GuideClient() {
  return (
    <StaggerContainer className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <StaggerItem>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-blue-400">Guide du participant</h1>
        </div>
        <p className="text-slate-400 text-sm">Tout ce qu'il faut savoir pour jouer et gagner</p>
      </StaggerItem>

      {/* Sommaire */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Sommaire</h2>
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {sections.map(({ id, label, icon: Icon }, i) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-blue-400 hover:bg-blue-500/8 transition-all"
            >
              <span className="text-blue-400/50 font-mono text-xs w-5">{i + 1}.</span>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </nav>
      </GlassCard>

      {/* Section 1 */}
      <section id="creer-compte" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={1} />
          <h2 className="text-lg font-bold text-white">Créer son compte</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Pour participer à la 2ALSY CUP, tu dois créer un compte depuis la page d'inscription.
              Remplis le formulaire avec les informations suivantes :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><span className="text-slate-300">Code promo</span> - format obligatoire AS01 à AS49. Ce code identifie ta promotion au sein de la 2ALSY. Il ne pourra plus être modifié après inscription.</li>
              <li><span className="text-slate-300">Pseudo</span> - ton nom d'affichage dans le classement et les pronostics.</li>
              <li><span className="text-slate-300">Nom complet</span> - ton identité réelle pour les administrateurs.</li>
              <li><span className="text-slate-300">Email</span> - adresse email valide. Un seul compte par email est autorisé.</li>
              <li><span className="text-slate-300">Mot de passe</span> - minimum 8 caractères. Choisis un mot de passe que tu pourras retenir.</li>
            </ul>
            <p className="text-slate-500">
              Après validation du formulaire, un email de confirmation est envoyé à l'adresse renseignée.
              Vérifie tes spams si tu ne le reçois pas.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 2 */}
      <section id="se-connecter" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={2} />
          <h2 className="text-lg font-bold text-white">Se connecter</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Accède à ton espace depuis la page de connexion en saisissant ton email et ton mot de passe.
            </p>
            <p>
              Si tu as oublié ton mot de passe, clique sur le lien "Mot de passe oublié" situé sous le formulaire.
              Tu recevras un email pour le réinitialiser.
            </p>
            <p className="text-slate-500">
              Après connexion réussie, tu es automatiquement redirigé vers ton tableau de bord.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 3 */}
      <section id="tableau-de-bord" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={3} />
          <h2 className="text-lg font-bold text-white">Comprendre le tableau de bord</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Le tableau de bord est ta page d'accueil après connexion. Il te donne une vue d'ensemble de ta participation :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><span className="text-slate-300">Points totaux</span> - le cumul de tous tes points gagnés sur les matchs corrigés.</li>
              <li><span className="text-slate-300">Rang actuel</span> - ta position dans le classement général.</li>
              <li><span className="text-slate-300">Pronostics faits</span> - le nombre de tes derniers pronostics récents.</li>
              <li><span className="text-slate-300">Matchs ouverts</span> - le nombre de matchs en attente de tes pronostics.</li>
            </ul>
            <p>
              Tu y vois également les prochains matchs à pronostiquer et le Top 5 du classement en temps réel.
            </p>
            <p className="text-slate-500">
              Les données sont mises à jour après chaque correction de match par l'administrateur.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 4 */}
      <section id="soumettre-pronostic" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={4} />
          <h2 className="text-lg font-bold text-white">Soumettre un pronostic</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Pour chaque match, tu dois répondre à 4 questions :
            </p>
            <div className="space-y-2 pl-2">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono text-xs mt-0.5 flex-shrink-0">1.</span>
                <div><span className="text-white font-medium">Issue du match</span> - victoire de l'équipe domicile, nul, ou victoire de l'équipe extérieur.</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono text-xs mt-0.5 flex-shrink-0">2.</span>
                <div><span className="text-white font-medium">Score exact</span> - le score final que tu prédis (deux chiffres).</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono text-xs mt-0.5 flex-shrink-0">3.</span>
                <div><span className="text-white font-medium">Vainqueur</span> - déduit automatiquement de l'issue choisie (affiché uniquement si le résultat n'est pas un nul).</div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono text-xs mt-0.5 flex-shrink-0">4.</span>
                <div><span className="text-white font-medium">Équipe qui marque en premier</span> - domicile, extérieur ou aucun but.</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-300/80 text-xs mt-3">
              Un pronostic soumis est définitif. Aucune modification n'est possible après la soumission.
              Chaque match n'accepte qu'un seul pronostic par participant.
            </div>
          </div>
        </Card>
      </section>

      {/* Section 5 */}
      <section id="systeme-points" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={5} />
          <h2 className="text-lg font-bold text-white">Système de points</h2>
        </div>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-500/12">
                <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Question</th>
                <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Points si correct</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Issue du match (victoire / nul / défaite)', '2 points'],
                ['Vainqueur (ou nul correctement prédit)', '3 points'],
                ['Score exact', '6 points'],
                ['Équipe qui marque en premier', '4 points'],
              ].map(([q, pts], i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="py-3 px-5 text-slate-300">{q}</td>
                  <td className="py-3 px-5 text-right font-semibold text-blue-400">{pts}</td>
                </tr>
              ))}
              <tr className="bg-blue-500/5">
                <td className="py-3 px-5 text-white font-semibold">Maximum par match</td>
                <td className="py-3 px-5 text-right font-bold text-blue-400 text-base">15 points</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">
            Les points sont crédités uniquement après la correction officielle du match par l'administrateur.
            Avant correction, ton pronostic reste en statut "en attente".
          </p>
        </Card>
      </section>

      {/* Section 6 */}
      <section id="fenetre-malus" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={6} />
          <h2 className="text-lg font-bold text-white">Fenêtre de jeu et malus</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Tu peux pronostiquer un match depuis sa publication jusqu'à la 45e minute après le coup d'envoi.
              Plus tu soumets tard, plus le malus est élevé.
            </p>
          </div>
        </Card>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-500/12">
                <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Moment de soumission</th>
                <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Malus</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Avant le coup d\'envoi', '0 point', 'text-emerald-400'],
                ['1 à 10 minutes après', '-1 point', 'text-orange-400'],
                ['11 à 20 minutes après', '-2 points', 'text-orange-400'],
                ['21 à 30 minutes après', '-3 points', 'text-orange-400'],
                ['31 à 45 minutes après', '-4 points', 'text-red-400'],
                ['Après la 45e minute', 'Pronostic impossible', 'text-red-500'],
              ].map(([moment, malus, color], i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="py-3 px-5 text-slate-300">{moment}</td>
                  <td className={`py-3 px-5 text-right font-semibold ${color}`}>{malus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <div className="space-y-2 text-sm text-slate-400">
            <p>Le malus est calculé automatiquement par le serveur à l'heure exacte de la soumission.</p>
            <p>Les points nets ne peuvent jamais être négatifs - le minimum est toujours 0.</p>
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-slate-300 mt-2">
              <span className="text-slate-500">Exemple :</span> tu soumets à la 18e minute, tu as bon partout = 15 pts bruts - 2 pts de malus = <span className="text-blue-400 font-semibold">13 pts nets</span>.
            </div>
          </div>
        </Card>
      </section>

      {/* Section 7 */}
      <section id="classement" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={7} />
          <h2 className="text-lg font-bold text-white">Consulter le classement</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Le classement est accessible depuis le menu principal. Tu peux le consulter de deux façons :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><span className="text-slate-300">Général</span> - cumul de tous les matchs confondus, toutes phases.</li>
              <li><span className="text-slate-300">Par phase</span> - Phase de groupes, Seizièmes, Huitièmes, Quarts, Demi-finales, Match pour la 3e place, Finale.</li>
            </ul>
            <p>
              Le podium des 3 premiers est affiché en haut de page avec un visuel dédié.
              Ta propre ligne est mise en évidence dans le tableau par une bordure bleue.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 8 */}
      <section id="historique" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={8} />
          <h2 className="text-lg font-bold text-white">Historique de mes pronostics</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              La page "Historique" rassemble tous tes pronostics soumis, du plus récent au plus ancien. Pour chaque pronostic, tu vois :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>Tes réponses (issue, score, 1er but)</li>
              <li>Le résultat réel du match (après correction)</li>
              <li>Le détail des points obtenus par question</li>
              <li>Le malus éventuel et les points nets finaux</li>
            </ul>
            <p>
              Un filtre par phase est disponible pour retrouver rapidement tes pronostics d'une étape précise de la compétition.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 9 */}
      <section id="profil" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={9} />
          <h2 className="text-lg font-bold text-white">Modifier mon profil</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>Depuis la page "Mon profil", tu peux :</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><span className="text-slate-300">Modifier ton pseudo</span> - le nouveau pseudo sera visible partout (classement, pronostics).</li>
              <li><span className="text-slate-300">Changer ton mot de passe</span> - saisis ton mot de passe actuel puis le nouveau (minimum 8 caractères).</li>
            </ul>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-300/80 text-xs mt-2">
              L'email et le code promo sont définitifs. Ils ne peuvent pas être modifiés après l'inscription.
            </div>
          </div>
        </Card>
      </section>

      {/* Section 10 */}
      <section id="mot-de-passe" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={10} />
          <h2 className="text-lg font-bold text-white">Mot de passe oublié</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>Si tu as perdu ton mot de passe, suis ces étapes :</p>
            <div className="space-y-2 pl-2">
              {[
                'Clique sur "Mot de passe oublié" sur la page de connexion.',
                'Saisis l\'email utilisé lors de ton inscription.',
                'Vérifie ta boîte mail (regarde aussi dans les spams).',
                'Clique sur le lien reçu dans le mail - il est valable 1 heure.',
                'Choisis un nouveau mot de passe (minimum 8 caractères).',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-slate-400">{step}</span>
                </div>
              ))}
            </div>
            <p className="text-slate-500">
              Si tu ne reçois toujours pas l'email, contacte un administrateur de la 2ALSY CUP.
            </p>
          </div>
        </Card>
      </section>

      {/* Spacer */}
      <div className="h-8" />
    </StaggerContainer>
  )
}
