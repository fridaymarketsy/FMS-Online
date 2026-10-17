/*
# Create storage bucket for ad images

## Changes
- Creates a public storage bucket named 'ad-images' for user-uploaded advertisement photos.
- Sets public read access (anyone can view ad images).
- Sets authenticated write access (only logged-in users can upload).

## Security
- SELECT (read): public — anyone browsing the marketplace can see ad photos
- INSERT (upload): authenticated only — must be logged in to post ads
- UPDATE/DELETE: authenticated, owner-only — enforced by storage policies
*/
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ad_images_public_read" ON storage.objects;
CREATE POLICY "ad_images_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "ad_images_authenticated_upload" ON storage.objects;
CREATE POLICY "ad_images_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "ad_images_owner_delete" ON storage.objects;
CREATE POLICY "ad_images_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ad-images' AND owner = auth.uid());
