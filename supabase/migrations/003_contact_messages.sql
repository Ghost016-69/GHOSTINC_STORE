-- =============================================================================
-- 003_contact_messages.sql
-- GHOSTINC_STORE — contact form
--
-- The legacy Django app stored ContactMessage rows from the contact page. The
-- React rebuild keeps that behaviour, so the form needs somewhere honest to go.
--
-- Security shape: write-only. The anon key ships in the bundle, so anyone may
-- send a message, but there is deliberately NO SELECT policy — RLS with no
-- policy denies everything, which means nobody can read the inbox with the
-- anon key. Staff read messages through the Supabase dashboard (service_role
-- bypasses RLS). Adding `FOR SELECT USING (true)` would expose every message
-- to the public; do not add one to "make the admin page easier".
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  email      TEXT NOT NULL CHECK (position('@' IN email) > 0),
  subject    TEXT,
  message    TEXT NOT NULL CHECK (length(btrim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_created ON public.contact_messages(created_at DESC);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- INSERT only. WITH CHECK (true) looks permissive and is: the whole point of
-- the table is that strangers can write to it. What matters is that no SELECT
-- policy exists.
CREATE POLICY "Public can send messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Grants
--
-- Supabase's default privileges grant broadly; narrow this table to exactly
-- what the browser does. SELECT is withheld on purpose — RLS would deny it
-- anyway, but not granting it keeps the intent visible in one place.
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.contact_messages FROM PUBLIC;
GRANT INSERT ON public.contact_messages TO anon, authenticated;
