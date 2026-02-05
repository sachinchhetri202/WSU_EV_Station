# EV Charger Map

Single-page web app showing EV charging stations on a Google Map. Hosted on Netlify.

## Local Development

```bash
# Option 1: Copy .env.example to .env and add your key
# Option 2: Set env var (PowerShell) - $env:MAPS_API_KEY = "your_key"

npm run build
npm start
```

Open http://localhost:3000

## Deploy to Netlify

1. Push to GitHub (or use Netlify Drop).
2. In Netlify: **Site settings → Environment variables** → Add `MAPS_API_KEY` with your Google Maps API key.
3. Connect the repo. Netlify will run `npm run build` and publish the `dist/` folder.

## Secure Your API Key (Google Cloud Console)

Restrict the key so it only works on your domain:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Edit your Maps API key → **Application restrictions** → HTTP referrers
3. Add:
   - `https://your-site.netlify.app/*`
   - `https://*.netlify.app/*` (for preview deploys)
