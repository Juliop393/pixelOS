-- 019: one account per Gmail identity (dots and +alias variants of the same Gmail inbox).
--
-- For gmail.com and googlemail.com, "e.jemplo+1@googlemail.com" and "ejemplo@gmail.com" are the
-- same inbox. They share the canonical identity "ejemplo@gmail.com": lower case, "+tag" removed,
-- dots removed, googlemail.com -> gmail.com. Other providers (Outlook, company domains...) are not
-- normalized. Stored emails in auth.users are never modified.
--
-- * Privacy: the table never stores an address. It keeps only identity_hash = SHA-256 of the
--   canonical identity (built-in sha256(), no extension), plus the user id, so a deleted
--   account leaves no readable email behind. Gmail local parts are guessable, so the hash is
--   pseudonymous rather than anonymous; only Supabase Auth and postgres can read it.
-- * Atomic guarantee: public.signup_email_identities has the identity hash as PRIMARY KEY and
--   is filled by a BEFORE INSERT trigger on auth.users, in the same transaction as the new user.
--   If the identity already exists (including a concurrent sign-up that commits first), the
--   trigger aborts the insert: no auth.users row, so handle_new_user() never runs and no credits
--   are granted. This covers email/password, Google OAuth and dashboard-created users.
-- * Friendly message: the existing Before User Created hook (018) gets one more check that
--   rejects a known identity with a clear message before Auth tries the insert. The disposable
--   domain check is unchanged and runs first.
-- * Existing accounts: their identities are registered once (oldest account wins if two ever
--   shared one); no user, balance or subscription is touched. Production had 6 Gmail accounts,
--   6 distinct identities, no shared identity (read-only check, 2026-11-12).
-- * Deleted accounts keep their identity hash (no foreign key), so deleting and re-creating an
--   account does not grant the free credits again. Retention (manual, no scheduler): hashes of
--   deleted accounts older than 12 months can be released with
--     DELETE FROM public.signup_email_identities s
--      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id)
--        AND s.created_at < now() - interval '12 months';
--   A legitimate person who deleted their account can be let back in by support with
--     DELETE FROM public.signup_email_identities WHERE identity_hash = public.gmail_identity_hash('<their gmail>');
-- * Failure behaviour: if the hook cannot read the table it allows the sign-up (fail open, as in
--   018); the trigger then still enforces uniqueness. Any unexpected error in the trigger other
--   than a duplicate is logged without the email and lets the sign-up through.
-- * handle_new_user(), migration 017, the credit engine, Stripe and email changes (UPDATE) are
--   not touched.
--
-- Rollback (hook stays enabled, 018 behaviour returns): run the 018 CREATE OR REPLACE FUNCTION for
-- public.hook_block_disposable_email again, then
--   DROP TRIGGER on_auth_user_signup_identity ON auth.users;
--   DROP FUNCTION public.register_signup_email_identity();
--   DROP TABLE public.signup_email_identities;
--   DROP FUNCTION public.gmail_identity_hash(text);
--   DROP FUNCTION public.gmail_canonical_identity(text);
-- (The hook must be restored to the 018 version BEFORE dropping the table or the canonical
-- function; until then the 019 hook fails open.)

BEGIN;

