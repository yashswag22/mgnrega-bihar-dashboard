import React, { useState } from "react";
import { biharDistricts } from "../utils/districts";

export default function DistrictSelector({ onSelect }) {
  const [input, setInput] = useState("");

  const filtered = biharDistricts.filter(d =>
    d.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="selector">
      <input
        type="text"
        placeholder="Enter or select your district"
        value={input}
        onChange={e => setInput(e.target.value)}
        list="districts"
      />
      <datalist id="districts">
        {filtered.map(d => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <button onClick={() => onSelect(input)}>Search</button>
    </div>
  );
}
