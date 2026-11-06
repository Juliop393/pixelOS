-- Stripe billing state, kept apart from user_credits on purpose: nothing here
-- reads or changes a credit balance.
-- Apply manually before deploying code that depends on these tables.
-- Reversible with:
--   DROP TABLE public.stripe_webhook_events, public.stripe_subscriptions, public.stripe_customers;

CREATE TABLE public.stripe_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_price_id TEXT,
  plan TEXT CONSTRAINT stripe_subscriptions_plan_check
    CHECK (plan IS NULL OR plan IN ('starter', 'pro', 'business')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stripe_subscriptions_user_status_idx
  ON public.stripe_subscriptions (user_id, status);

-- Idempotency: one row per Stripe event, claimed before it is processed.
CREATE TABLE public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL,
  stripe_created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CONSTRAINT stripe_webhook_events_status_check
    CHECK (status IN ('processing', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (status, updated_at);

-- Server only: no policies, so browser roles get nothing.
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_customers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.stripe_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.stripe_customers TO service_role, postgres;
GRANT ALL ON TABLE public.stripe_subscriptions TO service_role, postgres;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role, postgres;
