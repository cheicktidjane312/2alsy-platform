-- =====================================================================
-- 2ALSY - Module Billetterie (evenements, inscriptions, recus a code QR)
-- A executer UNE FOIS dans Supabase > SQL Editor > New query.
-- Le script est idempotent : il peut etre relance sans casser l'existant.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Securite : empecher un membre de modifier lui-meme son role.
--    La politique "profiles_update_own" laissait un membre passer son
--    propre role a 'super_admin'. Ce module donne aux admins le pouvoir
--    de valider des paiements : la faille doit etre fermee.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Appels systeme (cle service, fonctions SECURITY DEFINER) : autorises
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = TRUE
  ) INTO caller_is_admin;

  IF caller_is_admin THEN
    -- Seul un super_admin peut attribuer ou retirer le role super_admin
    IF (NEW.role = 'super_admin' OR OLD.role = 'super_admin') AND NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
        RAISE EXCEPTION 'Seul un super administrateur peut modifier ce role';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.total_points IS DISTINCT FROM OLD.total_points THEN
    RAISE EXCEPTION 'Modification non autorisee';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_profile_privileges ON profiles;
CREATE TRIGGER trigger_protect_profile_privileges
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_privileges();

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  code TEXT NOT NULL CHECK (code ~ '^[A-Z0-9]{2,8}$'),
  titre TEXT NOT NULL,
  sous_titre TEXT,
  date_label TEXT NOT NULL,
  horaire TEXT,
  lieu TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  description TEXT,
  dress_code TEXT,
  -- Tarifs : [{"code":"adulte","label":"Adulte","prix":8000}, ...]
  categories JSONB NOT NULL,
  paiement_numero TEXT NOT NULL,
  paiement_moyens TEXT NOT NULL DEFAULT 'Wave et Orange Money',
  paiement_beneficiaire TEXT,
  date_limite TIMESTAMPTZ,
  contact TEXT,
  places_max INTEGER CHECK (places_max IS NULL OR places_max > 0),
  inscriptions_ouvertes BOOLEAN NOT NULL DEFAULT TRUE,
  scan_pin_hash TEXT
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL CHECK (char_length(nom_complet) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) <= 160),
  telephone TEXT NOT NULL CHECK (char_length(telephone) BETWEEN 8 AND 25),
  -- Quantites par categorie : {"adulte":1,"etudiant":2}
  quantites JSONB NOT NULL,
  nb_personnes INTEGER NOT NULL CHECK (nb_personnes BETWEEN 1 AND 20),
  montant INTEGER NOT NULL CHECK (montant >= 0),
  moyen_paiement TEXT NOT NULL CHECK (moyen_paiement IN ('wave', 'orange_money', 'autre')),
  reference_paiement TEXT CHECK (reference_paiement IS NULL OR char_length(reference_paiement) <= 80),
  preuve_path TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'refuse')),
  motif_refus TEXT,
  valide_at TIMESTAMPTZ,
  valide_par UUID REFERENCES profiles(id),
  ticket_token TEXT UNIQUE,
  email_envoye_at TIMESTAMPTZ,
  email_erreur TEXT,
  entre_at TIMESTAMPTZ,
  entre_par TEXT,
  CHECK (reference_paiement IS NOT NULL OR preuve_path IS NOT NULL)
);

-- Code promo du membre 2ALSY (facultatif : les invites non membres n'en ont pas)
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS code_promo TEXT;
DO $$ BEGIN
  ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_code_promo_check
    CHECK (code_promo IS NULL OR code_promo ~ '^AS(0[1-9]|[1-4][0-9])$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_statut ON event_registrations(event_id, statut);

-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    Aucune politique publique : toutes les lectures et ecritures passent
--    par les routes serveur de l'application (cle service), qui verifient
--    elles-memes le role admin ou le code d'acces des agents.
-- ---------------------------------------------------------------------
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. Stockage des captures de paiement (prive)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('billetterie-preuves', 'billetterie-preuves', FALSE, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Evenement : Pique-nique Octobre Rose 2026
--    Le code d'acces des agents se definit ensuite dans
--    Administration > Billetterie > Octobre Rose.
-- ---------------------------------------------------------------------
INSERT INTO events (
  slug, code, titre, sous_titre, date_label, horaire, lieu, starts_at,
  description, dress_code, categories, paiement_numero, paiement_moyens,
  paiement_beneficiaire, date_limite, contact
) VALUES (
  'octobre-rose-2026',
  'OR26',
  'Pique-nique Octobre Rose',
  'Sensibilisation, partage, solidarité',
  'Samedi 31 octobre 2026',
  '9 h - 14 h',
  'Jardin botanique de Bingerville',
  '2026-10-31T09:00:00Z',
  'Sensibilisation avec un professionnel de santé, quiz et jeux, pique-nique partagé, atelier entrepreneuriat.',
  'Un vêtement rose',
  '[{"code":"adulte","label":"Adulte","prix":8000},{"code":"etudiant","label":"Étudiant ou enfant","prix":5000}]'::jsonb,
  '+225 07 00 00 00 00',
  'Wave et Orange Money',
  '2ALSY',
  '2026-10-25T23:59:59Z',
  '+225 05 00 00 00 00 / +225 07 00 00 00 00'
)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- FIN
-- =====================================================================
