-- Shared subscription credits for Starter, Growth and Pro on the credit engine v2.
-- Apply manually after 011 and 012 (independent of 013). No balance, lot or
-- grant row is changed: it adds columns with neutral defaults, widens two
-- CHECK constraints, adds one ledger table and replaces engine functions.
-- The webhook keeps calling 012 until it is switched in a separate change.
--
-- Plans (the amounts never come from the caller):
--   starter  120 credits / month, no rollover
--   growth   300 credits / month, rollover up to 300
--   pro      720 credits / month, rollover up to 720
--
-- Rollover policy, applied at each renewal (new period of the same subscription):
--   * carry = min(unused credits of the period that ends, rollover cap of THAT
--     period, rollover cap of the NEW period).
--   * Carried credits become 'rollover' credits that expire with the new period.
--     At the next renewal they are dropped: they never survive a second renewal.
--   * The new period's allotment replaces the monthly part. Packs and legacy
--     credits are never touched.
--   * Consumption takes the soonest-expiring credits first: rollover (ends this
--     period), monthly, then pack lots by expiry, interleaved by date; legacy last.
--   * Starter has cap 0: identical to the current 012 behaviour.
--   * A renewal must arrive before the ending period expires (period end + 1
--     day). If it arrives later, those credits had already expired: carry is 0.
--   * Plan change inside the same period (same period key): an upgrade adds the
--     difference and takes the new cap; a downgrade changes nothing until the
--     next period. Across periods both caps apply: Pro -> Growth carries at
--     most 300, and moving to Starter carries nothing.
--   * Older or finished periods are 'stale': nothing changes, nothing is recorded.
--
-- Annual billing: credits are delivered month by month. Each monthly slice of
-- the paid year is its own period (key per slice start), granted by
-- deliver_annual_subscription_credits, which derives the slice from the term
-- mirrored in stripe_subscriptions and refuses inactive or non-annual terms.
-- The annual invoice is never treated as a monthly one (monthly grants require
-- a 27-32 day period).
--
-- Reversible with:
--   DROP FUNCTION public.deliver_annual_subscription_credits(TEXT, BOOLEAN);
--   DROP FUNCTION public.grant_subscription_credits_v3(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ);
--   DROP FUNCTION credit_engine.grant_subscription_period(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
--   DROP FUNCTION credit_engine.grant_period(UUID, TEXT, INTEGER, INTEGER, TIMESTAMPTZ);
--   DROP TABLE public.credit_period_grants;
--   then re-run the function bodies of 011 and drop the added columns/constraints
--   (only once no rollover credits or 'rollover' sources exist).

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

ALTER TABLE public.credit_accounts
  ADD COLUMN monthly_allotment INTEGER NOT NULL DEFAULT 0
    CONSTRAINT credit_accounts_allotment_check CHECK (monthly_allotment >= 0),
  ADD COLUMN monthly_rollover_cap INTEGER NOT NULL DEFAULT 0
    CONSTRAINT credit_accounts_rollover_cap_check CHECK (monthly_rollover_cap >= 0),
  ADD COLUMN rollover_credits INTEGER NOT NULL DEFAULT 0
    CONSTRAINT credit_accounts_rollover_check CHECK (rollover_credits >= 0),
  ADD COLUMN rollover_period_key TEXT,
  ADD COLUMN rollover_expires_at TIMESTAMPTZ,
  ADD CONSTRAINT credit_accounts_rollover_period_check CHECK (
    rollover_credits = 0 OR (rollover_period_key IS NOT NULL AND rollover_expires_at IS NOT NULL)
  );

-- 'rollover' is a new origin; like 'monthly' it is tied to the period it came from.
ALTER TABLE public.credit_reservation_sources
  DROP CONSTRAINT credit_reservation_sources_source_check,
  ADD CONSTRAINT credit_reservation_sources_source_check CHECK (source IN ('monthly', 'rollover', 'pack', 'legacy')),
  DROP CONSTRAINT credit_reservation_sources_period_check,
  ADD CONSTRAINT credit_reservation_sources_period_check CHECK ((source IN ('monthly', 'rollover')) = (monthly_period_key IS NOT NULL));

ALTER TABLE public.credit_drift_absorptions
  DROP CONSTRAINT credit_drift_absorptions_source_check,
  ADD CONSTRAINT credit_drift_absorptions_source_check CHECK (source IN ('monthly', 'rollover', 'pack', 'legacy')),
  DROP CONSTRAINT credit_drift_absorptions_period_check,
  ADD CONSTRAINT credit_drift_absorptions_period_check CHECK ((source IN ('monthly', 'rollover')) = (monthly_period_key IS NOT NULL));

-- One row per subscription period (a monthly invoice, or one month of an annual term).
CREATE TABLE public.credit_period_grants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  plan TEXT NOT NULL CONSTRAINT credit_period_grants_plan_check CHECK (plan IN ('starter', 'growth', 'pro')),
  billing_interval TEXT NOT NULL CONSTRAINT credit_period_grants_interval_check CHECK (billing_interval IN ('monthly', 'annual')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  credits INTEGER NOT NULL CONSTRAINT credit_period_grants_credits_check CHECK (credits > 0),
  livemode BOOLEAN NOT NULL,
  status TEXT NOT NULL CONSTRAINT credit_period_grants_status_check CHECK (status IN ('simulated', 'applied')),
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_period_grants_period_key UNIQUE (stripe_subscription_id, period_start),
  CONSTRAINT credit_period_grants_range_check CHECK (period_end > period_start),
  CONSTRAINT credit_period_grants_mode_check CHECK ((livemode AND status = 'applied') OR (NOT livemode AND status = 'simulated'))
);

CREATE INDEX credit_period_grants_user_idx ON public.credit_period_grants (user_id, period_start);

ALTER TABLE public.credit_period_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credit_period_grants FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.credit_period_grants TO service_role;
REVOKE ALL ON SEQUENCE public.credit_period_grants_id_seq FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Engine internals (same contracts as 011, now aware of rollover credits)
-- ---------------------------------------------------------------------------

-- Takes credits soonest-expiring first: rollover, monthly and pack lots ordered
-- by expiry (rollover before monthly on ties), then legacy.
CREATE OR REPLACE FUNCTION credit_engine.take(p_user_id UUID, p_amount INTEGER, p_reservation_id UUID, p_include_expired BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  pending INTEGER := p_amount;
  portion INTEGER;
  account RECORD;
  src RECORD;
BEGIN
  SELECT legacy_credits, monthly_credits, monthly_period_key, monthly_expires_at,
         rollover_credits, rollover_period_key, rollover_expires_at
    INTO account
    FROM public.credit_accounts
   WHERE user_id = p_user_id
   FOR UPDATE;

  PERFORM 1 FROM public.credit_pack_lots
   WHERE user_id = p_user_id AND status = 'applied' AND credits_remaining > 0
   ORDER BY id
   FOR UPDATE;

  FOR src IN
    SELECT s.kind, s.lot_id, s.period_key, s.available
      FROM (
        SELECT 'rollover'::TEXT AS kind, NULL::UUID AS lot_id, account.rollover_period_key::TEXT AS period_key,
               account.rollover_credits::INTEGER AS available, account.rollover_expires_at::TIMESTAMPTZ AS expires_at, 0 AS rank
         WHERE account.rollover_credits > 0 AND (p_include_expired OR account.rollover_expires_at > now())
        UNION ALL
        SELECT 'monthly', NULL, account.monthly_period_key, account.monthly_credits, account.monthly_expires_at, 1
         WHERE account.monthly_credits > 0 AND (p_include_expired OR account.monthly_expires_at > now())
        UNION ALL
        SELECT 'pack', l.id, NULL, l.credits_remaining, l.expires_at, 2
          FROM public.credit_pack_lots l
         WHERE l.user_id = p_user_id AND l.status = 'applied' AND l.credits_remaining > 0
           AND (p_include_expired OR l.expires_at > now())
      ) s
     ORDER BY s.expires_at, s.rank, s.lot_id
  LOOP
    EXIT WHEN pending = 0;
    portion := LEAST(pending, src.available);

    IF src.kind = 'rollover' THEN
      UPDATE public.credit_accounts SET rollover_credits = rollover_credits - portion, updated_at = now()
       WHERE user_id = p_user_id;
    ELSIF src.kind = 'monthly' THEN
      UPDATE public.credit_accounts SET monthly_credits = monthly_credits - portion, updated_at = now()
       WHERE user_id = p_user_id;
    ELSE
      UPDATE public.credit_pack_lots SET credits_remaining = credits_remaining - portion, updated_at = now()
       WHERE id = src.lot_id;
    END IF;

    IF p_reservation_id IS NOT NULL THEN
      INSERT INTO public.credit_reservation_sources (reservation_id, source, lot_id, monthly_period_key, credits)
      VALUES (p_reservation_id, src.kind, src.lot_id, src.period_key, portion);
    ELSE
      INSERT INTO public.credit_drift_absorptions (user_id, source, lot_id, monthly_period_key, credits_absorbed, credits_open)
      VALUES (p_user_id, src.kind, src.lot_id, src.period_key, portion, portion);
    END IF;
    pending := pending - portion;
  END LOOP;

  IF pending > 0 THEN
    portion := LEAST(pending, account.legacy_credits);
    IF portion > 0 THEN
      UPDATE public.credit_accounts SET legacy_credits = legacy_credits - portion, updated_at = now()
       WHERE user_id = p_user_id;
      IF p_reservation_id IS NOT NULL THEN
        INSERT INTO public.credit_reservation_sources (reservation_id, source, credits)
        VALUES (p_reservation_id, 'legacy', portion);
      ELSE
        INSERT INTO public.credit_drift_absorptions (user_id, source, credits_absorbed, credits_open)
        VALUES (p_user_id, 'legacy', portion, portion);
      END IF;
      pending := pending - portion;
    END IF;
  END IF;

  IF pending > 0 THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION credit_engine.assert_balanced(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  visible INTEGER;
  tracked INTEGER;
BEGIN
  SELECT credits INTO visible FROM public.user_credits WHERE user_id = p_user_id;
  SELECT a.legacy_credits + a.monthly_credits + a.rollover_credits + COALESCE((
           SELECT sum(l.credits_remaining)::INTEGER FROM public.credit_pack_lots l
            WHERE l.user_id = p_user_id AND l.status = 'applied'), 0)
    INTO tracked
    FROM public.credit_accounts a
   WHERE a.user_id = p_user_id;

  IF visible IS DISTINCT FROM tracked THEN
    RAISE EXCEPTION 'credit_invariant_broken';
  END IF;
END;
$$;

-- Same as 011, with rollover counted in drift, returned to its period when
-- still running, and removed when it expires.
CREATE OR REPLACE FUNCTION credit_engine.sync_account(p_user_id UUID, p_on_unexplained TEXT DEFAULT 'reject')
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  original INTEGER;
  packs INTEGER;
  drift INTEGER;
  portion INTEGER;
  forfeited INTEGER := 0;
  created UUID;
  account RECORD;
  absorbed RECORD;
  lot RECORD;
BEGIN
  IF p_on_unexplained IS NULL OR p_on_unexplained NOT IN ('reject', 'legacy', 'discard') THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;

  SELECT credits INTO balance FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'credits_row_missing';
  END IF;
  IF balance IS NULL OR balance < 0 THEN
    RAISE EXCEPTION 'invalid_balance';
  END IF;
  original := balance;

  SELECT COALESCE(sum(credits_remaining), 0)::INTEGER INTO packs
    FROM public.credit_pack_lots WHERE user_id = p_user_id AND status = 'applied';

  INSERT INTO public.credit_accounts (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id INTO created;

  IF created IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.stripe_credit_grants WHERE user_id = p_user_id AND status = 'applied')
       OR EXISTS (SELECT 1 FROM public.credit_period_grants WHERE user_id = p_user_id AND status = 'applied')
       OR balance < packs THEN
      RAISE EXCEPTION 'credit_init_requires_review';
    END IF;
    UPDATE public.credit_accounts SET legacy_credits = balance - packs WHERE user_id = p_user_id;
  END IF;

  SELECT legacy_credits, monthly_credits, monthly_period_key, monthly_expires_at,
         rollover_credits, rollover_period_key, rollover_expires_at,
         init_grace_until, init_grace_credits
    INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  drift := balance - (account.legacy_credits + account.monthly_credits + account.rollover_credits + packs);

  IF drift < 0 THEN
    PERFORM credit_engine.take(p_user_id, -drift, NULL, true);

  ELSIF drift > 0 THEN
    FOR absorbed IN
      SELECT id, source, lot_id, monthly_period_key, credits_open
        FROM public.credit_drift_absorptions
       WHERE user_id = p_user_id AND credits_open > 0
       ORDER BY id DESC
       FOR UPDATE
    LOOP
      portion := LEAST(drift, absorbed.credits_open);
      IF absorbed.source = 'legacy' THEN
        UPDATE public.credit_accounts SET legacy_credits = legacy_credits + portion, updated_at = now()
         WHERE user_id = p_user_id;
      ELSIF absorbed.source = 'monthly' THEN
        IF account.monthly_period_key = absorbed.monthly_period_key AND account.monthly_expires_at > now() THEN
          UPDATE public.credit_accounts SET monthly_credits = monthly_credits + portion, updated_at = now()
           WHERE user_id = p_user_id;
        ELSE
          forfeited := forfeited + portion;
        END IF;
      ELSIF absorbed.source = 'rollover' THEN
        IF account.rollover_period_key = absorbed.monthly_period_key AND account.rollover_expires_at > now() THEN
          UPDATE public.credit_accounts SET rollover_credits = rollover_credits + portion, updated_at = now()
           WHERE user_id = p_user_id;
        ELSE
          forfeited := forfeited + portion;
        END IF;
      ELSE
        UPDATE public.credit_pack_lots SET credits_remaining = credits_remaining + portion, updated_at = now()
         WHERE id = absorbed.lot_id AND user_id = p_user_id AND status = 'applied' AND expires_at > now();
        IF NOT FOUND THEN
          forfeited := forfeited + portion;
        END IF;
      END IF;
      UPDATE public.credit_drift_absorptions
         SET credits_open = credits_open - portion, updated_at = now()
       WHERE id = absorbed.id;
      drift := drift - portion;
      EXIT WHEN drift = 0;
    END LOOP;

    IF drift > 0 AND account.init_grace_credits > 0 AND account.init_grace_until > now() THEN
      portion := LEAST(drift, account.init_grace_credits);
      UPDATE public.credit_accounts
         SET legacy_credits = legacy_credits + portion,
             init_grace_credits = init_grace_credits - portion,
             updated_at = now()
       WHERE user_id = p_user_id;
      drift := drift - portion;
    END IF;

    IF drift > 0 THEN
      IF p_on_unexplained = 'reject' THEN
        RAISE EXCEPTION 'credit_drift_detected';
      ELSIF p_on_unexplained = 'legacy' THEN
        UPDATE public.credit_accounts SET legacy_credits = legacy_credits + drift, updated_at = now()
         WHERE user_id = p_user_id;
      ELSE
        balance := balance - drift;
      END IF;
      INSERT INTO public.credit_drift_resolutions (user_id, mode, credits) VALUES (p_user_id, p_on_unexplained, drift);
    END IF;

    balance := balance - forfeited;
  END IF;

  FOR lot IN
    SELECT id, credits_remaining
      FROM public.credit_pack_lots
     WHERE user_id = p_user_id AND status = 'applied' AND credits_remaining > 0 AND expires_at <= now()
     ORDER BY expires_at, id
     FOR UPDATE
  LOOP
    INSERT INTO public.credit_lot_expirations (lot_id, user_id, credits_expired)
    VALUES (lot.id, p_user_id, lot.credits_remaining);
    UPDATE public.credit_pack_lots SET credits_remaining = 0, updated_at = now() WHERE id = lot.id;
    balance := balance - lot.credits_remaining;
  END LOOP;

  SELECT monthly_credits, monthly_expires_at, rollover_credits, rollover_expires_at INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id;
  IF account.monthly_credits > 0 AND account.monthly_expires_at <= now() THEN
    UPDATE public.credit_accounts SET monthly_credits = 0, updated_at = now() WHERE user_id = p_user_id;
    balance := balance - account.monthly_credits;
  END IF;
  IF account.rollover_credits > 0 AND account.rollover_expires_at <= now() THEN
    UPDATE public.credit_accounts SET rollover_credits = 0, updated_at = now() WHERE user_id = p_user_id;
    balance := balance - account.rollover_credits;
  END IF;

  IF balance <> original THEN
    UPDATE public.user_credits SET credits = balance, updated_at = now() WHERE user_id = p_user_id;
  END IF;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN balance;
END;
$$;

-- The one allotment primitive for every plan and interval. Results:
--   applied   new period: carry + new allotment (see header)
--   upgraded  same period, larger allotment: difference added, new cap
--   duplicate same period, same or smaller allotment
--   stale     period already ended, or older than the current one
CREATE FUNCTION credit_engine.grant_period(p_user_id UUID, p_period_key TEXT, p_credits INTEGER, p_rollover_cap INTEGER, p_expires_at TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  carry INTEGER;
  account RECORD;
BEGIN
  IF p_user_id IS NULL OR p_period_key IS NULL OR p_expires_at IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  IF p_credits IS NULL OR p_credits NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'invalid_credits';
  END IF;
  IF p_rollover_cap IS NULL OR p_rollover_cap NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'invalid_rollover_cap';
  END IF;

  -- Locks the user and removes whatever already expired, so it can never carry.
  balance := credit_engine.sync_account(p_user_id);
  IF p_expires_at <= now() THEN
    RETURN 'stale';
  END IF;

  SELECT monthly_credits, monthly_allotment, monthly_rollover_cap, monthly_period_key, monthly_expires_at, rollover_credits
    INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  IF account.monthly_period_key = p_period_key THEN
    -- An unknown allotment (periods granted before this migration) is never topped up.
    IF account.monthly_allotment > 0 AND p_credits > account.monthly_allotment THEN
      UPDATE public.credit_accounts
         SET monthly_credits = monthly_credits + (p_credits - account.monthly_allotment),
             monthly_allotment = p_credits,
             monthly_rollover_cap = p_rollover_cap,
             updated_at = now()
       WHERE user_id = p_user_id;
      UPDATE public.user_credits
         SET credits = balance + (p_credits - account.monthly_allotment), updated_at = now()
       WHERE user_id = p_user_id;
      PERFORM credit_engine.assert_balanced(p_user_id);
      RETURN 'upgraded';
    END IF;
    RETURN 'duplicate';
  END IF;

  IF account.monthly_expires_at IS NOT NULL AND p_expires_at <= account.monthly_expires_at THEN
    RETURN 'stale';
  END IF;

  -- Renewal: unused credits of the ending period carry up to that period's cap;
  -- earlier rollover is dropped (it never survives a second renewal).
  -- Bounded by both plans: credits of a no-rollover period never carry, and the
  -- new plan's maximum is never exceeded (e.g. Pro -> Growth carries at most 300).
  carry := LEAST(account.monthly_credits, account.monthly_rollover_cap, p_rollover_cap);

  UPDATE public.credit_accounts
     SET rollover_credits = carry,
         rollover_period_key = CASE WHEN carry > 0 THEN account.monthly_period_key END,
         rollover_expires_at = CASE WHEN carry > 0 THEN p_expires_at END,
         monthly_credits = p_credits,
         monthly_allotment = p_credits,
         monthly_rollover_cap = p_rollover_cap,
         monthly_period_key = p_period_key,
         monthly_expires_at = p_expires_at,
         updated_at = now()
   WHERE user_id = p_user_id;

  UPDATE public.user_credits
     SET credits = balance - account.monthly_credits - account.rollover_credits + carry + p_credits,
         updated_at = now()
   WHERE user_id = p_user_id;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN 'applied';
END;
$$;

-- 012 keeps working unchanged: Starter through the shared primitive, no rollover.
CREATE OR REPLACE FUNCTION credit_engine.set_monthly(p_user_id UUID, p_period_key TEXT, p_credits INTEGER, p_expires_at TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN credit_engine.grant_period(p_user_id, p_period_key, p_credits, 0, p_expires_at);
END;
$$;

-- Validates and records one subscription period, then grants it through grant_period.
-- p_period_* is the period being paid for: a monthly invoice period, or one
-- monthly slice of an annual term.
CREATE FUNCTION credit_engine.grant_subscription_period(
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

  SELECT user_id, plan, status, current_period_start, current_period_end INTO subscription_row
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

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA credit_engine FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Public RPCs (service_role only)
-- ---------------------------------------------------------------------------

-- Monthly invoices for any plan: same arguments as 012's grant_stripe_invoice_credits_v2.
CREATE FUNCTION public.grant_subscription_credits_v3(
  p_invoice_id TEXT,
  p_user_id UUID,
  p_subscription_id TEXT,
  p_plan TEXT,
  p_livemode BOOLEAN,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_invoice_id IS NULL OR p_invoice_id !~ '^in_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_invoice_id';
  END IF;
  RETURN credit_engine.grant_subscription_period(
    p_user_id, p_subscription_id, p_plan, 'monthly', p_livemode, p_period_start, p_period_end, p_invoice_id);
END;
$$;

-- Annual terms: grants the current month of the paid year, derived from the term
-- mirrored in stripe_subscriptions. Safe to call any number of times (hourly
-- job, or before a user's spend): each slice is granted once. Returns
-- applied | upgraded | duplicate | stale | simulated | inactive.
CREATE FUNCTION public.deliver_annual_subscription_credits(p_subscription_id TEXT, p_livemode BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET TimeZone = 'UTC'
AS $$
DECLARE
  term RECORD;
  months INTEGER;
  slice_start TIMESTAMPTZ;
  slice_end TIMESTAMPTZ;
BEGIN
  IF p_subscription_id IS NULL OR p_subscription_id !~ '^sub_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_subscription_id';
  END IF;

  SELECT user_id, plan, status, current_period_start, current_period_end INTO term
    FROM public.stripe_subscriptions WHERE stripe_subscription_id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  -- Only a paid, running term delivers anything.
  IF term.status NOT IN ('active', 'trialing') OR term.current_period_start IS NULL
     OR term.current_period_end IS NULL OR term.current_period_end <= now() OR term.current_period_start > now() THEN
    RETURN 'inactive';
  END IF;
  IF term.current_period_end - term.current_period_start NOT BETWEEN INTERVAL '360 days' AND INTERVAL '370 days' THEN
    RAISE EXCEPTION 'not_annual_term';
  END IF;

  months := (extract(year FROM age(now(), term.current_period_start)) * 12
             + extract(month FROM age(now(), term.current_period_start)))::INTEGER;
  slice_start := term.current_period_start + make_interval(months => months);
  slice_end := LEAST(term.current_period_start + make_interval(months => months + 1), term.current_period_end);

  RETURN credit_engine.grant_subscription_period(
    term.user_id, p_subscription_id, term.plan, 'annual', p_livemode, slice_start, slice_end, NULL);
END;
$$;

-- Origin breakdown, now with rollover.
CREATE OR REPLACE FUNCTION public.credit_balance_v2(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  account RECORD;
  packs INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;

  BEGIN
    balance := credit_engine.sync_account(p_user_id);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT IN ('credit_drift_detected', 'credit_init_requires_review') THEN
      RAISE;
    END IF;
    RETURN jsonb_build_object('status', SQLERRM,
      'balance', (SELECT credits FROM public.user_credits WHERE user_id = p_user_id));
  END;

  SELECT legacy_credits, monthly_credits, monthly_expires_at, rollover_credits, rollover_expires_at INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id;
  SELECT COALESCE(sum(credits_remaining), 0)::INTEGER INTO packs
    FROM public.credit_pack_lots
   WHERE user_id = p_user_id AND status = 'applied' AND expires_at > now();

  RETURN jsonb_build_object('status', 'ok', 'balance', balance, 'monthly', account.monthly_credits,
                            'monthly_expires_at', account.monthly_expires_at,
                            'rollover', account.rollover_credits, 'rollover_expires_at', account.rollover_expires_at,
                            'packs', packs, 'legacy', account.legacy_credits);
END;
$$;

-- Refunds return each credit to its origin while that origin is still valid.
CREATE OR REPLACE FUNCTION public.refund_credits_v2(p_user_id UUID, p_reservation_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  reservation RECORD;
  account RECORD;
  source RECORD;
  lot RECORD;
  refunded INTEGER := 0;
  forfeited INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;
  IF p_reservation_key IS NULL OR p_reservation_key !~ '^[a-z]+:[A-Za-z0-9-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_reservation_key';
  END IF;

  balance := credit_engine.sync_account(p_user_id);

  SELECT id, status INTO reservation
    FROM public.credit_reservations
   WHERE user_id = p_user_id AND reservation_key = p_reservation_key
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_found';
  END IF;
  IF reservation.status = 'refunded' THEN
    RETURN jsonb_build_object('status', 'already_refunded', 'balance', balance);
  END IF;

  SELECT monthly_period_key, monthly_expires_at, rollover_period_key, rollover_expires_at INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  FOR source IN
    SELECT s.source, s.lot_id, s.monthly_period_key, s.credits
      FROM public.credit_reservation_sources s
     WHERE s.reservation_id = reservation.id
     ORDER BY s.id
  LOOP
    IF source.source = 'legacy' THEN
      UPDATE public.credit_accounts
         SET legacy_credits = legacy_credits + source.credits, updated_at = now()
       WHERE user_id = p_user_id;
      refunded := refunded + source.credits;

    ELSIF source.source = 'monthly' THEN
      IF account.monthly_period_key = source.monthly_period_key AND account.monthly_expires_at > now() THEN
        UPDATE public.credit_accounts
           SET monthly_credits = monthly_credits + source.credits, updated_at = now()
         WHERE user_id = p_user_id;
        refunded := refunded + source.credits;
      ELSE
        forfeited := forfeited + source.credits;
      END IF;

    ELSIF source.source = 'rollover' THEN
      IF account.rollover_period_key = source.monthly_period_key AND account.rollover_expires_at > now() THEN
        UPDATE public.credit_accounts
           SET rollover_credits = rollover_credits + source.credits, updated_at = now()
         WHERE user_id = p_user_id;
        refunded := refunded + source.credits;
      ELSE
        forfeited := forfeited + source.credits;
      END IF;

    ELSE
      SELECT id, status, expires_at INTO lot
        FROM public.credit_pack_lots
       WHERE id = source.lot_id AND user_id = p_user_id
       FOR UPDATE;
      IF FOUND AND lot.status = 'applied' AND lot.expires_at > now() THEN
        UPDATE public.credit_pack_lots
           SET credits_remaining = credits_remaining + source.credits, updated_at = now()
         WHERE id = lot.id;
        refunded := refunded + source.credits;
      ELSE
        forfeited := forfeited + source.credits;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.credit_reservations
     SET status = 'refunded', refunded_at = now(), refunded_credits = refunded, forfeited_credits = forfeited
   WHERE id = reservation.id;

  balance := balance + refunded;
  IF refunded > 0 THEN
    UPDATE public.user_credits SET credits = balance, updated_at = now() WHERE user_id = p_user_id;
  END IF;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN jsonb_build_object('status', 'refunded', 'refunded', refunded, 'forfeited', forfeited, 'balance', balance);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_subscription_credits_v3(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deliver_annual_subscription_credits(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_subscription_credits_v3(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.deliver_annual_subscription_credits(TEXT, BOOLEAN) TO service_role;
