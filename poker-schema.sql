-- ============================================================
-- 1. DATABASE SCHEMA (Idempotent Creation)
-- ============================================================

-- Create ROOMS table if it doesn't exist
CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  stage text DEFAULT 'waiting',
  community_cards jsonb,
  deck jsonb,
  shuffle_factor int DEFAULT 100,
  qr_url text,
  created_at timestamptz DEFAULT now()
);

-- Create PLAYERS table if it doesn't exist
CREATE TABLE IF NOT EXISTS players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text REFERENCES rooms(id) ON DELETE CASCADE,
  name text,
  hand jsonb,
  status text DEFAULT 'active',
  is_revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- (Safety Net) Ensure columns exist if table was created previously without them
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS shuffle_factor int DEFAULT 100;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS qr_url text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_revealed boolean DEFAULT false;


-- ============================================================
-- 2. REALTIME SUBSCRIPTION
-- ============================================================

-- We wrap this in a block to catch "already exists" errors gracefully
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  EXCEPTION WHEN duplicate_object THEN NULL; -- Ignore if already added
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  EXCEPTION WHEN duplicate_object THEN NULL; -- Ignore if already added
  END;
END $$;


-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS) - TABLES
-- ============================================================

-- Rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Rooms" ON rooms; -- Drop old to avoid duplicates
CREATE POLICY "Public Access Rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- Players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Players" ON players; -- Drop old to avoid duplicates
CREATE POLICY "Public Access Players" ON players FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 4. STORAGE SETUP (Idempotent)
-- ============================================================

-- Create 'qrcodes' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qrcodes', 'qrcodes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Drop & Recreate to ensure correctness)
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'qrcodes' );

DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
CREATE POLICY "Allow public viewing"
ON storage.objects
FOR SELECT
USING ( bucket_id = 'qrcodes' );

-- Add a column to store the calculated winners
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS winners jsonb DEFAULT '[]'::jsonb;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS dealer_index integer DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS round_count integer DEFAULT 1;

/*

If want to clean up data from the tables: 


DROP table players;
DROP table rooms;

*/
