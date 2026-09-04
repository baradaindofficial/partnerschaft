-- ============================================================
-- PARTNERSCHAFT INDIA PORTAL — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_type   TEXT        NOT NULL CHECK (user_type IN ('vendor','client','admin')),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  mobile      TEXT,
  company     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id           UUID    REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  domain       TEXT[]  NOT NULL DEFAULT '{}',
  coverage     TEXT,
  experience   TEXT,
  capabilities TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','under_review','approved','rejected','inactive')),
  approved_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id       UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  role     TEXT,
  industry TEXT,
  status   TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REQUIREMENTS
CREATE TABLE IF NOT EXISTS requirements (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID        REFERENCES clients(id) ON DELETE CASCADE,
  services          TEXT[]      NOT NULL DEFAULT '{}',
  locations         TEXT        NOT NULL,
  budget            TEXT,
  timeline          TEXT,
  description       TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'submitted'
                                CHECK (status IN (
                                  'submitted','under_review','vendor_identified',
                                  'proposal_sent','in_progress','completed','cancelled'
                                )),
  assigned_vendor   UUID        REFERENCES vendors(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ROW LEVEL SECURITY
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Vendors: users can read/update their own
CREATE POLICY "vendors_own" ON vendors
  FOR ALL USING (auth.uid() = id);

-- Clients: users can read/update their own
CREATE POLICY "clients_own" ON clients
  FOR ALL USING (auth.uid() = id);

-- Requirements: clients can CRUD their own
CREATE POLICY "clients_own_reqs" ON requirements
  FOR ALL USING (auth.uid() = client_id);

-- ADMIN POLICIES (replace with your actual admin user ID after first login)
-- Run this AFTER you create your admin account and get your user ID from auth.users:
-- CREATE POLICY "admin_all_profiles"     ON profiles     FOR ALL USING (auth.uid() = 'YOUR-ADMIN-UUID');
-- CREATE POLICY "admin_all_vendors"      ON vendors      FOR ALL USING (auth.uid() = 'YOUR-ADMIN-UUID');
-- CREATE POLICY "admin_all_clients"      ON clients      FOR ALL USING (auth.uid() = 'YOUR-ADMIN-UUID');
-- CREATE POLICY "admin_all_requirements" ON requirements FOR ALL USING (auth.uid() = 'YOUR-ADMIN-UUID');

-- 6. AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at     BEFORE UPDATE ON profiles     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER requirements_updated_at BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Enable Email Auth in Supabase Dashboard:
-- Authentication → Providers → Email → Enable
-- Authentication → Email Templates → customize if desired

SELECT 'Setup complete. All tables and policies created.' AS status;
