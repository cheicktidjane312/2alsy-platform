-- =====================================================================
-- Administrateurs de la billetterie
-- A executer dans Supabase > SQL Editor, APRES migration-billetterie.sql.
--
-- Un administrateur de la billetterie est simplement un compte 2ALSY CUP
-- dont le role est 'admin' ou 'super_admin'. Il se connecte sur /connexion
-- avec son e-mail et son mot de passe habituels, puis ouvre
-- Administration > Billetterie.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ETAPE 1 - Verifier qui est concerne (lecture seule, sans risque)
-- Lancer ce bloc seul d'abord et verifier la liste.
-- ---------------------------------------------------------------------
SELECT p.pseudo, p.nom_complet, p.code_promo, p.role, p.is_active, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.pseudo ILIKE ANY (ARRAY['%admin1%', '%admin2%'])
   OR p.nom_complet ILIKE ANY (ARRAY['%admin1%', '%admin2%'])
   OR u.email ILIKE ANY (ARRAY['%admin1%', '%admin2%'])
ORDER BY p.role DESC, p.pseudo;

-- Liste de tous les administrateurs actuels (ce sont eux qui recoivent
-- l'e-mail a chaque nouvelle inscription) :
SELECT p.pseudo, p.nom_complet, p.role, p.is_active, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('admin', 'super_admin')
ORDER BY p.role DESC, p.pseudo;

-- ---------------------------------------------------------------------
-- ETAPE 2 - Donner le role admin
-- Chaque motif doit designer UN SEUL compte, sinon rien n'est modifie
-- et un message explique pourquoi. Un super_admin reste super_admin.
-- Si un motif ne trouve personne, remplacez-le par l'e-mail exact vu
-- a l'etape 1 (ex. 'admin@example.com').
-- ---------------------------------------------------------------------
DO $$
DECLARE
  motif TEXT;
  nb INT;
  motifs TEXT[] := ARRAY['%admin1%', '%admin2%'];
BEGIN
  FOREACH motif IN ARRAY motifs LOOP
    SELECT count(*) INTO nb
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.pseudo ILIKE motif OR p.nom_complet ILIKE motif OR u.email ILIKE motif;

    IF nb <> 1 THEN
      RAISE EXCEPTION 'Le motif % correspond a % compte(s) : precisez-le (e-mail exact) puis relancez. Rien n''a ete modifie.', motif, nb;
    END IF;
  END LOOP;

  UPDATE public.profiles p
  SET role = 'admin', is_active = TRUE
  FROM auth.users u
  WHERE u.id = p.id
    AND p.role <> 'super_admin'
    AND (p.pseudo ILIKE ANY (motifs) OR p.nom_complet ILIKE ANY (motifs) OR u.email ILIKE ANY (motifs));

  -- Garde le compte actif si c'est deja un super_admin
  UPDATE public.profiles p
  SET is_active = TRUE
  FROM auth.users u
  WHERE u.id = p.id
    AND p.role = 'super_admin'
    AND (p.pseudo ILIKE ANY (motifs) OR p.nom_complet ILIKE ANY (motifs) OR u.email ILIKE ANY (motifs));
END $$;

-- ---------------------------------------------------------------------
-- ETAPE 3 - Controle final : les 3 comptes doivent apparaitre ici
-- ---------------------------------------------------------------------
SELECT p.pseudo, p.nom_complet, p.role, p.is_active, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('admin', 'super_admin')
ORDER BY p.role DESC, p.pseudo;
