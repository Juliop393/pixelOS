-- Credit pack lots: one row per one-time Stripe pack payment.
-- Apply manually after 009. Creates objects only; no existing row is changed.
--
-- Rules:
--   * Packs: small 60, medium 180, large 480 credits, valid 12 months from purchase.
--   * One lot per Stripe PaymentIntent; a repeated payment never creates a second lot.
--   * A lot belongs to exactly one user, and a payment can never move to another user.
--   * Only the server (service_role) can read or write lots or run the function.
--   * TEST payments are only recorded as 'simulated' and are never spendable.
--   * Phase 1: LIVE lots are refused. They can only be enabled together with the
--     consumption and monthly renewal changes, because today's renewal (009)
--     resets user_credits.credits to 120 and would erase purchased credits.
--
-- Reversible with:
--   DROP FUNCTION public.record_credit_pack_purchase(TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ);
--   DROP TABLE public.credit_pack_lots;

CREATE TABLE public.credit_pack_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL
    CONSTRAINT credit_pack_lots_payment_key UNIQUE
    CONSTRAINT credit_pack_lots_payment_format CHECK (stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  pack TEXT NOT NULL,
  credits_original INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  livemode BOOLEAN NOT NULL,
  status TEXT NOT NULL CONSTRAINT credit_pack_lots_status_check CHECK (status IN ('simulated', 'applied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The pack decides the amount; nothing else can.
  CONSTRAINT credit_pack_lots_pack_credits_check CHECK (
    (pack = 'small' AND credits_original = 60) OR
    (pack = 'medium' AND credits_original = 180) OR
    (pack = 'large' AND credits_original = 480)
  ),
  CONSTRAINT credit_pack_lots_remaining_check CHECK (credits_remaining BETWEEN 0 AND credits_original),
  CONSTRAINT credit_pack_lots_expiry_check CHECK (expires_at > purchased_at),
  CONSTRAINT credit_pack_lots_mode_check CHECK (
    (livemode AND status = 'applied') OR (NOT livemode AND status = 'simulated')
  ),
  -- A simulated (TEST) lot can never be spent.
  CONSTRAINT credit_pack_lots_simulated_untouched_check CHECK (
    status = 'applied' OR credits_remaining = credits_original
  )
);

-- Future consumption order: a user's spendable lots, soonest to expire first.
CREATE INDEX credit_pack_lots_spendable_idx
  ON public.credit_pack_lots (user_id, expires_at)
  WHERE status = 'applied' AND credits_remaining > 0;

ALTER TABLE public.credit_pack_lots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credit_pack_lots FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.credit_pack_lots TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.record_credit_pack_purchase(
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
  pack_credits INTEGER;
  existing_user UUID;
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

  -- Phase 1 only prepares storage: no LIVE lot may exist until consumption
  -- and monthly renewal know how to keep purchased credits.
  IF p_livemode THEN
    RAISE EXCEPTION 'live_packs_not_enabled';
  END IF;

  INSERT INTO public.credit_pack_lots
    (user_id, stripe_payment_intent_id, pack, credits_original, credits_remaining,
     purchased_at, expires_at, livemode, status)
  VALUES
    (p_user_id, p_payment_intent_id, p_pack, pack_credits, pack_credits,
     p_purchased_at, p_purchased_at + INTERVAL '12 months', p_livemode,
     CASE WHEN p_livemode THEN 'applied' ELSE 'simulated' END)
  ON CONFLICT ON CONSTRAINT credit_pack_lots_payment_key DO NOTHING
  RETURNING id INTO inserted;

  IF inserted IS NOT NULL THEN
    RETURN CASE WHEN p_livemode THEN 'applied' ELSE 'simulated' END;
  END IF;

  -- Already recorded: harmless for the same user, an error for anyone else.
  SELECT user_id INTO existing_user
    FROM public.credit_pack_lots
   WHERE stripe_payment_intent_id = p_payment_intent_id;

  IF existing_user IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'payment_user_mismatch';
  END IF;
  RETURN 'duplicate';
END;
$$;

REVOKE ALL ON FUNCTION public.record_credit_pack_purchase(TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_pack_purchase(TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ) TO service_role;
