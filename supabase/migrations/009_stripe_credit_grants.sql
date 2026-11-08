-- Stripe Starter monthly credits, granted once per paid invoice.
-- Apply manually after 007 and 008, before deploying the webhook that calls it.
--
-- Rules:
--   * Only the server (service_role) can read the grants table or run the function.
--   * One row per Stripe invoice: a repeated invoice never touches the balance again.
--   * LIVE invoices set the balance to the Starter monthly amount (no rollover).
--   * TEST invoices are only recorded as 'simulated': user_credits is never changed.
--   * Any error rolls back the whole call, so there are no partial grants.
--
-- Reversible with:
--   DROP FUNCTION public.grant_stripe_invoice_credits(TEXT, UUID, TEXT, TEXT, BOOLEAN);
--   DROP TABLE public.stripe_credit_grants;

CREATE TABLE public.stripe_credit_grants (
  stripe_invoice_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  plan TEXT NOT NULL CONSTRAINT stripe_credit_grants_plan_check CHECK (plan IN ('starter')),
  credits INTEGER NOT NULL CONSTRAINT stripe_credit_grants_credits_check CHECK (credits > 0),
  livemode BOOLEAN NOT NULL,
  status TEXT NOT NULL CONSTRAINT stripe_credit_grants_status_check CHECK (status IN ('simulated', 'applied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stripe_credit_grants_mode_check CHECK (
    (livemode AND status = 'applied') OR (NOT livemode AND status = 'simulated')
  )
);

CREATE INDEX stripe_credit_grants_user_idx ON public.stripe_credit_grants (user_id, created_at);

ALTER TABLE public.stripe_credit_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_credit_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_credit_grants TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.grant_stripe_invoice_credits(
  p_invoice_id TEXT,
  p_user_id UUID,
  p_subscription_id TEXT,
  p_plan TEXT,
  p_livemode BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  monthly_credits CONSTANT INTEGER := 120; -- Starter; the amount never comes from the caller.
  account RECORD;
  subscription_row RECORD;
  inserted TEXT;
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

  -- The subscription must exist, belong to this user and be on Starter
  -- (TEST and LIVE alike), so a wrong user/subscription pair never records.
  SELECT user_id, plan
    INTO subscription_row
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

  -- Locks the balance row so concurrent invoices for one user apply in order.
  SELECT credits, subscription_status, paddle_subscription_id
    INTO account
    FROM public.user_credits
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credits_row_missing';
  END IF;

  -- A real Paddle plan that is still active must be resolved by hand first,
  -- unless this balance is already managed by an earlier Stripe LIVE grant.
  IF p_livemode
     AND account.subscription_status = 'active'
     AND account.paddle_subscription_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.stripe_credit_grants
        WHERE user_id = p_user_id AND status = 'applied'
     ) THEN
    RAISE EXCEPTION 'legacy_paddle_subscription_active';
  END IF;

  INSERT INTO public.stripe_credit_grants
    (stripe_invoice_id, user_id, stripe_subscription_id, plan, credits, livemode, status)
  VALUES
    (p_invoice_id, p_user_id, p_subscription_id, p_plan, monthly_credits, p_livemode,
     CASE WHEN p_livemode THEN 'applied' ELSE 'simulated' END)
  ON CONFLICT (stripe_invoice_id) DO NOTHING
  RETURNING stripe_invoice_id INTO inserted;

  IF inserted IS NULL THEN
    RETURN 'duplicate';
  END IF;

  IF NOT p_livemode THEN
    RETURN 'simulated';
  END IF;

  -- Monthly credits do not roll over: each paid period resets the balance.
  UPDATE public.user_credits
     SET credits = monthly_credits,
         plan = p_plan,
         subscription_status = 'active',
         updated_at = now()
   WHERE user_id = p_user_id;

  RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION public.grant_stripe_invoice_credits(TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_stripe_invoice_credits(TEXT, UUID, TEXT, TEXT, BOOLEAN) TO service_role;
