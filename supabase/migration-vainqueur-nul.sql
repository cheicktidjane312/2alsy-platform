-- =====================================================================
-- MIGRATION : Fix vainqueur nul + reconciliation complete des points
-- A executer dans Supabase > SQL Editor > New query
-- =====================================================================

-- =====================================================================
-- ETAPE 1 : Mettre a jour la fonction corriger_match
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

  IF m.score_domicile > m.score_exterieur THEN
    issue_reelle := 'domicile';
  ELSIF m.score_domicile < m.score_exterieur THEN
    issue_reelle := 'exterieur';
  ELSE
    issue_reelle := 'nul';
  END IF;

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

  -- On ne met plus a jour profiles.total_points dans la boucle.
  -- On recalcule TOUT en une fois apres la boucle pour eviter les derives.
  UPDATE profiles SET total_points = COALESCE(sub.somme, 0)
  FROM (
    SELECT pr.user_id, SUM(pr.points_nets) AS somme
    FROM pronostics pr
    JOIN matchs m2 ON m2.id = pr.match_id
    WHERE m2.corrige = TRUE OR m2.id = p_match_id
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
  JOIN matchs m2 ON m2.id = pr.match_id
  WHERE (m2.corrige = TRUE OR m2.id = p_match_id)
    AND pr.user_id IN (SELECT user_id FROM pronostics WHERE match_id = p_match_id)
  GROUP BY pr.user_id, m2.phase_id
  ON CONFLICT (user_id, phase_id) DO UPDATE SET
    points_phase = EXCLUDED.points_phase,
    matchs_joues = EXCLUDED.matchs_joues;

  UPDATE matchs SET
    corrige = TRUE,
    corrige_at = NOW(),
    corrige_par = p_admin_id,
    statut = 'terminé'
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- ETAPE 2 : Corriger les points_vainqueur des matchs nuls deja corriges
-- =====================================================================
UPDATE pronostics SET
  points_vainqueur = 3,
  points_bruts = points_issue + 3 + points_score + points_premier_but,
  points_nets = GREATEST(0, points_issue + 3 + points_score + points_premier_but - malus)
FROM matchs m
WHERE pronostics.match_id = m.id
  AND m.corrige = TRUE
  AND m.score_domicile = m.score_exterieur
  AND pronostics.issue_pronostiquee = 'nul'
  AND pronostics.points_vainqueur = 0;

-- =====================================================================
-- ETAPE 3 : Reconciliation complete de profiles.total_points
-- Recalcule a partir de la somme reelle des points_nets
-- =====================================================================
UPDATE profiles SET total_points = COALESCE(sub.somme, 0)
FROM (
  SELECT pr.user_id, SUM(pr.points_nets) AS somme
  FROM pronostics pr
  JOIN matchs m ON m.id = pr.match_id AND m.corrige = TRUE
  GROUP BY pr.user_id
) sub
WHERE profiles.id = sub.user_id;

-- Remettre a 0 les profils qui n'ont aucun pronostic corrige
UPDATE profiles SET total_points = 0
WHERE id NOT IN (
  SELECT DISTINCT pr.user_id FROM pronostics pr
  JOIN matchs m ON m.id = pr.match_id AND m.corrige = TRUE
);

-- =====================================================================
-- ETAPE 4 : Reconciliation complete de classement_phases
-- =====================================================================
TRUNCATE classement_phases;

INSERT INTO classement_phases (user_id, phase_id, points_phase, matchs_joues)
SELECT pr.user_id, m.phase_id, SUM(pr.points_nets), COUNT(*)
FROM pronostics pr
JOIN matchs m ON m.id = pr.match_id AND m.corrige = TRUE
GROUP BY pr.user_id, m.phase_id;
