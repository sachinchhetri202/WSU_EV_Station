const fs = require('fs');
const path = require('path');

// Load .env for local development
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const PLACEHOLDERS = {
  MAPS_API_KEY: '__MAPS_API_KEY__',
  SUPABASE_URL: '__SUPABASE_URL__',
  SUPABASE_ANON_KEY: '__SUPABASE_ANON_KEY__'
};
const apiKey = process.env.MAPS_API_KEY || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const missing = [];
if (!apiKey) missing.push('MAPS_API_KEY');
if (!supabaseUrl) missing.push('SUPABASE_URL');
if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
if (missing.length > 0) {
  console.error(`Error: Missing environment variables: ${missing.join(', ')}`);
  console.error('Set them in Netlify: Site settings > Environment variables');
  process.exit(1);
}

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build index.html with API key injected
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
fs.writeFileSync(
  path.join(distDir, 'index.html'),
  indexHtml
    .replace(new RegExp(PLACEHOLDERS.MAPS_API_KEY, 'g'), apiKey)
    .replace(new RegExp(PLACEHOLDERS.SUPABASE_URL, 'g'), supabaseUrl)
    .replace(new RegExp(PLACEHOLDERS.SUPABASE_ANON_KEY, 'g'), supabaseAnonKey)
);

// Copy station.json
fs.copyFileSync(
  path.join(srcDir, 'station.json'),
  path.join(distDir, 'station.json')
);

console.log('Build complete. Output in dist/');
