// src/App.jsx
import React, { useEffect, useState } from "react";
import "./App.css";
import { fetchMGNREGAThreeYears } from "./utils/fetchData";
import { getUserDistrict } from "./utils/getUserDistrict";
import { districts } from "./utils/districts"; // your alphabetic district list

function formatNumber(x, opts = {}) {
  // opts: { decimals: number, integerIfWhole: boolean }
  if (x === null || x === undefined || x === "") return "N/A";
  const n = Number(x);
  if (Number.isNaN(n)) return x;
  const decimals = typeof opts.decimals === 'number' ? opts.decimals : 2;

  // For large numbers use locale string with fixed maximumFractionDigits
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  // For smaller numbers, ensure fixed decimals when requested
  if (decimals === 0) return Math.round(n).toString();
  // If integerIfWhole and n is whole number, don't show decimals
  if (opts.integerIfWhole && Number.isInteger(n)) return n.toString();
  return n.toFixed(decimals);
}

export default function App() {
  const [district, setDistrict] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yearsData, setYearsData] = useState(null); // object with 3 years
  const [error, setError] = useState("");

  // helper: when user types, show suggestions
  function onInput(v) {
    setDistrict(v);
    if (!v) return setSuggestions([]);
    const list = districts.filter((d) =>
      d.toLowerCase().startsWith(v.toLowerCase())
    );
    setSuggestions(list);
  }

  async function handleSearch() {
    if (!district) return alert("Please enter/select a district");
    setLoading(true);
    setError("");
    try {
      const res = await fetchMGNREGAThreeYears(district);
      setYearsData(res);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Try again later.");
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
  }

  // On mount try to detect user's district via geolocation and fetch data
  useEffect(() => {
    let mounted = true;
    async function detectAndFetch() {
      try {
        const loc = await getUserDistrict();
        if (!mounted) return;
        if (loc && loc !== "Unknown") {
          setDistrict(loc);
          setLoading(true);
          try {
            const res = await fetchMGNREGAThreeYears(loc);
            if (!mounted) return;
            setYearsData(res);
          } catch (e) {
            console.error(e);
            setError("Failed to fetch data for your location.");
          } finally {
            if (mounted) setLoading(false);
          }
        }
      } catch (e) {
        // geolocation rejected/supported - keep quiet (no blocking alert)
        console.info("Geolocation unavailable or denied: ", e);
      }
    }

    detectAndFetch();
    return () => { mounted = false; };
  }, []);

  // Dynamically load mobile CSS when viewport is small to keep desktop and phone CSS separate
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    let linkEl = null;

    function applyMobile(e) {
      if (e.matches) {
        // insert mobile css
        if (!linkEl) {
          linkEl = document.createElement('link');
          linkEl.rel = 'stylesheet';
          linkEl.href = '/src/App.mobile.css';
          linkEl.id = 'app-mobile-css';
          document.head.appendChild(linkEl);
        }
      } else {
        // remove if present
        const existing = document.getElementById('app-mobile-css');
        if (existing) existing.remove();
        linkEl = null;
      }
    }

    applyMobile(mq);
    mq.addEventListener ? mq.addEventListener('change', applyMobile) : mq.addListener(applyMobile);
    return () => {
      try { mq.removeEventListener ? mq.removeEventListener('change', applyMobile) : mq.removeListener(applyMobile); } catch(e){}
      const existing = document.getElementById('app-mobile-css');
      if (existing) existing.remove();
    };
  }, []);

  // Utility: map months to order so we can sort months correctly
  const monthOrder = {
    Apr: 1, May: 2, Jun: 3, Jul: 4, Aug: 5, Sep: 6, Oct: 7, Nov: 8, Dec: 9,
    Jan: 10, Feb: 11, Mar: 12
  };

  // Build month-wise rows for 2024-2025
  function buildRows() {
    if (!yearsData) return [];
    const curr = yearsData["2024-2025"] || [];
    const prev = yearsData["2023-2024"] || [];

      // Aggregate records by month for both current and previous year so each month appears once.
      function aggregateByMonth(list) {
        const out = {}; // monthLower -> aggregated object
        for (const r of list) {
          const mRaw = (r.month || r.Month || r.month_name || r.month_name_en || "").toString();
          const m = mRaw.trim();
          const key = m.toLowerCase();

          const totalExp = Number(r.Total_Exp ?? r.total_exp ?? 0) || 0;
          const households = Number(r.Total_Households_Worked ?? r.total_households_worked ?? 0) || 0;
          // wage might be per-person rate; store sum and count to compute average later
          const wage = Number(r.Average_Wage_rate_per_day_per_person ?? r.average_wage_rate_per_day_per_person ?? 0) || 0;

          if (!out[key]) {
            out[key] = { month: m, totalExpSum: totalExp, householdsSum: households, wageSum: wage, wageCount: wage ? 1 : 0 };
          } else {
            out[key].totalExpSum += totalExp;
            out[key].householdsSum += households;
            out[key].wageSum += wage;
            out[key].wageCount += wage ? 1 : 0;
          }
        }
        return out;
      }

      const currAgg = aggregateByMonth(curr);
      const prevAgg = aggregateByMonth(prev);

      // Create rows for every month in monthOrder (Apr -> Mar), filling missing months with zeros/N/A
      const rows = Object.keys(monthOrder)
        .sort((a, b) => monthOrder[a] - monthOrder[b])
        .map((monthShort) => {
          const key = monthShort.toLowerCase();
          const a = currAgg[key];
          const p = prevAgg[key];

          const totalExpCurr = a ? a.totalExpSum : 0;
          const totalExpPrev = p ? p.totalExpSum : 0;
          const householdsCurr = a ? a.householdsSum : 0;
          const householdsPrev = p ? p.householdsSum : 0;
          const avgWageCurr = a && a.wageCount ? a.wageSum / a.wageCount : 0;
          const avgWagePrev = p && p.wageCount ? p.wageSum / p.wageCount : 0;

          return {
            month: monthShort,
            totalExpCurr,
            totalExpPrev,
            householdsCurr,
            householdsPrev,
            avgWageCurr,
            avgWagePrev
          };
        });

    return rows;
  }

  const rows = buildRows();

  return (
    <div className="container">
      <h1>Bihar MGNREGA — District Monthly (2024-25)</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter district name (e.g., Patna)"
          value={district}
          onChange={(e) => onInput(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s) => (
              <li key={s} onClick={() => { setDistrict(s); setSuggestions([]); }}>
                {s}
              </li>
            ))}
          </ul>
        )}
        <button onClick={handleSearch} disabled={loading}>Search</button>
      </div>

      {loading && <p>Loading data for {district} ...</p>}
      {error && <p className="error">{error}</p>}

      {yearsData && (
        <div className="legend">
          <div><span className="green-box"/> Positive vs last year</div>
          <div><span className="red-box"/> Negative vs last year</div>
        </div>
      )}

      {yearsData && yearsData._meta && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Data source: <strong>{yearsData._meta.overallSource || 'network'}</strong>
          {yearsData._meta.overallSource !== 'network' && (
            <span> — showing most recent cached results where network failed</span>
          )}
        </div>
      )}

      {yearsData && yearsData._meta && yearsData._meta.perYear && (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          {Object.keys(yearsData._meta.perYear).map((y) => {
            const p = yearsData._meta.perYear[y];
            return (
              <div key={y} style={{ color: '#444' }}>
                {y}: {p.source}{p.fetchedAt ? ` (updated: ${new Date(p.fetchedAt).toLocaleString()})` : ''}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="table-header">Month</th>
                <th className="table-header">Total Exp (₹) — 2024-25</th>
                <th className="table-header">Change vs 2023-24</th>
                <th className="table-header">Households Worked — 2024-25</th>
                <th className="table-header">Change vs 2023-24</th>
                <th className="table-header">Avg Wage/Day — 2024-25</th>
                <th className="table-header">Change vs 2023-24</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expDiff = r.totalExpCurr - r.totalExpPrev;
                const householdsDiff = r.householdsCurr - r.householdsPrev;
                const wageDiff = r.avgWageCurr - r.avgWagePrev;

                return (
                  <tr key={r.month}>
                    <td>{r.month || "—"}</td>

                    {/* Total Exp: show 2 decimals and commas */}
                    <td>{formatNumber(r.totalExpCurr, { decimals: 2 })}</td>
                    <td className={expDiff < 0 ? "neg" : "pos"}>
                      {expDiff === 0
                        ? "0.00"
                        : `${expDiff < 0 ? "" : "+"}${formatNumber(expDiff, { decimals: 2 })}`}
                    </td>

                    {/* Households: show as integer with commas */}
                    <td>{formatNumber(r.householdsCurr, { decimals: 0 })}</td>
                    <td className={householdsDiff < 0 ? "neg" : "pos"}>
                      {householdsDiff === 0
                        ? "0"
                        : `${householdsDiff < 0 ? "" : "+"}${formatNumber(householdsDiff, { decimals: 0 })}`}
                    </td>

                    {/* Avg wage: two decimals */}
                    <td>{formatNumber(r.avgWageCurr, { decimals: 2, integerIfWhole: false })}</td>
                    <td className={wageDiff < 0 ? "neg" : "pos"}>
                      {wageDiff === 0
                        ? "0.00"
                        : `${wageDiff < 0 ? "" : "+"}${formatNumber(wageDiff, { decimals: 2 })}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="note">Displayed: 2024-2025 months. Change column compares same month in 2023-2024.</p>
        </div>
      ) : (
        // Only show 'no data' when a district has been set (user or auto-detected)
        (!loading && district) ? (
          <p style={{ textAlign: "center" }}>No 2024-25 data found for "{district}".</p>
        ) : null
      )}
    </div>
  );
}
