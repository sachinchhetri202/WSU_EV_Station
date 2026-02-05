# Supabase Setup Instructions

## 1. Create Tables

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-setup.sql`
5. Click **Run** to execute the SQL

If you already created the tables, run this migration instead:

```sql
ALTER TABLE stations
ADD COLUMN IF NOT EXISTS total_chargers INTEGER NOT NULL DEFAULT 1;

DROP POLICY IF EXISTS "Public can delete stations" ON stations;
DROP POLICY IF EXISTS "Public can delete chargers" ON chargers;

CREATE POLICY "Public can delete stations" ON stations
  FOR DELETE USING (true);

CREATE POLICY "Public can delete chargers" ON chargers
  FOR DELETE USING (true);
```

This creates:
- `stations` table (id, name, lat, lng, total_chargers, timestamps)
- `chargers` table (id, station_id, charger_index, vendor, serial_number, model_number, mac_address, images[], timestamps)
- Row Level Security (RLS) policies (public read/write for now)
- Storage policies for `charger-image` uploads
- Indexes for performance

## 2. Create Storage Bucket

1. In Supabase Dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Bucket name: `charger-image`
4. **Public bucket**: ✓ (checked)
5. Click **Create bucket**

## 3. Get Your API Keys

1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** under Project Settings
3. Copy these values (you'll add them to Netlify later):
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

## 4. Set Environment Variables in Netlify

After deploying to Netlify:

1. Go to your Netlify site dashboard
2. Click **Site settings** → **Environment variables**
3. Add these variables:
   - `MAPS_API_KEY` = your Google Maps API key
   - `SUPABASE_URL` = from step 3
   - `SUPABASE_ANON_KEY` = from step 3

4. Click **Save** and redeploy
