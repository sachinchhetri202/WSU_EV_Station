# EV Charger Map

Single-page web app showing EV charging stations on Leaflet with OpenStreetMap tiles. Hosted on Netlify.

## Local Development

```bash
# Copy .env.example to .env and set Supabase values

npm run build
npm start
```

Open http://localhost:3000

## Deploy to Netlify

1. Push to GitHub (or use Netlify Drop).
2. In Netlify: **Site settings → Environment variables** → add `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Connect the repo. Netlify will run `npm run build` and publish the `dist/` folder.
