-- Durable, server-only claims for Video START idempotency.
-- Reversible with: DROP TABLE public.video_start_requests;
CREATE TABLE public.video_start_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'started', 'failed')),
  request_id TEXT,
  status_url TEXT,
  response_url TEXT,
  remaining_credits INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT video_start_requests_user_key_unique UNIQUE (user_id, idempotency_key)
);

ALTER TABLE public.video_start_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.video_start_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.video_start_requests TO service_role;
