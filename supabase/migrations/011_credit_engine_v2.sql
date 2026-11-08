-- DRAFT — DO NOT APPLY YET.
-- Credit engine v2: credits tracked by origin (monthly, packs, legacy) while
-- user_credits.credits stays the single visible balance.
--
-- Nothing calls these functions yet: reserve_credits, refund_credits, the
-- generation endpoints and grant_stripe_invoice_credits (009) are unchanged.
-- Applying this file creates objects only; no existing row is changed. A user's
-- origin breakdown is created lazily, the first time a v2 function touches them,
-- and starts with their whole current balance as 'legacy' credits.
--
-- Origins and consumption order:
--   1. monthly — current subscription period; expires at period end, replaced on renewal.
--   2. packs   — applied credit_pack_lots (010), soonest expiry first; never
--                simulated or expired lots.
--   3. legacy  — the balance a user had before v2 (signup, earlier plans); never expires.
--
-- Invariant, checked at the end of every v2 call:
--   user_credits.credits = legacy + monthly + remaining credits of applied lots.
--
-- Changes made outside v2 (old RPCs, 009) are drift:
--   * A decrease is real spending: it is taken in consumption order and every
--     origin is remembered (credit_drift_absorptions).
--   * An increase is accepted only when it returns credits taken that way, and
--     goes back to the same origin. Right after a user's first v2 contact, a
--     bounded grace (12 credits, 15 minutes) accepts old in-flight refunds as
--     legacy, because those credits were taken from the pre-v2 balance.
--   * Any other increase is never turned into credits: the call fails with
--     credit_drift_detected until the owner resolves it by hand with
--     credit_engine.resolve_drift.
-- A user who already received LIVE monthly credits through 009 is never
-- initialized automatically (credit_init_requires_review), so monthly credits
-- cannot become legacy.
--
-- Reversible with:
--   DROP FUNCTION public.reserve_credits_v2(UUID, TEXT, INTEGER);
--   DROP FUNCTION public.refund_credits_v2(UUID, TEXT);
--   DROP FUNCTION public.credit_balance_v2(UUID);
--   DROP SCHEMA credit_engine CASCADE;
--   DROP TABLE public.credit_drift_resolutions, public.credit_drift_absorptions,
--              public.credit_lot_expirations, public.credit_reservation_sources,
--              public.credit_reservations, public.credit_accounts;

CREATE SCHEMA credit_engine;
REVOKE ALL ON SCHEMA credit_engine FROM PUBLIC;

-- Origin breakdown of user_credits.credits (packs live in credit_pack_lots).
CREATE TABLE public.credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_credits INTEGER NOT NULL DEFAULT 0 CONSTRAINT credit_accounts_legacy_check CHECK (legacy_credits >= 0),
  monthly_credits INTEGER NOT NULL DEFAULT 0 CONSTRAINT credit_accounts_monthly_check CHECK (monthly_credits >= 0),
  monthly_period_key TEXT,
  monthly_expires_at TIMESTAMPTZ,
  -- Transition grace after the first v2 contact (see header).
  init_grace_until TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 minutes',
  init_grace_credits INTEGER NOT NULL DEFAULT 12 CONSTRAINT credit_accounts_grace_check CHECK (init_grace_credits BETWEEN 0 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_accounts_monthly_period_check CHECK (
    monthly_credits = 0 OR (monthly_period_key IS NOT NULL AND monthly_expires_at IS NOT NULL)
  )
);

