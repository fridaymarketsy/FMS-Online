/*
# Create increment_views function

## Changes
- Creates a SECURITY DEFINER function to safely increment ad view counts.
- Grants execute to anon and authenticated roles.

## Security
- The function only increments, never reads sensitive data.
- No arguments can be abused — it only takes an ad UUID.
*/

CREATE OR REPLACE FUNCTION increment_views(ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ads SET views = views + 1 WHERE id = ad_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_views(uuid) TO anon, authenticated;
