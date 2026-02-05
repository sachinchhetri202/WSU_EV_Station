-- EV Charger Map - Supabase Tables Setup
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query

-- Drop existing policies/triggers to make this script re-runnable
DROP POLICY IF EXISTS "Public can read stations" ON stations;
DROP POLICY IF EXISTS "Public can insert stations" ON stations;
DROP POLICY IF EXISTS "Public can update stations" ON stations;
DROP POLICY IF EXISTS "Public can delete stations" ON stations;
DROP POLICY IF EXISTS "Public can read chargers" ON chargers;
DROP POLICY IF EXISTS "Public can insert chargers" ON chargers;
DROP POLICY IF EXISTS "Public can update chargers" ON chargers;
DROP POLICY IF EXISTS "Public can delete chargers" ON chargers;
DROP POLICY IF EXISTS "Public can view charger images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload charger images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage stations" ON stations;
DROP POLICY IF EXISTS "Service role can manage chargers" ON chargers;

DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
DROP TRIGGER IF EXISTS update_chargers_updated_at ON chargers;

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  total_chargers INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chargers table
CREATE TABLE IF NOT EXISTS chargers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  charger_index INTEGER NOT NULL,
  vendor TEXT,
  serial_number TEXT,
  model_number TEXT,
  mac_address TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, charger_index)
);

-- Enable Row Level Security
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargers ENABLE ROW LEVEL SECURITY;

-- Public read access for stations
CREATE POLICY "Public can read stations" ON stations
  FOR SELECT USING (true);

-- Public write access for stations
CREATE POLICY "Public can insert stations" ON stations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update stations" ON stations
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete stations" ON stations
  FOR DELETE USING (true);

-- Public read access for chargers
CREATE POLICY "Public can read chargers" ON chargers
  FOR SELECT USING (true);

-- Public write access for chargers
CREATE POLICY "Public can insert chargers" ON chargers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update chargers" ON chargers
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete chargers" ON chargers
  FOR DELETE USING (true);

-- Public access to charger images (storage)
CREATE POLICY "Public can view charger images" ON storage.objects
  FOR SELECT USING (bucket_id = 'charger-image');

CREATE POLICY "Public can upload charger images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'charger-image');

-- Service role can do anything (optional)
CREATE POLICY "Service role can manage stations" ON stations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage chargers" ON chargers
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chargers_updated_at BEFORE UPDATE ON chargers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chargers_station_id ON chargers(station_id);
CREATE INDEX IF NOT EXISTS idx_stations_location ON stations(lat, lng);
