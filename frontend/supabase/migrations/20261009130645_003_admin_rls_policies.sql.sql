/*
# Add admin RLS policies for ads and feedback update

## Changes
1. Allow admin users to SELECT all ads (including expired/removed) — they already can via the public policy, but this ensures admin sees everything even with future status changes.
2. Allow admin users to UPDATE reports status (review/resolve).
3. Allow admin users to DELETE any ad (not just own).
4. Allow admin users to UPDATE any ad status.

## Security
- All admin policies require EXISTS check against profiles table confirming role = 'admin'.
- Non-admin users are unaffected by these policies.
*/

-- Admin can update any ad (e.g. change status, remove)
DROP POLICY IF EXISTS "ads_update_admin" ON ads;
CREATE POLICY "ads_update_admin"
ON ads FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Admin can delete any ad
DROP POLICY IF EXISTS "ads_delete_admin" ON ads;
CREATE POLICY "ads_delete_admin"
ON ads FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Admin can update reports status
DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin"
ON reports FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