-- Canonical Gmail identity, or NULL for any other provider or an unusable address.
CREATE OR REPLACE FUNCTION public.gmail_canonical_identity(email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN rtrim(split_part(lower(btrim(email)), '@', 2), '.') IN ('gmail.com', 'googlemail.com')
     AND replace(split_part(split_part(lower(btrim(email)), '@', 1), '+', 1), '.', '') <> ''
    THEN replace(split_part(split_part(lower(btrim(email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
  END
$$;

REVOKE EXECUTE ON FUNCTION public.gmail_canonical_identity(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gmail_canonical_identity(TEXT) TO supabase_auth_admin;

-- What is stored and compared: SHA-256 of the canonical identity, or NULL for non-Gmail addresses.
CREATE OR REPLACE FUNCTION public.gmail_identity_hash(email TEXT)
RETURNS BYTEA
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.sha256(convert_to(public.gmail_canonical_identity(email), 'UTF8'))
$$;

REVOKE EXECUTE ON FUNCTION public.gmail_identity_hash(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gmail_identity_hash(TEXT) TO supabase_auth_admin;

CREATE TABLE IF NOT EXISTS public.signup_email_identities (
  identity_hash BYTEA PRIMARY KEY CONSTRAINT signup_email_identities_hash_length CHECK (octet_length(identity_hash) = 32),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only Supabase Auth reads it (the hook); only the trigger below writes it.
ALTER TABLE public.signup_email_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.signup_email_identities FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.signup_email_identities TO supabase_auth_admin;
DROP POLICY IF EXISTS signup_email_identities_auth_read ON public.signup_email_identities;
CREATE POLICY signup_email_identities_auth_read ON public.signup_email_identities
  FOR SELECT TO supabase_auth_admin USING (true);

-- Existing accounts: register each identity once, oldest account first. Read-only on auth.users.
INSERT INTO public.signup_email_identities (identity_hash, user_id, created_at)
SELECT DISTINCT ON (identity) identity, id, created_at
  FROM (SELECT public.gmail_identity_hash(email) AS identity, id, created_at FROM auth.users) u
 WHERE identity IS NOT NULL
 ORDER BY identity, created_at, id
ON CONFLICT (identity_hash) DO NOTHING;

-- Runs as postgres (like handle_new_user) so Auth needs no write permission on the table.
CREATE OR REPLACE FUNCTION public.register_signup_email_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  identity BYTEA;
  inserted INTEGER := 0;
BEGIN
  BEGIN
    identity := public.gmail_identity_hash(NEW.email);
    IF identity IS NULL THEN
      RETURN NEW;
    END IF;
    -- A concurrent insert of the same identity waits here for the other transaction and then
    -- inserts nothing.
    INSERT INTO public.signup_email_identities (identity_hash, user_id)
    VALUES (identity, NEW.id)
    ON CONFLICT (identity_hash) DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'register_signup_email_identity failed, sign-up allowed: %', SQLSTATE;
    RETURN NEW;
  END;

  IF inserted = 0 THEN
    RAISE EXCEPTION 'signup identity already registered' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_signup_email_identity() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_signup_identity ON auth.users;
CREATE TRIGGER on_auth_user_signup_identity
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.register_signup_email_identity();

-- The 018 hook with one extra check after the disposable-domain one.
CREATE OR REPLACE FUNCTION public.hook_block_disposable_email(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  email TEXT;
  email_domain TEXT;
BEGIN
  email := lower(btrim(event -> 'user' ->> 'email'));

  -- No email (phone or anonymous sign-ups, not used by PixelFM): nothing to check.
  IF email IS NULL OR email = '' THEN
    RETURN '{}'::JSONB;
  END IF;

  IF email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 400,
      'message', 'Introduce un correo electrónico válido.'
    ));
  END IF;

  email_domain := rtrim(split_part(email, '@', 2), '.');

  IF EXISTS (SELECT 1 FROM public.disposable_email_domains d WHERE d.domain = email_domain) THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'No se permiten correos temporales o desechables. Regístrate con tu correo habitual.'
    ));
  END IF;

  -- Same Gmail inbox as an existing account (dots, +alias or googlemail.com). The message never
  -- names the existing address.
  IF EXISTS (
    SELECT 1 FROM public.signup_email_identities s
     WHERE s.identity_hash = public.gmail_identity_hash(email)
  ) THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Ya existe una cuenta asociada a este correo de Gmail. Inicia sesión o recupera tu contraseña.'
    ));
  END IF;

  RETURN '{}'::JSONB;
EXCEPTION WHEN OTHERS THEN
  -- Fail open, and never log the email address.
  RAISE WARNING 'hook_block_disposable_email failed, sign-up allowed: %', SQLSTATE;
  RETURN '{}'::JSONB;
END;
$$;

-- CREATE OR REPLACE keeps the 018 grants; restated so the migration stands on its own.
REVOKE EXECUTE ON FUNCTION public.hook_block_disposable_email(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hook_block_disposable_email(JSONB) TO supabase_auth_admin;

COMMIT;
