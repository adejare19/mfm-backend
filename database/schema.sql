-- =====================================================
-- MFM IFESOWAPO — SUPABASE DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- TABLE: admins
-- Stores admin login credentials (hashed)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: sermons
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sermons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  preacher     TEXT,
  sermon_date  DATE NOT NULL,
  series       TEXT,
  files        JSONB DEFAULT '[]'::JSONB,  -- [{name, url, type}]
  uploaded_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: events
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  event_date   DATE NOT NULL,
  time         TEXT,
  location     TEXT,
  flyer_url    TEXT,
  uploaded_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: resources
-- Prayer booklets, activity materials, etc.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT DEFAULT 'general', -- 'booklet', 'activity', 'general'
  files        JSONB DEFAULT '[]'::JSONB,
  uploaded_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: contact_messages
-- Stores all contact form submissions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Public can read sermons, events, resources
-- Only service role (backend) can write
-- ─────────────────────────────────────────────
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can read sermons"    ON sermons    FOR SELECT USING (true);
CREATE POLICY "Public can read events"     ON events     FOR SELECT USING (true);
CREATE POLICY "Public can read resources"  ON resources  FOR SELECT USING (true);

-- Service role (our backend) can do everything — this is handled by the service_role_key
-- No additional policies needed for write operations from backend

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sermons_date    ON sermons(sermon_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_date     ON events(event_date ASC);
CREATE INDEX IF NOT EXISTS idx_resources_cat   ON resources(category);
CREATE INDEX IF NOT EXISTS idx_admins_email    ON admins(email);
