// src/utils/fetchData.js
const API_KEY = "579b464db66ec23bdd0000018c637cc2a5fe4a6b7101e8248f082e33";
const RESOURCE_ID = "ee03643a-ee4c-48c2-ac30-9f2ff26ab722";
const BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

function cacheKeyDistrict(district, year) {
  return `mgnrega_cache_${district.toString().toLowerCase()}_${year}`;
}

function cacheKeyYear(year) {
  return `mgnrega_cache_year_${year}`;
}

function saveDistrictCache(district, year, records) {
  try {
    const payload = { records, fetchedAt: new Date().toISOString() };
    localStorage.setItem(cacheKeyDistrict(district, year), JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save district cache', e);
  }
}

function loadDistrictCache(district, year) {
  try {
    const raw = localStorage.getItem(cacheKeyDistrict(district, year));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveYearCache(year, records) {
  try {
    const payload = { records, fetchedAt: new Date().toISOString() };
    localStorage.setItem(cacheKeyYear(year), JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save year cache', e);
  }
}

function loadYearCache(year) {
  try {
    const raw = localStorage.getItem(cacheKeyYear(year));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function fetchYearNetwork(year) {
  // data.gov.in expects filters[state_name]=BIHAR and filters[fin_year]=YEAR
  const url = `${BASE}?api-key=${API_KEY}&format=json&limit=1000&filters[state_name]=BIHAR&filters[fin_year]=${encodeURIComponent(year)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error for ${year}: ${res.status}`);
  const json = await res.json();
  return json.records || [];
}

/**
 * Fetch data for three years and return an object:
 * { "2022-2023": [...records], "2023-2024": [...], "2024-2025": [...] }
 * It will try network first, then per-year cache, and if network is down it will return cached data where available.
 * The returned object will also have a `_meta` property describing source info per year.
 */
export async function fetchMGNREGAThreeYears(districtName) {
  if (!districtName) throw new Error("districtName required");

  const years = ["2022-2023", "2023-2024", "2024-2025"];
  const out = {};
  out._meta = { perYear: {}, overallSource: 'network' };

  // Try fetching each year from network; on failure fall back to cache for that year
  const promises = years.map(async (y) => {
    try {
      const records = await fetchYearNetwork(y);
      // save full year cache
      try { saveYearCache(y, records); } catch (_) {}
      // filter to district
      const filtered = records.filter((rec) => rec.district_name && rec.district_name.toString().toLowerCase() === districtName.toString().toLowerCase());
      // also save per-district filtered cache for quicker lookup later
      try { saveDistrictCache(districtName, y, filtered); } catch (_) {}
      out._meta.perYear[y] = { source: 'network', fetchedAt: new Date().toISOString() };
      return { year: y, records: filtered };
    } catch (err) {
      console.warn(`Network fetch failed for ${y}:`, err);
      // try per-district cache first
      const cachedDistrict = loadDistrictCache(districtName, y);
      if (cachedDistrict && Array.isArray(cachedDistrict.records)) {
        out._meta.perYear[y] = { source: 'cache-district', fetchedAt: cachedDistrict.fetchedAt };
        out._meta.overallSource = out._meta.overallSource === 'network' ? 'partial-cache' : 'cache';
        return { year: y, records: cachedDistrict.records };
      }

      // try full-year cache and filter for the district
      const cachedYear = loadYearCache(y);
      if (cachedYear && Array.isArray(cachedYear.records)) {
        const filtered = cachedYear.records.filter((rec) => rec.district_name && rec.district_name.toString().toLowerCase() === districtName.toString().toLowerCase());
        out._meta.perYear[y] = { source: 'cache-year', fetchedAt: cachedYear.fetchedAt };
        out._meta.overallSource = out._meta.overallSource === 'network' ? 'partial-cache' : 'cache';
        return { year: y, records: filtered };
      }

      // no cache for this year
      out._meta.perYear[y] = { source: 'none' };
      out._meta.overallSource = out._meta.overallSource === 'network' ? 'partial-cache' : out._meta.overallSource;
      return { year: y, records: [] };
    }
  });

  const results = await Promise.all(promises);

  // Attach year arrays to out
  for (const r of results) {
    out[r.year] = r.records || [];
  }

  // If network was entirely down (no year had network), try to find the most recent cached snapshot for the district and use it
  const anyNetwork = Object.values(out._meta.perYear).some(p => p && p.source === 'network');
  const anyCache = Object.values(out._meta.perYear).some(p => p && p.source === 'cache');
  if (!anyNetwork && anyCache) {
    // use per-year cached data already attached
    out._meta.overallSource = 'cache';
    return out;
  }

  // Otherwise return whatever we have (mix of network and cache)
  return out;
}
