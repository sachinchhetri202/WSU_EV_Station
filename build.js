const fs = require('fs');
const path = require('path');

// Load .env for local development
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const PLACEHOLDERS = {
  SUPABASE_URL: '__SUPABASE_URL__',
  SUPABASE_ANON_KEY: '__SUPABASE_ANON_KEY__'
};
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const missing = [];
if (!supabaseUrl) missing.push('SUPABASE_URL');
if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
if (missing.length > 0) {
  console.error(`Error: Missing environment variables: ${missing.join(', ')}`);
  console.error('Set them in Netlify: Site settings > Environment variables');
  process.exit(1);
}

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build index.html with Supabase values injected
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
fs.writeFileSync(
  path.join(distDir, 'index.html'),
  indexHtml
    .replace(new RegExp(PLACEHOLDERS.SUPABASE_URL, 'g'), supabaseUrl)
    .replace(new RegExp(PLACEHOLDERS.SUPABASE_ANON_KEY, 'g'), supabaseAnonKey)
);

// Copy station.json
fs.copyFileSync(
  path.join(srcDir, 'station.json'),
  path.join(distDir, 'station.json')
);

// Copy assets (icons)
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(distDir, 'assets'), { recursive: true });
}

console.log('Build complete. Output in dist/');
