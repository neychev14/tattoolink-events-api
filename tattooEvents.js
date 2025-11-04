import fetch from 'node-fetch';
import { getDistance } from 'geolib';

function toDateSafe(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function distanceMeters(a, b) {
  try { return getDistance(a, b); } catch { return Number.MAX_SAFE_INTEGER; }
}

const WTE_ENDPOINTS = [
  'https://www.worldtattooevents.com/wp-json/wp/v2/event',
  'https://www.worldtattooevents.com/wp-json/wp/v2/events',
  'https://www.worldtattooevents.com/wp-json/wp/v2/tattoo_conventions',
  'https://www.worldtattooevents.com/wp-json/wp/v2/tattoo-conventions',
];

const FIELDS = '_fields=id,link,title,acf';

async function fetchFromAnyEndpoint(perPage=50, page=1) {
  const headers = { 'Accept': 'application/json' };
  const errors = [];
  for (const base of WTE_ENDPOINTS) {
    const url = `${base}?per_page=${perPage}&page=${page}&${FIELDS}`;
    try {
      const r = await fetch(url, { headers });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length) return data;
      } else {
        errors.push(`${url} -> ${r.status}`);
      }
    } catch (e) {
      errors.push(`${base} -> ${e.message}`);
    }
  }
  const err = new Error('No WTE endpoint responded with data');
  err.details = errors;
  throw err;
}

function normalizeItem(ev) {
  const acf = ev?.acf || {};
  const start = toDateSafe(acf.acf_event_date_start || acf.start || acf.date_start);
  const end   = toDateSafe(acf.acf_event_date_end || acf.end || acf.date_end);
  const city = acf.acf_city || acf.city || '';
  const country = acf.acf_country || acf.country || '';
  const lat = Number(acf.acf_lat || acf.lat);
  const lon = Number(acf.acf_lon || acf.lon);
  const loc = [city, country].filter(Boolean).join(', ');

  return {
    id: String(ev.id ?? ''),
    name: ev?.title?.rendered?.replace(/<[^>]*>/g, '') || 'Tattoo Event',
    link: ev?.link || '',
    startDate: start ? start.toISOString() : null,
    endDate: end ? end.toISOString() : null,
    city,
    country,
    location: loc || (acf.acf_location || acf.location || 'Location TBA'),
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
  };
}

export default async function handler(req, res) {
  try {
    const { lat, lng, per_page = '50' } = req.query || {};
    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;

    const pageEvents = await fetchFromAnyEndpoint(Number(per_page), 1);
    const items = pageEvents.map(normalizeItem);

    const now = new Date();

    const future = items.filter(it => {
      const s = it.startDate ? new Date(it.startDate) : null;
      const e = it.endDate ? new Date(it.endDate) : null;
      if (s) return s >= new Date(now.toDateString());
      if (e) return e >= new Date(now.toDateString());
      return false;
    });

    let sorted = future;
    if (userLat != null && userLng != null) {
      const user = { latitude: userLat, longitude: userLng };
      sorted = future
        .map(it => ({
          ...it,
          _distance: (it.latitude!=null && it.longitude!=null) 
            ? distanceMeters(user, { latitude: it.latitude, longitude: it.longitude })
            : Number.MAX_SAFE_INTEGER
        }))
        .sort((a,b) => a._distance - b._distance);
    } else {
      sorted = future.sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
    }

    const top5 = sorted.slice(0, 5).map(({_distance, ...rest}) => rest);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, count: top5.length, events: top5 });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message, details: err.details || null });
  }
}
