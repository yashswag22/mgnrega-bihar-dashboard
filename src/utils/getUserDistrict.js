import { districts } from "./districts";

function findBestDistrictFromText(text) {
  if (!text) return null;
  let t = text.toString().toLowerCase();
  // Normalize common suffixes like ' district'
  t = t.replace(/\s+district\b/g, "");
  t = t.replace(/\s+district of\b/g, "");
  // exact or startsWith
  for (const d of districts) {
    const dl = d.toLowerCase();
    if (t === dl || t.startsWith(dl) || dl.startsWith(t)) return d;
  }
  // contains
  for (const d of districts) {
    if (t.includes(d.toLowerCase())) return d;
  }
  return null;
}

export async function getUserDistrict() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocation not supported");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await res.json();

        // Try district-level fields first. Use administrative array if present.
        const candidates = [];
        // collect administrative entries, but prefer those that look like districts (adminLevel 5 or name contains 'district')
        if (data.localityInfo && Array.isArray(data.localityInfo.administrative)) {
          // first, look for district-level admin entries
          for (const adm of data.localityInfo.administrative) {
            if (adm && adm.name) {
              // prefer admin level 5 entries
              if (adm.adminLevel === 5 || /district/i.test(adm.name) || adm.order >= 8) {
                const cleaned = adm.name.replace(/\s+district\b/i, "").trim();
                candidates.unshift(cleaned || adm.name);
              } else {
                candidates.push(adm.name);
              }
            }
          }
        }

        // add locality/city/principalSubdivision afterwards
        if (data.locality) candidates.push(data.locality);
        if (data.city) candidates.push(data.city);
        if (data.principalSubdivision) candidates.push(data.principalSubdivision);

        // manual mapping for known variants
        const manualMap = {
          'luckeesarai': 'Lakhisarai',
          'luckeesarai': 'Lakhisarai',
          'lakhisarai': 'Lakhisarai'
        };

        for (const c of candidates) {
          if (!c) continue;
          const lc = c.toString().toLowerCase().trim();
          if (manualMap[lc]) return resolve(manualMap[lc]);
          const match = findBestDistrictFromText(c);
          if (match) return resolve(match);
        }

        // fallback: try full response string
        const asString = JSON.stringify(data);
        const match = findBestDistrictFromText(asString);
        if (match) return resolve(match);

        // else return Unknown
        resolve("Unknown");
      } catch (err) {
        console.error(err);
        reject("Location lookup failed");
      }
    }, (err) => {
      reject(err);
    });
  });
}
