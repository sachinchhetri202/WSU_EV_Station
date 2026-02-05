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

const PLACEHOLDER = '__MAPS_API_KEY__';
const apiKey = process.env.MAPS_API_KEY || '';

if (!apiKey) {
  console.error('Error: MAPS_API_KEY environment variable is not set.');
  console.error('Set it in Netlify: Site settings > Environment variables');
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
  indexHtml.replace(new RegExp(PLACEHOLDER, 'g'), apiKey)
);

// Copy station.json
fs.copyFileSync(
  path.join(srcDir, 'station.json'),
  path.join(distDir, 'station.json')
);

console.log('Build complete. Output in dist/');
