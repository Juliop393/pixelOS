-- 018: reject sign-ups from disposable email domains (Supabase Auth "Before User Created" hook).
--
-- Supabase Auth calls public.hook_block_disposable_email(event) before inserting a new row in
-- auth.users. If it answers with an error, no user is created, so on_auth_user_created /
-- handle_new_user() never runs and no free credits are granted. Existing users never pass
-- through this hook (it runs only when a user is created), so sign-in, payments and generation
-- are unaffected. handle_new_user(), migration 017 and the credit engine are not touched.
--
-- * The domain list lives in public.disposable_email_domains and is loaded separately with
--   scripts/update-disposable-domains.mjs (source: disposable/disposable-email-domains,
--   domains.txt; the "strict" list is not used because it contains Outlook, Hotmail, Proton...).
-- * Match is exact on the email's domain (lower-cased, trailing dot removed); the stored email is
--   never modified. Parent domains are not matched, so a list entry can never block a whole
--   suffix such as co.cc or or.ru.
-- * Fail open: if anything inside the hook fails (for example the list cannot be read), the
--   sign-up is allowed and a warning without the email is logged. Turnstile and email
--   confirmation still apply in that case.
-- * Empty list (not loaded yet) = nothing blocked.
--
-- Activation (after applying this migration and loading the list): Dashboard -> Authentication ->
-- Hooks -> Before User Created -> Postgres -> public.hook_block_disposable_email.
-- Rollback: disable the hook in the dashboard (immediate). The table and function can stay;
-- to remove them: DROP FUNCTION public.hook_block_disposable_email(jsonb);
-- DROP TABLE public.disposable_email_domains;

BEGIN;

CREATE TABLE IF NOT EXISTS public.disposable_email_domains (
  domain TEXT PRIMARY KEY CONSTRAINT disposable_email_domains_format
    CHECK (domain = lower(domain) AND domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only Supabase Auth reads the list. No API role can read or change it: RLS is on and the only
-- policy is a read policy for supabase_auth_admin; anon, authenticated and service_role get no grants.
ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.disposable_email_domains FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.disposable_email_domains TO supabase_auth_admin;
DROP POLICY IF EXISTS disposable_email_domains_auth_read ON public.disposable_email_domains;
CREATE POLICY disposable_email_domains_auth_read ON public.disposable_email_domains
  FOR SELECT TO supabase_auth_admin USING (true);

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

  RETURN '{}'::JSONB;
EXCEPTION WHEN OTHERS THEN
  -- Fail open, and never log the email address.
  RAISE WARNING 'hook_block_disposable_email failed, sign-up allowed: %', SQLSTATE;
  RETURN '{}'::JSONB;
END;
$$;

-- Only Supabase Auth may run the hook.
REVOKE EXECUTE ON FUNCTION public.hook_block_disposable_email(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_block_disposable_email(JSONB) TO supabase_auth_admin;

COMMIT;
