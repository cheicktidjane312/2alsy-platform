-- =====================================================================
-- 2ALSY CUP - Schema Supabase complet
-- Executer dans Supabase > SQL Editor > New query > Tout copier-coller
-- =====================================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pseudo TEXT NOT NULL,
  nom_complet TEXT NOT NULL,
  code_promo TEXT NOT NULL CHECK (code_promo ~ '^AS([0][1-9]|[1-4][0-9])$'),
  total_points INTEGER DEFAULT 0,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nom TEXT NOT NULL,
  annee INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  date_debut DATE,
  date_fin DATE
);

CREATE TABLE IF NOT EXISTS matchs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  equipe_domicile TEXT NOT NULL,
  equipe_exterieur TEXT NOT NULL,
  drapeau_domicile TEXT,
  drapeau_exterieur TEXT,
  heure_coup_envoi TIMESTAMPTZ NOT NULL,
  statut TEXT DEFAULT 'programmé' CHECK (statut IN ('programmé', 'ouvert', 'en_cours', 'terminé', 'annulé')),
  score_domicile INTEGER,
  score_exterieur INTEGER,
  equipe_premier_but TEXT CHECK (equipe_premier_but IN ('domicile', 'exterieur', 'aucun')),
  corrige BOOLEAN DEFAULT FALSE,
  corrige_at TIMESTAMPTZ,
  corrige_par UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS pronostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matchs(id) ON DELETE CASCADE,
  issue_pronostiquee TEXT NOT NULL CHECK (issue_pronostiquee IN ('domicile', 'exterieur', 'nul')),
  vainqueur_pronostique TEXT,
  score_domicile_prono INTEGER NOT NULL CHECK (score_domicile_prono >= 0 AND score_domicile_prono <= 20),
  score_exterieur_prono INTEGER NOT NULL CHECK (score_exterieur_prono >= 0 AND score_exterieur_prono <= 20),
  equipe_premier_but_prono TEXT NOT NULL CHECK (equipe_premier_but_prono IN ('domicile', 'exterieur', 'aucun')),
  soumis_at TIMESTAMPTZ DEFAULT NOW(),
  minutes_apres_coup_envoi INTEGER DEFAULT 0,
  malus INTEGER DEFAULT 0,
  points_issue INTEGER DEFAULT 0,
  points_vainqueur INTEGER DEFAULT 0,
  points_score INTEGER DEFAULT 0,
  points_premier_but INTEGER DEFAULT 0,
  points_bruts INTEGER DEFAULT 0,
  points_nets INTEGER DEFAULT 0,
  UNIQUE(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS classement_phases (
  user_id UUID REFERENCES profiles(id),
  phase_id UUID REFERENCES phases(id),
  points_phase INTEGER DEFAULT 0,
  matchs_joues INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, phase_id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE classement_phases ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Competitions, phases, matchs : lecture publique
CREATE POLICY "competitions_select_all" ON competitions FOR SELECT USING (true);
CREATE POLICY "phases_select_all" ON phases FOR SELECT USING (true);
CREATE POLICY "matchs_select_all" ON matchs FOR SELECT USING (true);

-- Matchs : admin peut tout faire
CREATE POLICY "matchs_admin_all" ON matchs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Competitions : admin peut tout faire
CREATE POLICY "competitions_admin_all" ON competitions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Phases : admin peut tout faire
CREATE POLICY "phases_admin_all" ON phases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Pronostics
CREATE POLICY "pronostics_select_own" ON pronostics FOR SELECT
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "pronostics_insert_own" ON pronostics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Classement phases : lecture publique
CREATE POLICY "classement_phases_select_all" ON classement_phases FOR SELECT USING (true);
CREATE POLICY "classement_phases_admin_all" ON classement_phases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- =====================================================================
-- TRIGGER : Creation automatique du profil a l'inscription
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo, nom_complet, code_promo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'pseudo', 'Anonyme'),
    COALESCE(NEW.raw_user_meta_data ->> 'nom_complet', 'Inconnu'),
    COALESCE(NEW.raw_user_meta_data ->> 'code_promo', 'AS01')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================================
-- TRIGGER : Calcul du timing et du malus au moment de la soumission
-- =====================================================================

CREATE OR REPLACE FUNCTION compute_prono_timing()
RETURNS TRIGGER AS $$
DECLARE
  match_kickoff TIMESTAMPTZ;
  diff_minutes INTEGER;
BEGIN
  SELECT heure_coup_envoi INTO match_kickoff FROM matchs WHERE id = NEW.match_id;
  diff_minutes := EXTRACT(EPOCH FROM (NEW.soumis_at - match_kickoff)) / 60;

  IF diff_minutes < 0 THEN
    NEW.minutes_apres_coup_envoi := 0;
    NEW.malus := 0;
  ELSIF diff_minutes <= 10 THEN
    NEW.minutes_apres_coup_envoi := diff_minutes;
    NEW.malus := 1;
  ELSIF diff_minutes <= 20 THEN
    NEW.minutes_apres_coup_envoi := diff_minutes;
    NEW.malus := 2;
  ELSIF diff_minutes <= 30 THEN
    NEW.minutes_apres_coup_envoi := diff_minutes;
    NEW.malus := 3;
  ELSIF diff_minutes <= 45 THEN
    NEW.minutes_apres_coup_envoi := diff_minutes;
    NEW.malus := 4;
  ELSE
    RAISE EXCEPTION 'Pronostic ferme : la mi-temps est passee';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prono_timing ON pronostics;
CREATE TRIGGER trigger_prono_timing
  BEFORE INSERT ON pronostics
  FOR EACH ROW EXECUTE FUNCTION compute_prono_timing();

-- =====================================================================
-- FONCTION : Correction d'un match (appelee par l'admin)
-- =====================================================================

