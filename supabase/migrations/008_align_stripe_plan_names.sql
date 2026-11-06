-- Aligns stripe_subscriptions.plan with the definitive plans: starter, growth, pro.
-- Requires 007. Apply manually, after 007, on the correct project.
--
-- A stored 'pro' or 'business' row comes from the old catalog, where 'pro' meant
-- a different plan. Those rows are never rewritten here: the migration stops so
-- they can be inspected first, and nothing changes.
--
-- Reversible, while no 'growth' rows exist, by restoring the 007 constraint.

BEGIN;

-- Holds off webhook writes between the check and the constraint swap.
LOCK TABLE public.stripe_subscriptions IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  legacy_rows BIGINT;
BEGIN
  SELECT count(*) INTO legacy_rows
  FROM public.stripe_subscriptions
  WHERE plan IN ('pro', 'business');

  IF legacy_rows > 0 THEN
    RAISE EXCEPTION '% stripe_subscriptions rows use a legacy plan name. Inspect them before applying 008.', legacy_rows;
  END IF;
END;
$$;

ALTER TABLE public.stripe_subscriptions
  DROP CONSTRAINT stripe_subscriptions_plan_check;

ALTER TABLE public.stripe_subscriptions
  ADD CONSTRAINT stripe_subscriptions_plan_check
  CHECK (plan IS NULL OR plan IN ('starter', 'growth', 'pro'));

COMMIT;
