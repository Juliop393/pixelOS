-- Idempotency tracking for Paddle webhooks
-- Prevents duplicate processing of the same event_id.
-- Only the server (service_role) reads and writes this table.

CREATE TABLE IF NOT EXISTS public.paddle_webhook_events (
  event_id      TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  processed_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paddle_events_occurred
  ON public.paddle_webhook_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_paddle_events_status
  ON public.paddle_webhook_events (status);

-- Out-of-order protection: store the last event timestamp per subscription.
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS last_paddle_occurred_at TIMESTAMPTZ;

-- RLS: deny all direct browser access.
ALTER TABLE public.paddle_webhook_events ENABLE ROW LEVEL SECURITY;
