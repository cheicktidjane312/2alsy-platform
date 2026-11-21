export type Role = 'member' | 'admin' | 'super_admin'
export type MatchStatut = 'programmé' | 'ouvert' | 'en_cours' | 'terminé' | 'annulé'
export type Issue = 'domicile' | 'exterieur' | 'nul'
export type PremierBut = 'domicile' | 'exterieur' | 'aucun'

export interface Profile {
  id: string
  created_at: string
  pseudo: string
  nom_complet: string
  code_promo: string
  total_points: number
  role: Role
  is_active: boolean
}

export interface Competition {
  id: string
  created_at: string
  nom: string
  annee: number
  is_active: boolean
}

export interface Phase {
  id: string
  competition_id: string
  nom: string
  ordre: number
  date_debut: string | null
  date_fin: string | null
  competition?: Competition
}

export interface Match {
  id: string
  created_at: string
  phase_id: string
  equipe_domicile: string
  equipe_exterieur: string
  drapeau_domicile: string | null
  drapeau_exterieur: string | null
  heure_coup_envoi: string
  statut: MatchStatut
  score_domicile: number | null
  score_exterieur: number | null
  equipe_premier_but: PremierBut | null
  corrige: boolean
  corrige_at: string | null
  corrige_par: string | null
  phase?: Phase
}

export interface Pronostic {
  id: string
  created_at: string
  user_id: string
  match_id: string
  issue_pronostiquee: Issue
  vainqueur_pronostique: string | null
  score_domicile_prono: number
  score_exterieur_prono: number
  equipe_premier_but_prono: PremierBut
  soumis_at: string
  minutes_apres_coup_envoi: number
  malus: number
  points_issue: number
  points_vainqueur: number
  points_score: number
  points_premier_but: number
  points_bruts: number
  points_nets: number
  match?: Match
  profile?: Profile
}

export interface ClassementPhase {
  user_id: string
  phase_id: string
  points_phase: number
  matchs_joues: number
  profile?: Profile
  phase?: Phase
}

export interface ClassementEntry {
  rang: number
  user_id: string
  pseudo: string
  nom_complet: string
  code_promo: string
  total_points: number
  matchs_joues?: number
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      competitions: { Row: Competition; Insert: Omit<Competition, 'id' | 'created_at'>; Update: Partial<Competition> }
      phases: { Row: Phase; Insert: Omit<Phase, 'id'>; Update: Partial<Phase> }
      matchs: { Row: Match; Insert: Omit<Match, 'id' | 'created_at'>; Update: Partial<Match> }
      pronostics: { Row: Pronostic; Insert: Omit<Pronostic, 'id' | 'created_at' | 'minutes_apres_coup_envoi' | 'malus' | 'points_issue' | 'points_vainqueur' | 'points_score' | 'points_premier_but' | 'points_bruts' | 'points_nets'>; Update: Partial<Pronostic> }
      classement_phases: { Row: ClassementPhase; Insert: ClassementPhase; Update: Partial<ClassementPhase> }
    }
  }
}
