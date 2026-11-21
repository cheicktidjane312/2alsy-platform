'use client'

import Link from 'next/link'
import { BookOpen, LayoutDashboard, Calendar, ClipboardCheck, CheckSquare, Layers, Users, Shield, ListChecks, Scale, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import Card from '@/components/ui/Card'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

const sections = [
  { id: 'dashboard', label: 'Vue d\'ensemble du dashboard admin', icon: LayoutDashboard },
  { id: 'matchs', label: 'Créer et gérer les matchs', icon: Calendar },
  { id: 'resultats', label: 'Saisir les résultats d\'un match', icon: ClipboardCheck },
  { id: 'corriger', label: 'Corriger un match et attribuer les points', icon: CheckSquare },
  { id: 'phases', label: 'Gérer les phases de la compétition', icon: Layers },
  { id: 'membres', label: 'Gérer les membres', icon: Users },
  { id: 'admins', label: 'Gérer les administrateurs', icon: Shield },
  { id: 'jour-match', label: 'Procédure complète jour de match', icon: ListChecks },
  { id: 'regles', label: 'Règles et contraintes du système', icon: Scale },
]

function SectionNumber({ n }: { n: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
      {n}
    </div>
  )
}

function ChecklistItem({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'before' | 'during' | 'after' | 'default' }) {
  const colors = {
    before: 'border-blue-500/20 bg-blue-500/5',
    during: 'border-amber-500/20 bg-amber-500/5',
    after: 'border-emerald-500/20 bg-emerald-500/5',
    default: 'border-white/10 bg-white/[0.02]',
  }
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[variant]}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
      <span className="text-sm text-slate-300">{children}</span>
    </div>
  )
}

