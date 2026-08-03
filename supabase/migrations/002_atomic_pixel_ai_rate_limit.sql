-- Atomic rate limit check + record for Pixel IA
-- Replaces separate count-then-insert with a single PostgreSQL transaction.
-- The advisory lock serializes concurrent requests per user+endpoint.

CREATE OR REPLACE FUNCTION public.check_and_record_api_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_short_limit INTEGER,
  p_short_window_seconds INTEGER,
  p_daily_limit INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lock_key BIGINT;
  short_count BIGINT;
  daily_count BIGINT;
  short_ago TIMESTAMPTZ;
  daily_ago TIMESTAMPTZ;
BEGIN
  -- Advisory lock: serializes concurrent requests for the same user + endpoint
  -- Released automatically when the transaction commits or rolls back.
  lock_key := hashtext(p_user_id::text || ':' || p_endpoint);
  PERFORM pg_advisory_xact_lock(lock_key);

  short_ago := now() - (p_short_window_seconds || ' seconds')::INTERVAL;
  daily_ago  := now() - INTERVAL '24 hours';

  -- Count requests in the short window
  SELECT count(*) INTO short_count
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at >= short_ago;

  IF short_count >= p_short_limit THEN
    RETURN 'short_limit';
  END IF;

  -- Count requests in the daily window
  SELECT count(*) INTO daily_count
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at >= daily_ago;

  IF daily_count >= p_daily_limit THEN
    RETURN 'daily_limit';
  END IF;

  -- Allowed: insert the record atomically within the same transaction
  INSERT INTO api_rate_limits (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);

  RETURN 'allowed';
END;
$$;

-- Only the server (service_role) should execute this function.
-- Revoke public access, grant to the role that the admin client uses.
REVOKE ALL ON FUNCTION public.check_and_record_api_rate_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_record_api_rate_limit FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_api_rate_limit TO service_role;
