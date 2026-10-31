-- Private video bucket. Objects will be written by server-side service_role code.
-- No client storage.objects policies are granted by this migration.
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;
