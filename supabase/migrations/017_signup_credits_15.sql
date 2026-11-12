-- 017: new accounts start with 15 free credits instead of 5.
--
-- public.handle_new_user() runs from the on_auth_user_created trigger (AFTER INSERT ON
-- auth.users) and creates the user's single user_credits row. It was created outside these
-- migrations; its body below is the production definition read on 2026-11-12, with only the
-- initial credit amount changed (5 -> 15).
--
-- * Only new users are affected: the trigger fires once per auth.users INSERT, and
--   ON CONFLICT (user_id) DO NOTHING never touches an existing row, so it cannot grant twice.
-- * Existing balances are not read or written by this migration.
-- * The free plan stays 'free' / 'inactive'; nothing renews these credits.
-- * Credit engine v2 needs no change: credit_engine.sync_account creates the user's
--   credit_accounts row on first use and records the whole balance (15) as legacy credits.
-- * CREATE OR REPLACE keeps the owner (postgres), SECURITY DEFINER, the existing EXECUTE
--   grants and the trigger, which references the function by name.
--
-- Rollback: run the same statement with 5 instead of 15.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, plan, subscription_status)
  VALUES (NEW.id, 15, 'free', 'inactive')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