-- One row per charge, identified by the caller's key (e.g. video:<uuid>).
CREATE TABLE public.credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_key TEXT NOT NULL
    CONSTRAINT credit_reservations_key_format CHECK (reservation_key ~ '^[a-z]+:[A-Za-z0-9-]{8,128}$'),
  credits INTEGER NOT NULL CONSTRAINT credit_reservations_credits_check CHECK (credits BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'reserved'
    CONSTRAINT credit_reservations_status_check CHECK (status IN ('reserved', 'refunded')),
  refunded_credits INTEGER,
  forfeited_credits INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refunded_at TIMESTAMPTZ,
  CONSTRAINT credit_reservations_user_key UNIQUE (user_id, reservation_key),
  CONSTRAINT credit_reservations_refund_check CHECK (
    (status = 'reserved' AND refunded_at IS NULL AND refunded_credits IS NULL AND forfeited_credits IS NULL)
    OR (status = 'refunded' AND refunded_at IS NOT NULL AND refunded_credits >= 0
        AND forfeited_credits >= 0 AND refunded_credits + forfeited_credits = credits)
  )
);

-- Where each reserved credit came from, so a refund returns it to that origin.
CREATE TABLE public.credit_reservation_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.credit_reservations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CONSTRAINT credit_reservation_sources_source_check CHECK (source IN ('monthly', 'pack', 'legacy')),
  lot_id UUID REFERENCES public.credit_pack_lots(id) ON DELETE CASCADE,
  monthly_period_key TEXT,
  credits INTEGER NOT NULL CONSTRAINT credit_reservation_sources_credits_check CHECK (credits > 0),
  CONSTRAINT credit_reservation_sources_lot_check CHECK ((source = 'pack') = (lot_id IS NOT NULL)),
  CONSTRAINT credit_reservation_sources_period_check CHECK ((source = 'monthly') = (monthly_period_key IS NOT NULL))
);

CREATE INDEX credit_reservation_sources_reservation_idx ON public.credit_reservation_sources (reservation_id);

-- Credits spent outside v2, by origin, so a later outside refund can go back there.
CREATE TABLE public.credit_drift_absorptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CONSTRAINT credit_drift_absorptions_source_check CHECK (source IN ('monthly', 'pack', 'legacy')),
  lot_id UUID REFERENCES public.credit_pack_lots(id) ON DELETE CASCADE,
  monthly_period_key TEXT,
  credits_absorbed INTEGER NOT NULL CONSTRAINT credit_drift_absorptions_absorbed_check CHECK (credits_absorbed > 0),
  credits_open INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_drift_absorptions_open_check CHECK (credits_open BETWEEN 0 AND credits_absorbed),
  CONSTRAINT credit_drift_absorptions_lot_check CHECK ((source = 'pack') = (lot_id IS NOT NULL)),
  CONSTRAINT credit_drift_absorptions_period_check CHECK ((source = 'monthly') = (monthly_period_key IS NOT NULL))
);

CREATE INDEX credit_drift_absorptions_open_idx
  ON public.credit_drift_absorptions (user_id, id) WHERE credits_open > 0;

