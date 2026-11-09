-- Stripe TEST and LIVE side by side in one database.
-- Apply manually after 007-012 and 014 (independent of 013). No row is deleted
-- and no credit is touched: it adds a livemode column to stripe_customers and
-- stripe_subscriptions, lets a user hold one customer per mode, classifies
-- existing rows only from verifiable evidence, and makes credit grants refuse
-- a subscription of the other mode.
--
-- How existing rows get their mode (never from the cus_/sub_ prefix):
--   1. Subscriptions: livemode recorded by credit grants (stripe_credit_grants,
--      credit_period_grants). Those rows were written by the webhook only after
--      checking event.livemode, invoice.livemode and the server key.
--   2. Customers: the mode of their classified subscriptions (Stripe keeps a
--      customer and its subscriptions in the same mode).
--   3. Contradicting evidence stops the migration; nothing is changed.
--   4. Rows without evidence stay NULL ("unclassified"). The server resolves
--      them against Stripe on first use: if the active key can read the object,
--      its livemode field decides; if Stripe answers resource_missing, the object
--      belongs to the other mode. The webhook also stamps every subscription it
--      syncs with Stripe's own livemode.
--
-- Keys after this migration:
--   stripe_customers:  PRIMARY KEY (stripe_customer_id); one customer per user
--                      and mode; at most one unclassified customer per user.
--
-- Reversible (only while every user has at most one customer) with:
--   DROP INDEX public.stripe_customers_user_mode_key, public.stripe_customers_user_unclassified_key,
--              public.stripe_subscriptions_user_mode_idx;
--   ALTER TABLE public.stripe_customers DROP CONSTRAINT stripe_customers_pkey,
--     ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (user_id);
--   ALTER TABLE public.stripe_customers DROP COLUMN livemode;
--   ALTER TABLE public.stripe_subscriptions DROP COLUMN livemode;
--   and re-run credit_engine.grant_subscription_period from 014.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.stripe_customers ADD COLUMN livemode BOOLEAN;
ALTER TABLE public.stripe_subscriptions ADD COLUMN livemode BOOLEAN;

-- ---------------------------------------------------------------------------
-- Classification from evidence
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  conflicts INTEGER;
BEGIN
  -- A subscription whose recorded grants disagree on the mode cannot be classified safely.
  SELECT count(*) INTO conflicts FROM (
    SELECT e.subscription_id
      FROM (
        SELECT stripe_subscription_id AS subscription_id, livemode FROM public.stripe_credit_grants
        UNION ALL
        SELECT stripe_subscription_id, livemode FROM public.credit_period_grants
      ) e
     GROUP BY e.subscription_id
    HAVING count(DISTINCT e.livemode) > 1
  ) c;
  IF conflicts > 0 THEN
    RAISE EXCEPTION '% subscriptions have grants in both modes. Inspect them before applying 015.', conflicts;
  END IF;
END;
$$;

UPDATE public.stripe_subscriptions s
   SET livemode = e.livemode
  FROM (
    SELECT subscription_id, bool_or(livemode) AS livemode
      FROM (
        SELECT stripe_subscription_id AS subscription_id, livemode FROM public.stripe_credit_grants
        UNION ALL
        SELECT stripe_subscription_id, livemode FROM public.credit_period_grants
      ) g
     GROUP BY subscription_id
  ) e
 WHERE s.stripe_subscription_id = e.subscription_id;

DO $$
DECLARE
  conflicts INTEGER;
BEGIN
  -- A customer whose classified subscriptions disagree on the mode is impossible in Stripe: stop.
  SELECT count(*) INTO conflicts FROM (
    SELECT stripe_customer_id FROM public.stripe_subscriptions
     WHERE livemode IS NOT NULL
     GROUP BY stripe_customer_id
    HAVING count(DISTINCT livemode) > 1
  ) c;
  IF conflicts > 0 THEN
    RAISE EXCEPTION '% customers have subscriptions in both modes. Inspect them before applying 015.', conflicts;
  END IF;
END;
$$;

UPDATE public.stripe_customers c
   SET livemode = s.livemode
  FROM (
    SELECT stripe_customer_id, bool_or(livemode) AS livemode
      FROM public.stripe_subscriptions
     WHERE livemode IS NOT NULL
     GROUP BY stripe_customer_id
  ) s
 WHERE c.stripe_customer_id = s.stripe_customer_id;

-- ---------------------------------------------------------------------------
-- Keys: one customer per user and mode
-- ---------------------------------------------------------------------------

ALTER TABLE public.stripe_customers DROP CONSTRAINT stripe_customers_pkey;
ALTER TABLE public.stripe_customers ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (stripe_customer_id);

CREATE UNIQUE INDEX stripe_customers_user_mode_key
  ON public.stripe_customers (user_id, livemode) WHERE livemode IS NOT NULL;
-- Until it is classified, a user keeps the single customer they had before.
CREATE UNIQUE INDEX stripe_customers_user_unclassified_key
  ON public.stripe_customers (user_id) WHERE livemode IS NULL;

CREATE INDEX stripe_subscriptions_user_mode_idx
  ON public.stripe_subscriptions (user_id, livemode, status);

