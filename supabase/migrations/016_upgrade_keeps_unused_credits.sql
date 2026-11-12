-- Paid upgrades keep the unused credits of the period they replace.
-- Apply manually after 007-015. Applying it changes no balance, lot, grant or
-- table: it adds one engine function and one service_role RPC, and gives
-- credit_engine.grant_subscription_period an optional p_upgrade flag
-- (default false, so every existing caller keeps the current rules).
--
-- Why: an upgrade (Starter -> Growth / Pro, Growth -> Pro) starts a NEW billing
-- period and is charged in full. Under the ordinary renewal rule the credits
-- still unused in the old period carry only up to the lower rollover cap
-- (Starter 0), so a user who already paid for them would lose them by upgrading.
--
-- Rule for a paid upgrade (credit_engine.grant_upgrade_period):
--   * The new plan's full allotment becomes the monthly credits of the new period.
--   * Unused monthly credits of the replaced period, plus any rollover still
--     valid, are kept as rollover credits: only what is really left (expired
--     credits were already removed by sync_account), with their ORIGINAL expiry
--     (the old period's end + 1 day), so they are spent before the new ones.
--   * Only for a real upgrade: a larger allotment than a known previous one, a
--     new period, and an old period still running. Anything else (same period,
--     stale, first grant, equal or lower plan) goes to grant_period unchanged.
--   * Same idempotency as grant_period: the period key decides; a repeated
--     invoice returns 'duplicate' and grants nothing.
--   Ordinary renewals, downgrades, annual deliveries and packs never use it.
--
-- Refunds after an upgrade (refund_credits_v2, one added branch): a generation
-- that reserved monthly credits of the replaced period and fails after the
-- upgrade gives them back to the kept credits, while those have not expired,
-- instead of forfeiting them. Kept credits are recognised by expiring before the
-- current monthly credits, which an ordinary renewal never produces (its
-- rollover expires with the new period), so renewal refunds are unchanged.
--
-- Reversible with:
--   DROP FUNCTION public.grant_subscription_upgrade_credits(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ);
--   DROP FUNCTION credit_engine.grant_subscription_period(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN);
--   then re-run the grant_subscription_period definition and its REVOKE from 015,
--   the refund_credits_v2 definition from 014, and
--   DROP FUNCTION credit_engine.grant_upgrade_period(UUID, TEXT, INTEGER, INTEGER, TIMESTAMPTZ);

BEGIN;

CREATE FUNCTION credit_engine.grant_upgrade_period(p_user_id UUID, p_period_key TEXT, p_credits INTEGER, p_rollover_cap INTEGER, p_expires_at TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  kept_rollover INTEGER;
  carry INTEGER;
  account RECORD;
BEGIN
  IF p_user_id IS NULL OR p_period_key IS NULL OR p_expires_at IS NULL
     OR p_credits IS NULL OR p_rollover_cap IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;

  -- Locks the user and removes whatever already expired, so it can never be kept.
  balance := credit_engine.sync_account(p_user_id);
  SELECT monthly_credits, monthly_allotment, monthly_period_key, monthly_expires_at,
         rollover_credits, rollover_expires_at
    INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  -- Not a paid upgrade into a new period: the ordinary rules (and their checks) apply.
  IF p_expires_at <= now()
     OR account.monthly_period_key IS NULL OR account.monthly_period_key = p_period_key
     OR account.monthly_expires_at IS NULL OR account.monthly_expires_at <= now()
     OR p_expires_at <= account.monthly_expires_at
     OR account.monthly_allotment = 0 OR p_credits <= account.monthly_allotment THEN
    RETURN credit_engine.grant_period(p_user_id, p_period_key, p_credits, p_rollover_cap, p_expires_at);
  END IF;
  IF p_credits NOT BETWEEN 1 AND 10000 OR p_rollover_cap NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'invalid_credits';
  END IF;

  kept_rollover := CASE WHEN account.rollover_credits > 0 AND account.rollover_expires_at > now()
                        THEN account.rollover_credits ELSE 0 END;
  carry := account.monthly_credits + kept_rollover;

  -- Everything kept expires when the replaced period would have: never later.
  -- The replaced period's key and expiry are recorded even when nothing is left,
  -- so a reservation of that period refunded later finds where to go back.
  UPDATE public.credit_accounts
     SET rollover_credits = carry,
         rollover_period_key = account.monthly_period_key,
         rollover_expires_at = account.monthly_expires_at,
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

REVOKE ALL ON FUNCTION credit_engine.grant_upgrade_period(UUID, TEXT, INTEGER, INTEGER, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated, service_role;

-- Same body as in 015, plus the optional p_upgrade flag (see the "016:" marker).
DROP FUNCTION credit_engine.grant_subscription_period(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE FUNCTION credit_engine.grant_subscription_period(
  p_user_id UUID,
  p_subscription_id TEXT,
  p_plan TEXT,
  p_interval TEXT,
  p_livemode BOOLEAN,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_invoice_id TEXT,
  p_upgrade BOOLEAN DEFAULT false
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

  -- 016: a paid upgrade keeps the unused credits of the period it replaces.
  IF p_upgrade THEN
    outcome := credit_engine.grant_upgrade_period(
      p_user_id,
      'period:' || p_subscription_id || ':' || floor(extract(epoch FROM p_period_start))::BIGINT,
      plan_credits, plan_cap, p_period_end + expiry_grace);
  ELSE
    outcome := credit_engine.grant_period(
      p_user_id,
      'period:' || p_subscription_id || ':' || floor(extract(epoch FROM p_period_start))::BIGINT,
      plan_credits, plan_cap, p_period_end + expiry_grace);
  END IF;

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

REVOKE ALL ON FUNCTION credit_engine.grant_subscription_period(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated, service_role;

-- The invoice of a paid upgrade (billing_reason subscription_update, new period).
-- Same checks and arguments as grant_subscription_credits_v3; monthly only.
CREATE FUNCTION public.grant_subscription_upgrade_credits(
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
    p_user_id, p_subscription_id, p_plan, 'monthly', p_livemode, p_period_start, p_period_end, p_invoice_id, true);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_subscription_upgrade_credits(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_subscription_upgrade_credits(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- Same body as in 014, plus one branch for credits kept by a paid upgrade (see the "016:" marker).
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
      -- 016: credits of a period replaced by a paid upgrade go back to the kept
      -- credits (they expire before the current monthly credits; a renewal's
      -- rollover never does), only while those have not expired.
      ELSIF account.rollover_period_key = source.monthly_period_key AND account.rollover_expires_at > now()
            AND account.rollover_expires_at < account.monthly_expires_at THEN
        UPDATE public.credit_accounts
           SET rollover_credits = rollover_credits + source.credits, updated_at = now()
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

COMMIT;
