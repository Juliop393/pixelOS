-- Shared catalog for persisted image and video assets.
-- Apply manually before deploying code that depends on this table.
-- Reversible with: DROP TABLE public.creative_assets;
CREATE TABLE public.creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CONSTRAINT creative_assets_media_type_check
    CHECK (media_type IN ('image', 'video')),
  kind TEXT,
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  title TEXT,
  format TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creative_assets_kind_check CHECK (
    (media_type = 'image' AND kind IS NULL) OR
    (media_type = 'video' AND kind IS NOT NULL AND kind IN ('scene', 'final'))
  ),
  CONSTRAINT creative_assets_bucket_path_unique UNIQUE (bucket, storage_path)
);

CREATE INDEX creative_assets_user_created_idx
  ON public.creative_assets (user_id, created_at DESC);

CREATE INDEX creative_assets_user_media_created_idx
  ON public.creative_assets (user_id, media_type, created_at DESC);

ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.creative_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.creative_assets TO authenticated;
GRANT ALL ON TABLE public.creative_assets TO service_role, postgres;

CREATE POLICY creative_assets_select_own
  ON public.creative_assets
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