-- ---------------------------------------------------------------------------
-- Credit grants refuse a subscription of the other mode (014 body, one check added)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_engine.grant_subscription_period(
  p_user_id UUID,
  p_subscription_id TEXT,
  p_plan TEXT,
  p_interval TEXT,
  p_livemode BOOLEAN,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_invoice_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  expiry_grace CONSTANT INTERVAL := '1 day';
  plan_credits INTEGER;
  plan_cap INTEGER;
  subscription_row RECORD;
  existing RECORD;
  existing_user UUID;
  outcome TEXT;
BEGIN
  IF p_subscription_id IS NULL OR p_subscription_id !~ '^sub_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_subscription_id';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;
  IF p_livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_livemode';
  END IF;
  IF p_invoice_id IS NOT NULL AND p_invoice_id !~ '^in_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_invoice_id';
  END IF;

  -- The plan decides the amounts; nothing else can.
  plan_credits := CASE p_plan WHEN 'starter' THEN 120 WHEN 'growth' THEN 300 WHEN 'pro' THEN 720 END;
  plan_cap := CASE p_plan WHEN 'starter' THEN 0 WHEN 'growth' THEN 300 WHEN 'pro' THEN 720 END;
  IF plan_credits IS NULL THEN
    RAISE EXCEPTION 'unsupported_plan';
  END IF;

  -- Always one month of credits per period: an annual invoice period is never accepted here.
  IF p_interval IS NULL OR p_interval NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'invalid_interval';
  END IF;
  IF p_period_start IS NULL OR p_period_end IS NULL
     OR p_period_end - p_period_start NOT BETWEEN INTERVAL '27 days' AND INTERVAL '32 days' THEN
    RAISE EXCEPTION 'invalid_period';
  END IF;
  IF p_interval = 'monthly' AND p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invoice_id';
  END IF;

  SELECT user_id, plan, status, current_period_start, current_period_end, livemode INTO subscription_row
    FROM public.stripe_subscriptions
   WHERE stripe_subscription_id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;
  IF subscription_row.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'subscription_user_mismatch';
  END IF;
  IF subscription_row.plan IS DISTINCT FROM p_plan THEN
    RAISE EXCEPTION 'subscription_plan_mismatch';
  END IF;
  -- 015: a subscription of the other Stripe mode never earns credits in this one.
  IF subscription_row.livemode IS NOT NULL AND subscription_row.livemode IS DISTINCT FROM p_livemode THEN
    RAISE EXCEPTION 'subscription_mode_mismatch';
  END IF;
  -- A monthly slice must lie inside the paid annual term mirrored from Stripe.
  IF p_interval = 'annual' AND (
       subscription_row.current_period_start IS NULL OR subscription_row.current_period_end IS NULL
       OR p_period_start < subscription_row.current_period_start
       OR p_period_end > subscription_row.current_period_end) THEN
    RAISE EXCEPTION 'period_outside_term';
  END IF;

  IF NOT p_livemode THEN
    -- TEST: record once, never touch balances or the engine.
    INSERT INTO public.credit_period_grants
      (user_id, stripe_subscription_id, plan, billing_interval, period_start, period_end, credits, livemode, status, stripe_invoice_id)
    VALUES (p_user_id, p_subscription_id, p_plan, p_interval, p_period_start, p_period_end, plan_credits, false, 'simulated', p_invoice_id)
    ON CONFLICT ON CONSTRAINT credit_period_grants_period_key DO NOTHING;
    IF NOT FOUND THEN
      SELECT user_id INTO existing_user FROM public.credit_period_grants
       WHERE stripe_subscription_id = p_subscription_id AND period_start = p_period_start;
      IF existing_user IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'period_user_mismatch';
      END IF;
      RETURN 'duplicate';
    END IF;
    RETURN 'simulated';
  END IF;

  -- LIVE: balance lock first (engine order), so duplicates and reservations wait.
  PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'credits_row_missing';
  END IF;

  -- An invoice already granted by 012 is never granted again here.
  IF p_invoice_id IS NOT NULL THEN
    SELECT user_id INTO existing_user FROM public.stripe_credit_grants WHERE stripe_invoice_id = p_invoice_id;
    IF FOUND THEN
      IF existing_user IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'invoice_user_mismatch';
      END IF;
      RETURN 'duplicate';
    END IF;
  END IF;

  SELECT user_id, credits, livemode INTO existing FROM public.credit_period_grants
   WHERE stripe_subscription_id = p_subscription_id AND period_start = p_period_start;
  IF FOUND THEN
    IF existing.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'period_user_mismatch';
    END IF;
    IF existing.livemode IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'period_mode_mismatch';
    END IF;
    IF existing.credits >= plan_credits THEN
      RETURN 'duplicate';
    END IF;
  END IF;

  outcome := credit_engine.grant_period(
    p_user_id,
    'period:' || p_subscription_id || ':' || floor(extract(epoch FROM p_period_start))::BIGINT,
    plan_credits, plan_cap, p_period_end + expiry_grace);

  IF outcome NOT IN ('applied', 'upgraded') THEN
    RETURN outcome; -- duplicate or stale: nothing recorded.
  END IF;

  INSERT INTO public.credit_period_grants
    (user_id, stripe_subscription_id, plan, billing_interval, period_start, period_end, credits, livemode, status, stripe_invoice_id)
  VALUES (p_user_id, p_subscription_id, p_plan, p_interval, p_period_start, p_period_end, plan_credits, true, 'applied', p_invoice_id)
  ON CONFLICT ON CONSTRAINT credit_period_grants_period_key DO UPDATE
     SET plan = EXCLUDED.plan, credits = EXCLUDED.credits, billing_interval = EXCLUDED.billing_interval,
         stripe_invoice_id = COALESCE(EXCLUDED.stripe_invoice_id, public.credit_period_grants.stripe_invoice_id),
         updated_at = now();

  UPDATE public.user_credits SET plan = p_plan, subscription_status = 'active', updated_at = now()
   WHERE user_id = p_user_id;

  RETURN outcome;
END;
$$;

REVOKE ALL ON FUNCTION credit_engine.grant_subscription_period(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