-- Every manual drift resolution, for audit.
CREATE TABLE public.credit_drift_resolutions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CONSTRAINT credit_drift_resolutions_mode_check CHECK (mode IN ('legacy', 'discard')),
  credits INTEGER NOT NULL CONSTRAINT credit_drift_resolutions_credits_check CHECK (credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit of pack credits removed from the balance when a lot expired.
CREATE TABLE public.credit_lot_expirations (
  lot_id UUID PRIMARY KEY REFERENCES public.credit_pack_lots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_expired INTEGER NOT NULL CONSTRAINT credit_lot_expirations_credits_check CHECK (credits_expired > 0),
  expired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server reads only; every write goes through the functions below.
ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_reservation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_drift_absorptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_drift_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_lot_expirations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.credit_accounts, public.credit_reservations,
  public.credit_reservation_sources, public.credit_drift_absorptions,
  public.credit_drift_resolutions, public.credit_lot_expirations
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.credit_accounts, public.credit_reservations,
  public.credit_reservation_sources, public.credit_drift_absorptions,
  public.credit_drift_resolutions, public.credit_lot_expirations
  TO service_role;

-- Identity sequences: Supabase's default privileges would open them to the API roles.
REVOKE ALL ON SEQUENCE public.credit_reservation_sources_id_seq,
  public.credit_drift_absorptions_id_seq, public.credit_drift_resolutions_id_seq
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Internal helpers (schema credit_engine, no grants: only callable from the
-- SECURITY DEFINER functions below, or by the owner in the SQL editor).
-- Callers must already hold the user's user_credits row lock, which
-- sync_account takes.
-- ---------------------------------------------------------------------------

-- Takes p_amount credits in consumption order and records each origin: on the
-- reservation when one is given, otherwise as drift spent outside v2.
-- p_include_expired lets drift reach credits that expired but were not yet removed.
CREATE FUNCTION credit_engine.take(p_user_id UUID, p_amount INTEGER, p_reservation_id UUID, p_include_expired BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  pending INTEGER := p_amount;
  portion INTEGER;
  account RECORD;
  lot RECORD;
BEGIN
  SELECT legacy_credits, monthly_credits, monthly_period_key, monthly_expires_at
    INTO account
    FROM public.credit_accounts
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF account.monthly_credits > 0 AND (p_include_expired OR account.monthly_expires_at > now()) THEN
    portion := LEAST(pending, account.monthly_credits);
    UPDATE public.credit_accounts
       SET monthly_credits = monthly_credits - portion, updated_at = now()
     WHERE user_id = p_user_id;
    IF p_reservation_id IS NOT NULL THEN
      INSERT INTO public.credit_reservation_sources (reservation_id, source, monthly_period_key, credits)
      VALUES (p_reservation_id, 'monthly', account.monthly_period_key, portion);
    ELSE
      INSERT INTO public.credit_drift_absorptions (user_id, source, monthly_period_key, credits_absorbed, credits_open)
      VALUES (p_user_id, 'monthly', account.monthly_period_key, portion, portion);
    END IF;
    pending := pending - portion;
  END IF;

  IF pending > 0 THEN
    FOR lot IN
      SELECT id, credits_remaining
        FROM public.credit_pack_lots
       WHERE user_id = p_user_id
         AND status = 'applied'
         AND credits_remaining > 0
         AND (p_include_expired OR expires_at > now())
       ORDER BY expires_at, id
       FOR UPDATE
    LOOP
      portion := LEAST(pending, lot.credits_remaining);
      UPDATE public.credit_pack_lots
         SET credits_remaining = credits_remaining - portion, updated_at = now()
       WHERE id = lot.id;
      IF p_reservation_id IS NOT NULL THEN
        INSERT INTO public.credit_reservation_sources (reservation_id, source, lot_id, credits)
        VALUES (p_reservation_id, 'pack', lot.id, portion);
      ELSE
        INSERT INTO public.credit_drift_absorptions (user_id, source, lot_id, credits_absorbed, credits_open)
        VALUES (p_user_id, 'pack', lot.id, portion, portion);
      END IF;
      pending := pending - portion;
      EXIT WHEN pending = 0;
    END LOOP;
  END IF;

  IF pending > 0 THEN
    portion := LEAST(pending, account.legacy_credits);
    IF portion > 0 THEN
      UPDATE public.credit_accounts
         SET legacy_credits = legacy_credits - portion, updated_at = now()
       WHERE user_id = p_user_id;
      IF p_reservation_id IS NOT NULL THEN
        INSERT INTO public.credit_reservation_sources (reservation_id, source, credits)
        VALUES (p_reservation_id, 'legacy', portion);
      ELSE
        INSERT INTO public.credit_drift_absorptions (user_id, source, credits_absorbed, credits_open)
        VALUES (p_user_id, 'legacy', portion, portion);
      END IF;
      pending := pending - portion;
    END IF;
  END IF;

  IF pending > 0 THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;
END;
$$;

-- Fails if the visible balance and the origin breakdown disagree.
CREATE FUNCTION credit_engine.assert_balanced(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  visible INTEGER;
  tracked INTEGER;
BEGIN
  SELECT credits INTO visible FROM public.user_credits WHERE user_id = p_user_id;
  SELECT a.legacy_credits + a.monthly_credits + COALESCE((
           SELECT sum(l.credits_remaining)::INTEGER FROM public.credit_pack_lots l
            WHERE l.user_id = p_user_id AND l.status = 'applied'), 0)
    INTO tracked
    FROM public.credit_accounts a
   WHERE a.user_id = p_user_id;

  IF visible IS DISTINCT FROM tracked THEN
    RAISE EXCEPTION 'credit_invariant_broken';
  END IF;
END;
$$;

-- Locks the user, creates their breakdown on first contact, reconciles drift
-- (see header) and removes expired monthly and pack credits. Returns the
-- visible balance. p_on_unexplained: 'reject' (always, except for the owner's
-- manual resolve_drift), 'legacy' or 'discard'.
CREATE FUNCTION credit_engine.sync_account(p_user_id UUID, p_on_unexplained TEXT DEFAULT 'reject')
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  original INTEGER;
  packs INTEGER;
  drift INTEGER;
  portion INTEGER;
  forfeited INTEGER := 0;
  created UUID;
  account RECORD;
  absorbed RECORD;
  lot RECORD;
BEGIN
  IF p_on_unexplained IS NULL OR p_on_unexplained NOT IN ('reject', 'legacy', 'discard') THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;

  SELECT credits INTO balance FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'credits_row_missing';
  END IF;
  IF balance IS NULL OR balance < 0 THEN
    RAISE EXCEPTION 'invalid_balance';
  END IF;
  original := balance;

  SELECT COALESCE(sum(credits_remaining), 0)::INTEGER INTO packs
    FROM public.credit_pack_lots WHERE user_id = p_user_id AND status = 'applied';

  INSERT INTO public.credit_accounts (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id INTO created;

  IF created IS NOT NULL THEN
    -- First contact: today's balance (minus packs, already counted) becomes legacy.
    -- LIVE monthly credits from 009 cannot be told apart here, so those users wait for review.
    IF EXISTS (SELECT 1 FROM public.stripe_credit_grants WHERE user_id = p_user_id AND status = 'applied')
       OR balance < packs THEN
      RAISE EXCEPTION 'credit_init_requires_review';
    END IF;
    UPDATE public.credit_accounts SET legacy_credits = balance - packs WHERE user_id = p_user_id;
  END IF;

  SELECT legacy_credits, monthly_credits, monthly_period_key, monthly_expires_at,
         init_grace_until, init_grace_credits
    INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  drift := balance - (account.legacy_credits + account.monthly_credits + packs);

  IF drift < 0 THEN
    -- Spent outside v2: take it in consumption order and remember the origins.
    PERFORM credit_engine.take(p_user_id, -drift, NULL, true);

  ELSIF drift > 0 THEN
    -- 1. Returned outside v2 for something taken outside v2: back to that origin.
    FOR absorbed IN
      SELECT id, source, lot_id, monthly_period_key, credits_open
        FROM public.credit_drift_absorptions
       WHERE user_id = p_user_id AND credits_open > 0
       ORDER BY id DESC
       FOR UPDATE
    LOOP
      portion := LEAST(drift, absorbed.credits_open);
      IF absorbed.source = 'legacy' THEN
        UPDATE public.credit_accounts SET legacy_credits = legacy_credits + portion, updated_at = now()
         WHERE user_id = p_user_id;
      ELSIF absorbed.source = 'monthly' THEN
        IF account.monthly_period_key = absorbed.monthly_period_key AND account.monthly_expires_at > now() THEN
          UPDATE public.credit_accounts SET monthly_credits = monthly_credits + portion, updated_at = now()
           WHERE user_id = p_user_id;
        ELSE
          forfeited := forfeited + portion;
        END IF;
      ELSE
        UPDATE public.credit_pack_lots SET credits_remaining = credits_remaining + portion, updated_at = now()
         WHERE id = absorbed.lot_id AND user_id = p_user_id AND status = 'applied' AND expires_at > now();
        IF NOT FOUND THEN
          forfeited := forfeited + portion;
        END IF;
      END IF;
      UPDATE public.credit_drift_absorptions
         SET credits_open = credits_open - portion, updated_at = now()
       WHERE id = absorbed.id;
      drift := drift - portion;
      EXIT WHEN drift = 0;
    END LOOP;

    -- 2. Old in-flight refunds right after first contact: taken from the pre-v2 balance.
    IF drift > 0 AND account.init_grace_credits > 0 AND account.init_grace_until > now() THEN
      portion := LEAST(drift, account.init_grace_credits);
      UPDATE public.credit_accounts
         SET legacy_credits = legacy_credits + portion,
             init_grace_credits = init_grace_credits - portion,
             updated_at = now()
       WHERE user_id = p_user_id;
      drift := drift - portion;
    END IF;

    -- 3. Anything else is never turned into credits automatically.
    IF drift > 0 THEN
      IF p_on_unexplained = 'reject' THEN
        RAISE EXCEPTION 'credit_drift_detected';
      ELSIF p_on_unexplained = 'legacy' THEN
        UPDATE public.credit_accounts SET legacy_credits = legacy_credits + drift, updated_at = now()
         WHERE user_id = p_user_id;
      ELSE
        balance := balance - drift;
      END IF;
      INSERT INTO public.credit_drift_resolutions (user_id, mode, credits) VALUES (p_user_id, p_on_unexplained, drift);
    END IF;

    -- Credits that went back to an origin that no longer exists are not kept.
    balance := balance - forfeited;
  END IF;

  FOR lot IN
    SELECT id, credits_remaining
      FROM public.credit_pack_lots
     WHERE user_id = p_user_id AND status = 'applied' AND credits_remaining > 0 AND expires_at <= now()
     ORDER BY expires_at, id
     FOR UPDATE
  LOOP
    INSERT INTO public.credit_lot_expirations (lot_id, user_id, credits_expired)
    VALUES (lot.id, p_user_id, lot.credits_remaining);
    UPDATE public.credit_pack_lots SET credits_remaining = 0, updated_at = now() WHERE id = lot.id;
    balance := balance - lot.credits_remaining;
  END LOOP;

  SELECT monthly_credits, monthly_expires_at INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id;
  IF account.monthly_credits > 0 AND account.monthly_expires_at <= now() THEN
    UPDATE public.credit_accounts SET monthly_credits = 0, updated_at = now() WHERE user_id = p_user_id;
    balance := balance - account.monthly_credits;
  END IF;

  IF balance <> original THEN
    UPDATE public.user_credits SET credits = balance, updated_at = now() WHERE user_id = p_user_id;
  END IF;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN balance;
END;
$$;

-- Owner only (SQL editor): settles a credit_drift_detected user after review,
-- keeping the unexplained credits as legacy or removing them. Audited.
CREATE FUNCTION credit_engine.resolve_drift(p_user_id UUID, p_mode TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('legacy', 'discard') THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  RETURN credit_engine.sync_account(p_user_id, p_mode);
END;
$$;

-- Renewal primitive for a future grant_stripe_invoice_credits_v2: replaces only
-- the monthly part, so packs and legacy credits are kept. Ignores periods that
-- already ended or are older than the current one.
CREATE FUNCTION credit_engine.set_monthly(p_user_id UUID, p_period_key TEXT, p_credits INTEGER, p_expires_at TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  account RECORD;
BEGIN
  IF p_user_id IS NULL OR p_period_key IS NULL OR p_expires_at IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  IF p_credits IS NULL OR p_credits NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'invalid_credits';
  END IF;

  balance := credit_engine.sync_account(p_user_id);
  IF p_expires_at <= now() THEN
    RETURN 'stale';
  END IF;

  SELECT monthly_credits, monthly_period_key, monthly_expires_at INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  IF account.monthly_period_key = p_period_key THEN
    RETURN 'duplicate';
  END IF;
  IF account.monthly_expires_at IS NOT NULL AND p_expires_at <= account.monthly_expires_at THEN
    RETURN 'stale';
  END IF;

  UPDATE public.credit_accounts
     SET monthly_credits = p_credits,
         monthly_period_key = p_period_key,
         monthly_expires_at = p_expires_at,
         updated_at = now()
   WHERE user_id = p_user_id;

  UPDATE public.user_credits
     SET credits = balance - account.monthly_credits + p_credits, updated_at = now()
   WHERE user_id = p_user_id;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN 'applied';
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA credit_engine FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Versioned RPCs (service_role only). They do not replace reserve_credits or
-- refund_credits; endpoints switch to them in a later, separate change.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.reserve_credits_v2(p_user_id UUID, p_reservation_key TEXT, p_credits INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  existing RECORD;
  new_reservation_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;
  IF p_credits IS NULL OR p_credits NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'invalid_credits';
  END IF;
  IF p_reservation_key IS NULL OR p_reservation_key !~ '^[a-z]+:[A-Za-z0-9-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_reservation_key';
  END IF;

  balance := credit_engine.sync_account(p_user_id);

  SELECT id, credits, status INTO existing
    FROM public.credit_reservations
   WHERE user_id = p_user_id AND reservation_key = p_reservation_key;

  IF FOUND THEN
    IF existing.credits <> p_credits THEN
      RAISE EXCEPTION 'reservation_conflict';
    END IF;
    RETURN jsonb_build_object('status', 'duplicate', 'reservation_id', existing.id,
                              'reservation_status', existing.status, 'balance', balance);
  END IF;

  IF balance < p_credits THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_reservations (user_id, reservation_key, credits)
  VALUES (p_user_id, p_reservation_key, p_credits)
  RETURNING id INTO new_reservation_id;

  PERFORM credit_engine.take(p_user_id, p_credits, new_reservation_id, false);

  balance := balance - p_credits;
  UPDATE public.user_credits SET credits = balance, updated_at = now() WHERE user_id = p_user_id;

  PERFORM credit_engine.assert_balanced(p_user_id);
  RETURN jsonb_build_object('status', 'reserved', 'reservation_id', new_reservation_id, 'balance', balance);
END;
$$;

CREATE FUNCTION public.refund_credits_v2(p_user_id UUID, p_reservation_key TEXT)
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

  SELECT monthly_period_key, monthly_expires_at INTO account
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
      -- Only into the same, still running period; a renewed or ended period is not topped up.
      IF account.monthly_period_key = source.monthly_period_key AND account.monthly_expires_at > now() THEN
        UPDATE public.credit_accounts
           SET monthly_credits = monthly_credits + source.credits, updated_at = now()
         WHERE user_id = p_user_id;
        refunded := refunded + source.credits;
      ELSE
        forfeited := forfeited + source.credits;
      END IF;

    ELSE
      -- Only into the exact lot it came from, and only while that lot is valid.
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

-- Origin breakdown for the server (and, later, the UI through an API route).
-- Reports unresolved drift instead of failing, without changing anything.
CREATE FUNCTION public.credit_balance_v2(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance INTEGER;
  account RECORD;
  packs INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user_id';
  END IF;

  BEGIN
    balance := credit_engine.sync_account(p_user_id);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT IN ('credit_drift_detected', 'credit_init_requires_review') THEN
      RAISE;
    END IF;
    RETURN jsonb_build_object('status', SQLERRM,
      'balance', (SELECT credits FROM public.user_credits WHERE user_id = p_user_id));
  END;

  SELECT legacy_credits, monthly_credits, monthly_expires_at INTO account
    FROM public.credit_accounts WHERE user_id = p_user_id;
  SELECT COALESCE(sum(credits_remaining), 0)::INTEGER INTO packs
    FROM public.credit_pack_lots
   WHERE user_id = p_user_id AND status = 'applied' AND expires_at > now();

  RETURN jsonb_build_object('status', 'ok', 'balance', balance, 'monthly', account.monthly_credits,
                            'monthly_expires_at', account.monthly_expires_at,
                            'packs', packs, 'legacy', account.legacy_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credits_v2(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credits_v2(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_balance_v2(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits_v2(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits_v2(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_balance_v2(UUID) TO service_role;
