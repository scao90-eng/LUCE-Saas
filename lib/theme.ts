// Colori dell'app personalizzabili per operatore: da due colori (brand + barra laterale)
// si ricavano tutte le sfumature usate dal design system.

export const DEFAULT_BRAND = '#B8643F';
export const DEFAULT_SIDEBAR = '#2F3A2F';

export const PRESETS: { id: string; label: string; brand: string; sidebar: string }[] = [
  { id: 'terra', label: 'Salvia e terracotta', brand: '#B8643F', sidebar: '#2F3A2F' },
  { id: 'lavanda', label: 'Lavanda', brand: '#7A5BA6', sidebar: '#2E2840' },
  { id: 'oceano', label: 'Oceano', brand: '#2F7F8A', sidebar: '#1F3238' },
  { id: 'rosa', label: 'Rosa antico', brand: '#B5677A', sidebar: '#3B2A2F' },
  { id: 'oro', label: 'Notte e oro', brand: '#B08A3E', sidebar: '#22252B' },
  { id: 'luce', label: 'Luce chiara', brand: '#C77B4A', sidebar: '#EFE6DA' },
];

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a), y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};
// Luminanza relativa (WCAG) per decidere testo chiaro o scuro.
const lum = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function themeVars(brandIn?: string | null, sidebarIn?: string | null) {
  const brand = isHex(brandIn) ? brandIn : DEFAULT_BRAND;
  const side = isHex(sidebarIn) ? sidebarIn : DEFAULT_SIDEBAR;
  const lightSide = lum(side) > 0.4;
  const toward = lightSide ? '#000000' : '#FFFFFF';
  return {
    '--accent': brand,
    '--accent-h': mix(brand, '#000000', 0.15),
    '--accent-soft': mix(brand, '#FFFFFF', 0.86),
    '--accent-ink': lum(brand) > 0.45 ? '#2B2620' : '#FFFFFF',
    '--side': side,
    '--side-2': mix(side, toward, 0.08),
    '--side-line': mix(side, toward, 0.15),
    '--side-ink': mix(side, toward, 0.8),
    '--side-ink-2': mix(side, toward, 0.5),
    '--side-strong': lightSide ? '#1F1B16' : '#FFFFFF',
    // Link nella barra: colore brand leggibile sia su sfondo scuro sia chiaro.
    '--side-link': lightSide ? mix(brand, '#000000', 0.25) : mix(brand, '#FFFFFF', 0.45),
  } as Record<string, string>;
}

export const themeCss = (brand?: string | null, sidebar?: string | null) =>
  ':root{' + Object.entries(themeVars(brand, sidebar)).map(([k, v]) => `${k}:${v}`).join(';') + '}';