CREATE OR REPLACE FUNCTION corriger_match(p_match_id UUID, p_admin_id UUID)
RETURNS void AS $$
DECLARE
  m RECORD;
  p RECORD;
  pts_issue INTEGER := 0;
  pts_vainqueur INTEGER := 0;
  pts_score INTEGER := 0;
  pts_premier_but INTEGER := 0;
  pts_bruts INTEGER := 0;
  pts_nets INTEGER := 0;
  issue_reelle TEXT;
BEGIN
  SELECT * INTO m FROM matchs WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match introuvable';
  END IF;
  IF m.corrige THEN
    RAISE EXCEPTION 'Match deja corrige';
  END IF;
  IF m.score_domicile IS NULL THEN
    RAISE EXCEPTION 'Resultats non saisis';
  END IF;

  -- Determiner l'issue reelle
  IF m.score_domicile > m.score_exterieur THEN
    issue_reelle := 'domicile';
  ELSIF m.score_domicile < m.score_exterieur THEN
    issue_reelle := 'exterieur';
  ELSE
    issue_reelle := 'nul';
  END IF;

  -- Corriger chaque pronostic
  FOR p IN SELECT * FROM pronostics WHERE match_id = p_match_id LOOP
    pts_issue := 0; pts_vainqueur := 0; pts_score := 0; pts_premier_but := 0;

    -- Issue (2 pts)
    IF p.issue_pronostiquee = issue_reelle THEN
      pts_issue := 2;
    END IF;

    -- Vainqueur (3 pts)
    IF issue_reelle = 'nul' THEN
      IF p.issue_pronostiquee = 'nul' THEN
        pts_vainqueur := 3;
      END IF;
    ELSIF p.vainqueur_pronostique = issue_reelle THEN
      pts_vainqueur := 3;
    END IF;

    -- Score exact (6 pts)
    IF p.score_domicile_prono = m.score_domicile AND p.score_exterieur_prono = m.score_exterieur THEN
      pts_score := 6;
    END IF;

    -- Premier but (4 pts)
    IF p.equipe_premier_but_prono = m.equipe_premier_but THEN
      pts_premier_but := 4;
    END IF;

    pts_bruts := pts_issue + pts_vainqueur + pts_score + pts_premier_but;
    pts_nets := GREATEST(0, pts_bruts - p.malus);

    UPDATE pronostics SET
      points_issue = pts_issue,
      points_vainqueur = pts_vainqueur,
      points_score = pts_score,
      points_premier_but = pts_premier_but,
      points_bruts = pts_bruts,
      points_nets = pts_nets
    WHERE id = p.id;
  END LOOP;

  -- Marquer le match comme corrige AVANT le recalcul des totaux
  UPDATE matchs SET
    corrige = TRUE,
    corrige_at = NOW(),
    corrige_par = p_admin_id,
    statut = 'terminé'
  WHERE id = p_match_id;

  -- Recalculer total_points depuis la source de verite (somme des points_nets)
  UPDATE profiles SET total_points = COALESCE(sub.somme, 0)
  FROM (
    SELECT pr.user_id, SUM(pr.points_nets) AS somme
    FROM pronostics pr
    JOIN matchs m2 ON m2.id = pr.match_id AND m2.corrige = TRUE
    GROUP BY pr.user_id
  ) sub
  WHERE profiles.id = sub.user_id
    AND profiles.id IN (SELECT user_id FROM pronostics WHERE match_id = p_match_id);

  -- Recalculer classement_phases pour les joueurs concernes
  DELETE FROM classement_phases
  WHERE user_id IN (SELECT user_id FROM pronostics WHERE match_id = p_match_id);

  INSERT INTO classement_phases (user_id, phase_id, points_phase, matchs_joues)
  SELECT pr.user_id, m2.phase_id, SUM(pr.points_nets), COUNT(*)
  FROM pronostics pr
  JOIN matchs m2 ON m2.id = pr.match_id AND m2.corrige = TRUE
  AND pr.user_id IN (SELECT user_id FROM pronostics WHERE match_id = p_match_id)
  GROUP BY pr.user_id, m2.phase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner acces a la fonction aux utilisateurs authentifies
