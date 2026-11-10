-- Credit pack purchases through the credit engine v2 (011).
-- Apply manually after 010, 011 and 012. Creates one function only; no existing
-- row, lot, balance or function is changed. The webhook keeps calling the 010
-- function (which still refuses LIVE) until it is switched to this one in a
-- separate change.
--
-- record_credit_pack_purchase_v2 takes the same arguments as the 010 function.
-- The pack alone decides the credits (small 60, medium 180, large 480); the
-- caller only names a pack the server already verified against Stripe.
--
-- Outcomes:
--   simulated  TEST payment: one 'simulated' lot, never spendable. user_credits
--              and the engine are untouched (same behaviour as 010).
--   applied    LIVE payment: the account is synced through the engine, one
--              'applied' lot is stored and user_credits.credits grows by the pack,
--              all in one transaction under the user's balance lock. Legacy and
--              monthly credits are kept; the lot expires 12 months after purchase.
--   duplicate  PaymentIntent already recorded for this user, pack and mode.
--
-- Errors (the whole transaction is rolled back, nothing is credited):
--   invalid_payment_intent_id, invalid_user_id, invalid_livemode,
--   invalid_purchased_at, unsupported_pack, credits_row_missing,
--   pack_already_expired, payment_user_mismatch, payment_pack_mismatch,
--   payment_mode_mismatch, plus the engine's own errors (credit_drift_detected,
--   credit_init_requires_review, credit_invariant_broken).
--
-- Reversible with:
--   DROP FUNCTION public.record_credit_pack_purchase_v2(TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ);

CREATE FUNCTION public.record_credit_pack_purchase_v2(
  p_payment_intent_id TEXT,
  p_user_id UUID,
  p_pack TEXT,
  p_livemode BOOLEAN,
  p_purchased_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET TimeZone = 'UTC'
AS $$
DECLARE
  validity CONSTANT INTERVAL := '12 months';
  pack_credits INTEGER;
  balance INTEGER;
  existing RECORD;
  inserted UUID;
BEGIN
  IF p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_payment_intent_id';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;
  IF p_livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_livemode';
  END IF;
  IF p_purchased_at IS NULL OR p_purchased_at > now() + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'invalid_purchased_at';
  END IF;

  pack_credits := CASE p_pack
    WHEN 'small' THEN 60
    WHEN 'medium' THEN 180
    WHEN 'large' THEN 480
  END;
  IF pack_credits IS NULL THEN
    RAISE EXCEPTION 'unsupported_pack';
  END IF;

  IF p_livemode THEN
    -- Balance lock first, in the engine's order (user_credits, credit_accounts,
    -- lots), so duplicate deliveries and concurrent reservations wait here.
    PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'credits_row_missing';
    END IF;
  END IF;

  -- A PaymentIntent is recorded once and never changes owner, pack or mode.
  SELECT user_id, pack, livemode INTO existing
    FROM public.credit_pack_lots
   WHERE stripe_payment_intent_id = p_payment_intent_id;
  IF FOUND THEN
    IF existing.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'payment_user_mismatch';
    END IF;
    IF existing.pack IS DISTINCT FROM p_pack THEN
      RAISE EXCEPTION 'payment_pack_mismatch';
    END IF;
    IF existing.livemode IS DISTINCT FROM p_livemode THEN
      RAISE EXCEPTION 'payment_mode_mismatch';
    END IF;
    RETURN 'duplicate';
  END IF;

  IF NOT p_livemode THEN
    -- TEST: record once, never touch balances or the engine.
    INSERT INTO public.credit_pack_lots
      (user_id, stripe_payment_intent_id, pack, credits_original, credits_remaining,
       purchased_at, expires_at, livemode, status)
    VALUES
      (p_user_id, p_payment_intent_id, p_pack, pack_credits, pack_credits,
       p_purchased_at, p_purchased_at + validity, false, 'simulated')
    ON CONFLICT ON CONSTRAINT credit_pack_lots_payment_key DO NOTHING
    RETURNING id INTO inserted;
    IF inserted IS NULL THEN
      -- Lost a race with another delivery: settle it like a recorded payment.
      RETURN public.record_credit_pack_purchase_v2(p_payment_intent_id, p_user_id, p_pack, p_livemode, p_purchased_at);
    END IF;
    RETURN 'simulated';
  END IF;

  -- LIVE. A lot that would already be expired is never credited.
  IF p_purchased_at + validity <= now() THEN
    RAISE EXCEPTION 'pack_already_expired';
  END IF;

  -- Sync before the lot exists: on first contact the engine turns today's
  -- balance into legacy, which must not include this pack yet. Also removes
  -- expired credits and reconciles drift, or fails and nothing is credited.
  balance := credit_engine.sync_account(p_user_id);

  INSERT INTO public.credit_pack_lots
    (user_id, stripe_payment_intent_id, pack, credits_original, credits_remaining,
     purchased_at, expires_at, livemode, status)
  VALUES
    (p_user_id, p_payment_intent_id, p_pack, pack_credits, pack_credits,
     p_purchased_at, p_purchased_at + validity, true, 'applied')
  ON CONFLICT ON CONSTRAINT credit_pack_lots_payment_key DO NOTHING
  RETURNING id INTO inserted;

  IF inserted IS NULL THEN
    -- Another user's transaction stored this PaymentIntent meanwhile (the same
    -- user cannot race here: they wait on the balance lock above).
    RAISE EXCEPTION 'payment_user_mismatch';
  END IF;

  UPDATE public.user_credits
     SET credits = balance + pack_credits, updated_at = now()
   WHERE user_id = p_user_id;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION public.record_credit_pack_purchase_v2(TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_pack_purchase_v2(TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ)
  TO service_role;
