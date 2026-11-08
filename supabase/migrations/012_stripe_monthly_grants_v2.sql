-- Starter monthly credits through the credit engine v2 (011).
-- Apply manually after 011. Creates one function only; no existing row is changed.
--
-- grant_stripe_invoice_credits_v2 replaces only the monthly part of a balance:
-- legacy credits and credit packs are kept, packs keep their expiry, and monthly
-- credits never become legacy. The webhook keeps calling the 009 function until
-- it is switched to this one in a separate change.
--
-- Outcomes:
--   applied    LIVE invoice: monthly credits set to 120, invoice recorded as applied.
--   simulated  TEST invoice: recorded only; user_credits and the engine are untouched.
--   duplicate  Invoice already recorded, or its period was already granted by another invoice.
--   stale      Period already ended or older than the current one: nothing recorded.
--
-- Reversible with:
--   DROP FUNCTION public.grant_stripe_invoice_credits_v2(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.grant_stripe_invoice_credits_v2(
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
DECLARE
  monthly_credits CONSTANT INTEGER := 120;      -- Starter; the amount never comes from the caller.
  expiry_grace CONSTANT INTERVAL := '1 day';    -- covers a renewal paid a little after period end
  subscription_row RECORD;
  existing_user UUID;
  period_key TEXT;
  outcome TEXT;
BEGIN
  IF p_invoice_id IS NULL OR p_invoice_id !~ '^in_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_invoice_id';
  END IF;
  IF p_subscription_id IS NULL OR p_subscription_id !~ '^sub_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_subscription_id';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;
  IF p_livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_livemode';
  END IF;
  IF p_plan IS DISTINCT FROM 'starter' THEN
    RAISE EXCEPTION 'unsupported_plan';
  END IF;
  -- Monthly billing only (Stripe months run 28 to 31 days).
  IF p_period_start IS NULL OR p_period_end IS NULL
     OR p_period_end - p_period_start NOT BETWEEN INTERVAL '27 days' AND INTERVAL '32 days' THEN
    RAISE EXCEPTION 'invalid_period';
  END IF;

  -- The subscription must exist, belong to this user and be on Starter.
  SELECT user_id, plan INTO subscription_row
    FROM public.stripe_subscriptions
   WHERE stripe_subscription_id = p_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;
  IF subscription_row.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'subscription_user_mismatch';
  END IF;
  IF subscription_row.plan IS DISTINCT FROM 'starter' THEN
    RAISE EXCEPTION 'subscription_plan_mismatch';
  END IF;

  IF NOT p_livemode THEN
    -- TEST: record once, never touch balances or the engine.
    INSERT INTO public.stripe_credit_grants
      (stripe_invoice_id, user_id, stripe_subscription_id, plan, credits, livemode, status)
    VALUES (p_invoice_id, p_user_id, p_subscription_id, p_plan, monthly_credits, false, 'simulated')
    ON CONFLICT (stripe_invoice_id) DO NOTHING;
    IF NOT FOUND THEN
      SELECT user_id INTO existing_user FROM public.stripe_credit_grants WHERE stripe_invoice_id = p_invoice_id;
      IF existing_user IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'invoice_user_mismatch';
      END IF;
      RETURN 'duplicate';
    END IF;
    RETURN 'simulated';
  END IF;

  -- LIVE: lock the balance row first, in the same order as the engine, so
  -- concurrent reservations and duplicate deliveries of this invoice wait.
  PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'credits_row_missing';
  END IF;

  SELECT user_id INTO existing_user FROM public.stripe_credit_grants WHERE stripe_invoice_id = p_invoice_id;
  IF FOUND THEN
    IF existing_user IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'invoice_user_mismatch';
    END IF;
    RETURN 'duplicate';
  END IF;

  -- One period per subscription: a second invoice for the same period is a duplicate,
  -- an older or finished period is stale. Only the monthly part is replaced.
  period_key := 'starter:' || p_subscription_id || ':' || floor(extract(epoch FROM p_period_start))::BIGINT;
  outcome := credit_engine.set_monthly(p_user_id, period_key, monthly_credits, p_period_end + expiry_grace);

  IF outcome <> 'applied' THEN
    RETURN outcome; -- 'duplicate' or 'stale': nothing is recorded as applied.
  END IF;

  -- Recorded after set_monthly: on a user's first v2 contact, the engine refuses
  -- to initialize if an applied grant already exists.
  INSERT INTO public.stripe_credit_grants
    (stripe_invoice_id, user_id, stripe_subscription_id, plan, credits, livemode, status)
  VALUES (p_invoice_id, p_user_id, p_subscription_id, p_plan, monthly_credits, true, 'applied');

  UPDATE public.user_credits
     SET plan = 'starter', subscription_status = 'active', updated_at = now()
   WHERE user_id = p_user_id;

  RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION public.grant_stripe_invoice_credits_v2(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_stripe_invoice_credits_v2(TEXT, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;
