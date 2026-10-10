'use client';

import { useState } from 'react';
import { PRESETS, themeVars } from '@/lib/theme';

// Scelta colori con anteprima immediata: i colori cambiano subito nell'app,
// e vengono salvati premendo "Salva colori".
export default function ThemePicker({ brand, sidebar }: { brand: string; sidebar: string }) {
  const [b, setB] = useState(brand);
  const [s, setS] = useState(sidebar);

  function preview(nb: string, ns: string) {
    setB(nb); setS(ns);
    for (const [k, val] of Object.entries(themeVars(nb, ns))) document.documentElement.style.setProperty(k, val);
  }

  return (
    <div>
      <div className="swatches" role="radiogroup" aria-label="Combinazioni pronte">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.brand === b && p.sidebar === s}
            className={`swatch${p.brand === b && p.sidebar === s ? ' on' : ''}`} onClick={() => preview(p.brand, p.sidebar)}>
            <i style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.brand} 50%)` }} />{p.label}
          </button>
        ))}
      </div>
      <div className="form-grid" style={{ marginTop: 6 }}>
        <div><label className="fld" htmlFor="brand_color">Colore principale (pulsanti, slide)</label>
          <input className="fin" type="color" id="brand_color" name="brand_color" value={b} onChange={(e) => preview(e.target.value, s)} /></div>
        <div><label className="fld" htmlFor="sidebar_color">Colore barra laterale</label>
          <input className="fin" type="color" id="sidebar_color" name="sidebar_color" value={s} onChange={(e) => preview(b, e.target.value)} /></div>
      </div>
    </div>
  );
}