GRANT EXECUTE ON FUNCTION corriger_match(UUID, UUID) TO authenticated;

-- =====================================================================
-- DONNEES INITIALES
-- =====================================================================

-- Competition Coupe du Monde 2026
INSERT INTO competitions (nom, annee, is_active) VALUES ('Coupe du Monde 2026', 2026, true)
ON CONFLICT DO NOTHING;

-- Phases (recuperer l'id de la competition)
DO $$
DECLARE
  comp_id UUID;
BEGIN
  SELECT id INTO comp_id FROM competitions WHERE annee = 2026 LIMIT 1;

  INSERT INTO phases (competition_id, nom, ordre, date_debut, date_fin) VALUES
    (comp_id, 'Phase de groupes', 1, '2026-06-11', '2026-06-27'),
    (comp_id, 'Seizièmes de finale', 2, '2026-06-28', '2026-07-03'),
    (comp_id, 'Huitièmes de finale', 3, '2026-07-04', '2026-07-07'),
    (comp_id, 'Quarts de finale', 4, '2026-07-09', '2026-07-12'),
    (comp_id, 'Demi-finales', 5, '2026-07-14', '2026-07-15'),
    (comp_id, 'Match 3e place', 6, '2026-07-18', '2026-07-18'),
    (comp_id, 'Finale', 7, '2026-07-19', '2026-07-19')
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================================
-- PREMIER SUPER ADMIN
-- Remplacez 'VOTRE_USER_ID' par l'UUID de votre compte Supabase
-- (visible dans Authentication > Users apres votre premiere inscription)
-- =====================================================================

-- UPDATE profiles SET role = 'super_admin' WHERE id = 'VOTRE_USER_ID';

-- =====================================================================
-- FIN DU SCHEMA
-- =====================================================================
