# Quick Start Guide

## Step-by-Step Setup

### 1. Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a project
2. In Supabase Dashboard, go to **SQL Editor**
3. Click **New Query** and paste contents of `supabase-setup.sql`
4. Click **Run** to create tables
5. Go to **Storage** → **New bucket** → name it `charger-images`, make it **Public**
6. Go to **Settings** → **API** and copy:
   - Project URL
   - anon public key
   - service_role key (keep secret!)

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your keys:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_KEY=eyJhbGc... (secret!)
   ADMIN_PASSWORD=choose_a_strong_password
   ```

### 3. Install and Migrate Data

```bash
# Install dependencies
npm install

# Migrate existing station data to Supabase (one-time)
node migrate-data.js
```

This will:
- Create stations in Supabase from `src/station.json`
- Create placeholder chargers (you'll add details via admin panel)

### 4. Test Locally

```bash
npm run build
npm start
```

Open http://localhost:3000

- Map should show all stations
- Click "Admin" button → enter your password
- Try adding charger details and uploading photos

### 5. Deploy to Netlify

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Add admin panel and Supabase integration"
   git push
   ```

2. In Netlify Dashboard:
   - Connect your GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add environment variables (same as `.env` but without `SUPABASE_SERVICE_KEY`)

3. Go to **Site settings** → **Environment variables** → Add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `ADMIN_PASSWORD`

4. Deploy!

### 6. Secure Your API Keys

**Supabase:**
- Already secured with Row Level Security (RLS)
- Public can only read, admin functions use service key for writes

## Next Steps

1. Share the admin password with your team
2. Start adding charger details:
   - Click station → "Chargers" button
   - Edit each charger to add vendor, serial, model, MAC
   - Upload photos of each charger
3. Public users can view all data without login