export default function AdminGuideClient() {
  return (
    <StaggerContainer className="space-y-8">
      {/* Header */}
      <StaggerItem>
        <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors mb-4 md:hidden">
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
        <Badge variant="default" className="mb-3">Espace Administrateur</Badge>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-blue-400">Guide de l'administrateur</h1>
        </div>
        <p className="text-slate-400 text-sm">Gestion complète de 2ALSY CUP 2026</p>
      </StaggerItem>

      {/* Sommaire */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Sommaire</h2>
        <nav className="grid grid-cols-1 gap-1.5">
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
      <section id="dashboard" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={1} />
          <h2 className="text-lg font-bold text-white">Vue d'ensemble du dashboard admin</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>Le tableau de bord administrateur affiche 4 indicateurs clés :</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><span className="text-slate-300">Membres actifs</span> - nombre total de comptes actifs.</li>
              <li><span className="text-slate-300">Pronostics soumis</span> - nombre total de pronostics tous participants confondus.</li>
              <li><span className="text-slate-300">Matchs corrigés</span> - nombre de matchs dont les points ont été distribués.</li>
              <li><span className="text-slate-300">À corriger</span> - matchs terminés en attente de saisie des résultats.</li>
            </ul>
            <p>
              Si des matchs sont à corriger, une alerte orange s'affiche en haut du tableau de bord avec un lien direct vers la page de résultats.
            </p>
            <p>
              Trois liens d'accès rapide permettent d'aller directement vers la gestion des matchs, la saisie des résultats ou la gestion des membres.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 2 */}
      <section id="matchs" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={2} />
          <h2 className="text-lg font-bold text-white">Créer et gérer les matchs</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>Depuis <span className="text-blue-400">Admin &gt; Matchs</span>, tu peux créer de nouveaux matchs et modifier ceux existants.</p>
            <p className="font-medium text-white">Créer un match</p>
            <p>Clique sur "Nouveau match" et renseigne les champs obligatoires :</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><span className="text-slate-300">Phase</span> - sélectionne la phase de compétition (groupes, huitièmes, etc.).</li>
              <li><span className="text-slate-300">Équipe domicile et extérieur</span> - les noms des deux équipes.</li>
              <li><span className="text-slate-300">Codes pays ISO</span> - codes à 2 lettres pour les drapeaux (FR, CI, BR, etc.).</li>
              <li><span className="text-slate-300">Date et heure du coup d'envoi</span> - en heure locale (GMT+0 / heure de Côte d'Ivoire).</li>
            </ul>
            <p className="font-medium text-white mt-3">Modifier un match</p>
            <p className="text-slate-400">
              Clique sur l'icône de modification à côté du match. Seuls les matchs non corrigés peuvent être modifiés.
            </p>
            <p className="font-medium text-white mt-3">Désactiver un match</p>
            <p className="text-slate-400">
              Clique sur l'icône de suppression pour basculer un match en statut "annulé".
              Cette action est réversible : un clic supplémentaire remet le match en statut "programmé".
            </p>
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-slate-400 text-xs mt-2">
              Les matchs des phases éliminatoires (huitièmes, quarts, etc.) doivent être créés au fur et à mesure, une fois les équipes qualifiées connues.
            </div>
          </div>
        </Card>
      </section>

      {/* Section 3 */}
      <section id="resultats" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={3} />
          <h2 className="text-lg font-bold text-white">Saisir les résultats d'un match</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>Depuis <span className="text-blue-400">Admin &gt; Résultats</span>, tu accèdes aux matchs terminés dont les scores n'ont pas encore été saisis.</p>
            <p>Pour chaque match, saisis :</p>
            <div className="space-y-2 pl-2">
              {[
                'Le score final de l\'équipe domicile.',
                'Le score final de l\'équipe extérieur.',
                'L\'équipe qui a marqué le premier but (domicile, extérieur, ou aucun but).',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-slate-400">{step}</span>
                </div>
              ))}
            </div>
            <p>Clique sur "Sauvegarder le score" pour enregistrer les résultats. Le match passe alors en statut "prêt à corriger".</p>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-300/80 text-xs mt-2">
              Vérifie bien les données avant de sauvegarder. Ces résultats seront utilisés pour corriger tous les pronostics des participants.
            </div>
          </div>
        </Card>
      </section>

      {/* Section 4 */}
      <section id="corriger" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={4} />
          <h2 className="text-lg font-bold text-white">Corriger un match et attribuer les points</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Une fois les résultats saisis, le match apparaît dans la section "Prêts à être corrigés".
              Clique sur <span className="text-blue-400">"Corriger les pronostics"</span> pour lancer le calcul automatique.
            </p>
            <p className="font-medium text-white">Ce que fait le système automatiquement :</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>Compare chaque pronostic soumis avec les résultats réels.</li>
              <li>Calcule les points pour chacune des 4 questions (issue, vainqueur, score exact, 1er but).</li>
              <li>Applique le malus selon l'heure de soumission de chaque participant.</li>
              <li>Crédite les points nets sur le profil de chaque participant.</li>
              <li>Met à jour le classement général et le classement de la phase correspondante.</li>
            </ul>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 text-red-300/80 text-xs mt-2">
              Cette action est irréversible. Un match corrigé ne peut pas être recorrigé. Vérifie les résultats avant de corriger.
            </div>
          </div>
        </Card>
      </section>

      {/* Section 5 */}
      <section id="phases" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={5} />
          <h2 className="text-lg font-bold text-white">Gérer les phases de la compétition</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>Les 7 phases de la Coupe du Monde 2026 sont déjà configurées dans le système :</p>
            <div className="space-y-1.5 pl-2">
              {[
                'Phase de groupes (11 - 27 juin)',
                'Seizièmes de finale (28 juin - 3 juillet)',
                'Huitièmes de finale (4 - 7 juillet)',
                'Quarts de finale (9 - 12 juillet)',
                'Demi-finales (14 - 15 juillet)',
                'Match pour la 3e place (18 juillet)',
                'Finale (19 juillet)',
              ].map((phase, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-slate-400">{phase}</span>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Les matchs éliminatoires sont créés progressivement au fil de la compétition, une fois les équipes qualifiées connues.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 6 */}
      <section id="membres" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={6} />
          <h2 className="text-lg font-bold text-white">Gérer les membres</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Depuis <span className="text-blue-400">Admin &gt; Membres</span>, tu accèdes à la liste complète des inscrits.
              Un champ de recherche permet de filtrer par pseudo, nom ou code promo.
            </p>
            <p>Pour chaque membre, tu vois :</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>Pseudo et nom complet</li>
              <li>Code promo (promotion)</li>
              <li>Points totaux accumulés</li>
              <li>Nombre de pronostics soumis</li>
              <li>Statut du compte (actif / désactivé)</li>
            </ul>
            <p className="font-medium text-white mt-3">Désactiver un compte</p>
            <p className="text-slate-400">
              Clique sur l'icône rouge à droite du membre. Un compte désactivé empêche le membre de se connecter.
              Il verra un message l'invitant à contacter un administrateur.
            </p>
            <p className="font-medium text-white mt-3">Réactiver un compte</p>
            <p className="text-slate-400">
              Clique sur l'icône verte qui apparaît à côté d'un compte désactivé.
              Le membre pourra de nouveau se connecter immédiatement.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 7 */}
      <section id="admins" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={7} />
          <h2 className="text-lg font-bold text-white">Gérer les administrateurs</h2>
        </div>
        <Card>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              La page <span className="text-blue-400">Admin &gt; Admins</span> liste les administrateurs actuels avec leur rôle
              (Admin ou Super Admin).
            </p>
            <p>
              Le retrait des droits admin est possible depuis l'interface pour les comptes de type "Admin".
              Les Super Admins ne peuvent pas être rétrogradés depuis l'interface.
            </p>
            <p>
              Pour ajouter un nouvel administrateur, contacte le responsable technique.
              Le membre concerné doit déjà avoir un compte actif sur la plateforme.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 8 */}
      <section id="jour-match" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={8} />
          <h2 className="text-lg font-bold text-white">Procédure complète jour de match</h2>
        </div>

        <Card>
          <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">Avant le match</h3>
          <div className="space-y-2">
            <ChecklistItem variant="before">Vérifier que le match est bien créé avec la bonne heure de coup d'envoi.</ChecklistItem>
            <ChecklistItem variant="before">Vérifier que les pronostics sont ouverts (statut "Programmé" ou "Ouvert").</ChecklistItem>
            <ChecklistItem variant="before">S'assurer que l'heure saisie est correcte (GMT+0, heure de Côte d'Ivoire).</ChecklistItem>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wider">Pendant le match</h3>
          <div className="space-y-2">
            <ChecklistItem variant="during">Les pronostics tardifs (0-45 min) sont acceptés automatiquement avec malus progressif.</ChecklistItem>
            <ChecklistItem variant="during">Après la 45e minute, les pronostics se ferment automatiquement.</ChecklistItem>
            <ChecklistItem variant="during">Aucune action admin requise pendant le match.</ChecklistItem>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Après le match</h3>
          <div className="space-y-2">
            <ChecklistItem variant="after">Aller dans Admin &gt; Résultats.</ChecklistItem>
            <ChecklistItem variant="after">Saisir le score final (domicile - extérieur).</ChecklistItem>
            <ChecklistItem variant="after">Sélectionner l'équipe qui a marqué en premier (ou "Aucun but").</ChecklistItem>
            <ChecklistItem variant="after">Vérifier les données une dernière fois.</ChecklistItem>
            <ChecklistItem variant="after">Cliquer "Corriger les pronostics".</ChecklistItem>
            <ChecklistItem variant="after">Vérifier dans le classement que les points sont bien mis à jour.</ChecklistItem>
          </div>
        </Card>
      </section>

      {/* Section 9 */}
      <section id="regles" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-3">
          <SectionNumber n={9} />
          <h2 className="text-lg font-bold text-white">Règles et contraintes du système</h2>
        </div>
        <Card>
          <div className="space-y-2">
            {[
              'Un seul pronostic par participant par match - impossible d\'en soumettre deux.',
              'Aucune modification de pronostic après soumission.',
              'Les points sont calculés côté serveur uniquement - aucune manipulation possible.',
              'Le malus est calculé à l\'heure exacte de soumission enregistrée par le serveur.',
              'Les points nets sont toujours supérieurs ou égaux à zéro.',
              'Un match ne peut être corrigé qu\'une seule fois.',
              'La correction est irréversible - vérifier les résultats avant de lancer.',
              'Seuls les super administrateurs peuvent accéder à la page de gestion des admins.',
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{rule}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Spacer */}
      <div className="h-8" />
    </StaggerContainer>
  )
}
