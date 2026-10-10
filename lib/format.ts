export const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

export const num = (n: number) => new Intl.NumberFormat('it-IT').format(n);

export const pct = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 }).format(n);

export const dateIt = (d: string | Date) =>
  new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

export const dateTimeIt = (d: string | Date) =>
  new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
export const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};

// "YYYY-MM-DD" di oggi in ora locale.
export const today = () => new Date().toLocaleDateString('sv-SE');

export function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).toLocaleDateString('sv-SE');
}

// Lunedì della settimana corrente.
export function weekStart() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toLocaleDateString('sv-SE');
}
