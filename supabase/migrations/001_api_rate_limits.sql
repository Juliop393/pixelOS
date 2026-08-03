-- Rate limits for Pixel IA and future endpoints
-- This table records each API call so we can enforce per-user limits.
-- Only the server (service_role) reads and writes this table.
-- Never expose it to the browser.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  endpoint   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by user + endpoint + time window
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint_created
  ON public.api_rate_limits (user_id, endpoint, created_at DESC);

-- Periodic cleanup: drop records older than 48 hours
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_created
  ON public.api_rate_limits (created_at);

-- Row Level Security: deny all direct access from the browser
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = nobody can read/write via anon/authenticated roles.
-- The server uses the service_role key to bypass RLS.
