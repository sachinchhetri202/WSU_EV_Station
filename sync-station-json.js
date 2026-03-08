const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

function normalizeStation(station, index) {
  const name = typeof station?.name === 'string' ? station.name.trim() : '';
  const lat = Number(station?.lat);
  const lng = Number(station?.lng);
  const totalRaw = Number.parseInt(station?.total_chargers, 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Invalid lat/lng at row ${index + 1}`);
  }

  return {
    name: name || 'Unnamed station',
    lat,
    lng,
    totalChargers: Number.isNaN(totalRaw) || totalRaw < 1 ? 1 : totalRaw
  };
}

function dedupeByLocation(stations) {
  const map = new Map();
  for (const station of stations) {
    const key = `${station.lat.toFixed(6)}::${station.lng.toFixed(6)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, station);
      continue;
    }
    const existingScore = (existing.name !== 'Unnamed station' ? 1 : 0) + existing.totalChargers;
    const nextScore = (station.name !== 'Unnamed station' ? 1 : 0) + station.totalChargers;
    if (nextScore > existingScore) {
      map.set(key, station);
    }
  }
  return Array.from(map.values());
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function fetchStationsFromSupabase(supabaseUrl, supabaseAnonKey) {
  const base = supabaseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/rest/v1/stations?select=name,lat,lng,total_chargers&order=name.asc,lat.asc,lng.asc`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Unexpected Supabase response. Expected an array.');
  }
  return payload;
}

async function syncStationJson() {
  loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set these in .env or environment variables.');
  }

  const sourceRows = await fetchStationsFromSupabase(supabaseUrl, supabaseAnonKey);
  const normalized = sourceRows.map(normalizeStation);
  const deduped = dedupeByLocation(normalized);
  deduped.sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    const byLat = a.lat - b.lat;
    if (byLat !== 0) return byLat;
    return a.lng - b.lng;
  });

  const nextJson = `${JSON.stringify(deduped, null, 2)}\n`;
  JSON.parse(nextJson);

  const stationPath = path.join(__dirname, 'src', 'station.json');
  const tempPath = `${stationPath}.tmp`;
  const backupPath = `${stationPath}.bak.${formatTimestamp(new Date())}`;
  const hadOriginal = fs.existsSync(stationPath);

  try {
    if (hadOriginal) {
      fs.copyFileSync(stationPath, backupPath);
    }
    fs.writeFileSync(tempPath, nextJson, 'utf8');
    fs.copyFileSync(tempPath, stationPath);
    fs.unlinkSync(tempPath);
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (hadOriginal && fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, stationPath);
    }
    throw error;
  }

  console.log(`Updated src/station.json with ${deduped.length} station(s).`);
  if (hadOriginal) {
    console.log(`Backup created: ${path.basename(backupPath)}`);
  }
}

syncStationJson().catch((error) => {
  console.error(`Failed to sync station.json: ${error.message}`);
  process.exit(1);
});
