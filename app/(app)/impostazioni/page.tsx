import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import ThemePicker from '@/components/ThemePicker';
import SubmitButton from '@/components/SubmitButton';
import { requireSession } from '@/lib/session';
import { DESIGNS } from '@/lib/carousel';
import { DEFAULT_BRAND, DEFAULT_SIDEBAR } from '@/lib/theme';
import { saveProfile, saveAppearance, uploadLogo, removeLogo } from './actions';
import { DISCIPLINES } from '@/lib/disciplines';


export default async function Impostazioni({ searchParams }: { searchParams: { ok?: string; error?: string; benvenuto?: string } }) {
  const { profile } = await requireSession();
  return (
    <>
      <PageHeader title="Profilo attività" sub="Chi sei, a chi parli e come ti presenti: guida l'app, i consigli e i contenuti" />
      <div className="wrap" style={{ maxWidth: 860, marginLeft: 0 }}>
        {searchParams.benvenuto && <div className="banner info">Benvenuta, benvenuto in Luce! Inizia raccontandoci la tua attività.</div>}
        <Flash searchParams={searchParams} />

        <div className="sec-label">La tua attività</div>
        <form action={saveProfile} className="card pad">
          <div className="form-grid">
            <div><label className="fld" htmlFor="full_name">Nome e cognome</label><input className="fin" id="full_name" name="full_name" defaultValue={profile.full_name ?? ''} /></div>
            <div><label className="fld" htmlFor="business_name">Nome dell&apos;attività</label><input className="fin" id="business_name" name="business_name" defaultValue={profile.business_name ?? ''} /></div>
            <div><label className="fld" htmlFor="discipline">Disciplina</label>
              <input className="fin" id="discipline" name="discipline" list="disc" defaultValue={profile.discipline ?? ''} placeholder="Scegli dall'elenco o scrivi" />
              <datalist id="disc">{DISCIPLINES.map((d) => <option key={d} value={d} />)}</datalist></div>
            <div><label className="fld" htmlFor="city">Città / zona</label><input className="fin" id="city" name="city" defaultValue={profile.city ?? ''} /></div>
            <div><label className="fld" htmlFor="instagram_handle">Profilo Instagram</label><input className="fin" id="instagram_handle" name="instagram_handle" defaultValue={profile.instagram_handle ?? ''} placeholder="@nomeprofilo" /></div>
            <div className="form-full"><label className="fld" htmlFor="target">A chi ti rivolgi</label><textarea className="fin" id="target" name="target" rows={2} defaultValue={profile.target ?? ''} placeholder="es. donne 30-50 anni, stressate dal lavoro, che cercano un momento per sé" /></div>
            <div className="form-full"><label className="fld" htmlFor="tone">Tono di voce</label><textarea className="fin" id="tone" name="tone" rows={2} defaultValue={profile.tone ?? ''} placeholder="es. caldo e accogliente, diretto, con un pizzico di ironia; uso del tu" /></div>
          </div>
          <div className="form-actions"><button className="btn pri" type="submit">Salva profilo</button></div>
        </form>

        <div className="sec-label" id="logo">Logo</div>
        <div className="card pad">
          <div className="logo-row">
            <div className="logo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {profile.logo_url ? <img src={profile.logo_url} alt="Logo attuale" /> : 'Nessun logo'}
            </div>
            <form action={uploadLogo} style={{ flex: 1, minWidth: 240 }}>
              <label className="fld" htmlFor="logo">Carica il logo (PNG, JPG o WebP, max 2 MB)</label>
              <input className="fin" type="file" id="logo" name="logo" accept="image/png,image/jpeg,image/webp" required />
              <p className="muted small" style={{ marginTop: 6 }}>Meglio quadrato e con sfondo trasparente (PNG). Compare nella barra laterale e sui caroselli.</p>
              <div className="form-actions"><SubmitButton pendingText="Caricamento…">Carica logo</SubmitButton></div>
            </form>
          </div>
          {profile.logo_url && (
            <form action={removeLogo}><button className="btn sm ghost" type="submit">Rimuovi logo</button></form>
          )}
        </div>

        <div className="sec-label" id="aspetto">Colori</div>
        <form action={saveAppearance} className="card pad">
          <p className="muted small" style={{ marginBottom: 10 }}>Scegli una combinazione o i tuoi colori: l&apos;anteprima è immediata. Il colore principale viene usato anche sulle slide dei caroselli.</p>
          <ThemePicker brand={profile.brand_color ?? DEFAULT_BRAND} sidebar={profile.sidebar_color ?? DEFAULT_SIDEBAR} />
          <label className="fld" htmlFor="carousel_design">Stile predefinito dei caroselli</label>
          <select className="fin" id="carousel_design" name="carousel_design" defaultValue={profile.carousel_design ?? 'crema'} style={{ maxWidth: 320 }}>
            {Object.entries(DESIGNS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
          </select>
          <div className="form-actions"><button className="btn pri" type="submit">Salva colori</button></div>
        </form>
      </div>
    </>
  );
}
