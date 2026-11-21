-- =====================================================================
-- 2ALSY CUP — Correctif inscription
-- À exécuter dans Supabase > SQL Editor > New query
-- Ce script est idempotent (peut être relancé sans risque)
-- =====================================================================

-- Recréer la fonction avec search_path explicite (c'est ça qui bloquait)
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

-- Recréer le trigger proprement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
