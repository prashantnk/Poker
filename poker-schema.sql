-- Run this manually on the SQL editor on the supabase client 


-- 1. Reset (Just in case)
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS rooms;

-- 2. Create the ROOMS table
CREATE TABLE rooms (
  id text PRIMARY KEY,
  stage text DEFAULT 'waiting', -- waiting, preflop, flop, turn, river
  community_cards jsonb,
  deck jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3. Create the PLAYERS table
CREATE TABLE players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text REFERENCES rooms(id) ON DELETE CASCADE,
  name text,
  hand jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Enable Realtime (Crucial for the game to work!)
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- 5. Open Access (So you don't need login/auth to play)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Players" ON players FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE players ADD COLUMN status text DEFAULT 'active';
ALTER TABLE players ADD COLUMN is_revealed boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN shuffle_factor int DEFAULT 100;

/*
Create Storage Bucket:

Go to Supabase Dashboard -> Storage.

Click "New Bucket".

Name it qrcodes.

Make it Public (so players can see the image).

Save.

*/
ALTER TABLE rooms ADD COLUMN qr_url text;


