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

-- Ensure total_chargers exists for older installs
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS total_chargers INTEGER NOT NULL DEFAULT 1;

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

-- Normalize station locations to 6 decimals for dedupe + uniqueness
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS lat_6 NUMERIC GENERATED ALWAYS AS (round(lat::numeric, 6)) STORED;

ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS lng_6 NUMERIC GENERATED ALWAYS AS (round(lng::numeric, 6)) STORED;

-- Merge duplicate stations by location (keeps the oldest station)
WITH ranked AS (
  SELECT
    id,
    lat_6,
    lng_6,
    created_at,
    FIRST_VALUE(id) OVER (
      PARTITION BY lat_6, lng_6
      ORDER BY created_at ASC
    ) AS keep_id
  FROM stations
),
dupes AS (
  SELECT id, keep_id
  FROM ranked
  WHERE id <> keep_id
),
charger_rows AS (
  SELECT
    c.charger_index,
    c.vendor,
    c.serial_number,
    c.model_number,
    c.mac_address,
    c.images,
    c.created_at,
    c.updated_at,
    d.keep_id AS station_id
  FROM chargers c
  JOIN dupes d ON c.station_id = d.id
)
INSERT INTO chargers (
  station_id,
  charger_index,
  vendor,
  serial_number,
  model_number,
  mac_address,
  images,
  created_at,
  updated_at
)
SELECT
  station_id,
  charger_index,
  vendor,
  serial_number,
  model_number,
  mac_address,
  images,
  created_at,
  updated_at
FROM charger_rows
ON CONFLICT (station_id, charger_index) DO UPDATE SET
  vendor = COALESCE(EXCLUDED.vendor, chargers.vendor),
  serial_number = COALESCE(EXCLUDED.serial_number, chargers.serial_number),
  model_number = COALESCE(EXCLUDED.model_number, chargers.model_number),
  mac_address = COALESCE(EXCLUDED.mac_address, chargers.mac_address),
  images = CASE
    WHEN COALESCE(array_length(EXCLUDED.images, 1), 0) > 0 THEN EXCLUDED.images
    ELSE chargers.images
  END,
  updated_at = NOW();

-- Delete duplicate stations (charger rows will cascade)
WITH ranked AS (
  SELECT
    id,
    lat_6,
    lng_6,
    ROW_NUMBER() OVER (
      PARTITION BY lat_6, lng_6
      ORDER BY created_at ASC
    ) AS rn
  FROM stations
)
DELETE FROM stations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Enforce uniqueness for station locations
CREATE UNIQUE INDEX IF NOT EXISTS unique_station_location
  ON stations(lat_6, lng_6);

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
