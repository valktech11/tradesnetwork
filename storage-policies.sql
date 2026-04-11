-- storage-policies.sql
-- Safe to re-run at any time — DROP IF EXISTS before every CREATE POLICY
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

-- ── BUCKETS ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── AVATARS POLICIES ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "avatars_public_read"          ON storage.objects;
DROP POLICY IF EXISTS "avatars_service_upload"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_service_update"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_service_delete"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_upload" ON storage.objects;

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_service_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_service_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_service_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- ── PORTFOLIO POLICIES ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "portfolio_public_read"          ON storage.objects;
DROP POLICY IF EXISTS "portfolio_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_service_update"       ON storage.objects;
DROP POLICY IF EXISTS "portfolio_service_delete"       ON storage.objects;

CREATE POLICY "portfolio_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_authenticated_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "portfolio_service_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_service_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'portfolio');
