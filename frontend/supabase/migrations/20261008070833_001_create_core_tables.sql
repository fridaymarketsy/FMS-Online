/*
# Create core tables for Friday Market Syria

## Overview
Creates the complete database schema for a Syrian classifieds marketplace with username/password authentication (no email), advertisements with 7-day expiration, favorites, reports, and feedback.

## New Tables

### 1. profiles
Stores user account data. Each row links to a Supabase auth user via `id` (uuid, PK, FK to auth.users).
- id (uuid, PK, FK to auth.users ON DELETE CASCADE)
- username (text, UNIQUE, NOT NULL) — login identifier, no email
- full_name (text, NOT NULL)
- surname (text, nullable)
- phone (text, NOT NULL) — primary phone
- secondary_phone (text, nullable) — optional second phone
- province (text, NOT NULL) — governorate
- city (text, NOT NULL)
- approximate_location (text, NOT NULL)
- role (text, NOT NULL, DEFAULT 'user') — 'user' or 'admin'
- created_at (timestamptz, DEFAULT now())
- updated_at (timestamptz, DEFAULT now())

### 2. ads
Stores all advertisements. Each ad belongs to a seller (profiles.id).
- id (uuid, PK, DEFAULT gen_random_uuid())
- seller_id (uuid, NOT NULL, FK to profiles ON DELETE CASCADE)
- title (text, NOT NULL, CHECK length <= 50)
- description (text, NOT NULL)
- category (text, NOT NULL)
- subcategory (text, nullable)
- condition (text, NOT NULL)
- price (numeric, NOT NULL, DEFAULT 0)
- images (text[], NOT NULL, DEFAULT '{}') — array of Supabase Storage public URLs
- contact_phone (text, NOT NULL) — the phone number the seller chose for this ad
- province (text, NOT NULL)
- city (text, NOT NULL)
- approximate_location (text, NOT NULL)
- status (text, NOT NULL, DEFAULT 'active') — 'active', 'expired', 'removed'
- job_status (text, nullable) — 'available' or 'closed' (only for jobs category)
- views (integer, NOT NULL, DEFAULT 0)
- created_at (timestamptz, NOT NULL, DEFAULT now())
- updated_at (timestamptz, NOT NULL, DEFAULT now())
- expires_at (timestamptz, NOT NULL, DEFAULT now() + interval '7 days')

### 3. favorites
Many-to-many: users can save ads.
- id (uuid, PK, DEFAULT gen_random_uuid())
- user_id (uuid, NOT NULL, FK to profiles ON DELETE CASCADE)
- ad_id (uuid, NOT NULL, FK to ads ON DELETE CASCADE)
- created_at (timestamptz, DEFAULT now())
- UNIQUE(user_id, ad_id)

### 4. reports
Users can report ads with predefined reasons.
- id (uuid, PK, DEFAULT gen_random_uuid())
- ad_id (uuid, NOT NULL, FK to ads ON DELETE CASCADE)
- reporter_id (uuid, nullable, FK to profiles ON DELETE SET NULL)
- reason (text, NOT NULL)
- description (text, nullable) — only for "مشكلة أخرى"
- status (text, NOT NULL, DEFAULT 'open') — 'open', 'reviewed', 'resolved'
- created_at (timestamptz, DEFAULT now())

### 5. feedback
Users can submit feedback/suggestions.
- id (uuid, PK, DEFAULT gen_random_uuid())
- user_id (uuid, nullable, FK to profiles ON DELETE SET NULL)
- type (text, NOT NULL)
- description (text, NOT NULL)
- status (text, NOT NULL, DEFAULT 'new')
- created_at (timestamptz, DEFAULT now())

## Security (RLS)
- profiles: users can read all profiles (needed for seller cards), update only own. INSERT handled by edge function with service role.
- ads: public SELECT for active non-expired ads; sellers can INSERT/UPDATE/DELETE own ads; sellers can SELECT their own expired ads.
- favorites: users can CRUD only their own favorites.
- reports: users can INSERT reports; only admins can SELECT; users cannot read other users' reports.
- feedback: users can INSERT feedback; only admins can SELECT.

## Indexes
- ads(seller_id) — for "My Ads" queries
- ads(category) — for category filtering
- ads(status, expires_at) — for active ad filtering
- ads(created_at DESC) — for newest sorting
- favorites(user_id, ad_id) UNIQUE — prevents duplicates
- profiles(username) UNIQUE — for login lookup
*/
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  surname text,
  phone text NOT NULL,
  secondary_phone text,
  province text NOT NULL,
  city text NOT NULL,
  approximate_location text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 50),
  description text NOT NULL,
  category text NOT NULL,
  subcategory text,
  condition text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  images text[] NOT NULL DEFAULT '{}',
  contact_phone text NOT NULL,
  province text NOT NULL,
  city text NOT NULL,
  approximate_location text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  job_status text,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_select_public" ON ads;
CREATE POLICY "ads_select_public"
ON ads FOR SELECT
TO anon, authenticated
USING (
  (status = 'active' AND expires_at > now())
  OR seller_id = auth.uid()
);

DROP POLICY IF EXISTS "ads_insert_own" ON ads;
CREATE POLICY "ads_insert_own"
ON ads FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "ads_update_own" ON ads;
CREATE POLICY "ads_update_own"
ON ads FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "ads_delete_own" ON ads;
CREATE POLICY "ads_delete_own"
ON ads FOR DELETE
TO authenticated
USING (seller_id = auth.uid());

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ad_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own"
ON favorites FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own"
ON favorites FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own"
ON favorites FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_any" ON reports;
CREATE POLICY "reports_insert_any"
ON reports FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "reports_select_admin" ON reports;
CREATE POLICY "reports_select_admin"
ON reports FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert_any" ON feedback;
CREATE POLICY "feedback_insert_any"
ON feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_select_admin" ON feedback;
CREATE POLICY "feedback_select_admin"
ON feedback FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_ads_seller_id ON ads(seller_id);
CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category);
CREATE INDEX IF NOT EXISTS idx_ads_status_expires ON ads(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_ad ON favorites(user_id, ad_id);
