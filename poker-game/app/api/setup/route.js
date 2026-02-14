import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    
    // The "Magic" SQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id text PRIMARY KEY,
        stage text DEFAULT 'waiting',
        community_cards jsonb,
        deck jsonb,
        created_at timestamptz DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS players (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        room_id text REFERENCES rooms(id),
        name text,
        hand jsonb,
        created_at timestamptz DEFAULT now()
      );

      ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
      ALTER PUBLICATION supabase_realtime ADD TABLE players;
      
      ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Public rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
      
      ALTER TABLE players ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Public players" ON players FOR ALL USING (true) WITH CHECK (true);
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await client.end();
  }
}