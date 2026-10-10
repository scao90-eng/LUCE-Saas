import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { requireSession } from '@/lib/session';
import { saveProfile } from './actions';
import { DESIGNS } from '@/lib/carousel';

export default async function Impostazioni({ searchParams }: { searchParams: { ok?: string; error?: string; benvenuto?: string } }) {
  const { profile } = await requireSession();
  return (
    <>
      <PageHeader title="Profilo attività" sub="Queste informazioni guidano i consigli e i contenuti dell'AI" />
      <div className="wrap">
        {searchParams.benvenuto && <div className="banner info">Benvenuta, benvenuto in Luce! Inizia raccontandoci la tua attività.</div>}
        <Flash searchParams={searchParams} />
        <form action={saveProfile} className="card pad" style={{ maxWidth: 760 }}>
          <div className="form-grid">
            <div><label className="fld" htmlFor="full_name">Nome e cognome</label><input className="fin" id="full_name" name="full_name" defaultValue={profile.full_name ?? ''} /></div>
            <div><label className="fld" htmlFor="business_name">Nome dell&apos;attività</label><input className="fin" id="business_name" name="business_name" defaultValue={profile.business_name ?? ''} /></div>
            <div><label className="fld" htmlFor="discipline">Disciplina</label><input className="fin" id="discipline" name="discipline" list="disc" defaultValue={profile.discipline ?? ''} placeholder="es. yoga, reiki, naturopatia" />
              <datalist id="disc">{['Yoga', 'Reiki', 'Naturopatia', 'Meditazione', 'Danza', 'Massaggio olistico', 'Floriterapia', 'Costellazioni familiari', 'Coaching', 'Pilates', 'Sound healing'].map((d) => <option key={d} value={d} />)}</datalist></div>
            <div><label className="fld" htmlFor="city">Città / zona</label><input className="fin" id="city" name="city" defaultValue={profile.city ?? ''} /></div>
            <div><label className="fld" htmlFor="instagram_handle">Profilo Instagram</label><input className="fin" id="instagram_handle" name="instagram_handle" defaultValue={profile.instagram_handle ?? ''} placeholder="@nomeprofilo" /></div>
            <div><label className="fld" htmlFor="brand_color">Colore del brand (slide)</label>
              <input className="fin" type="color" id="brand_color" name="brand_color" defaultValue={profile.brand_color ?? '#B8643F'} style={{ height: 40, padding: 4 }} /></div>
            <div><label className="fld" htmlFor="carousel_design">Stile caroselli predefinito</label>
              <select className="fin" id="carousel_design" name="carousel_design" defaultValue={profile.carousel_design ?? 'crema'}>
                {Object.entries(DESIGNS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
              </select></div>
            <div className="form-full"><label className="fld" htmlFor="target">A chi ti rivolgi</label><textarea className="fin" id="target" name="target" rows={2} defaultValue={profile.target ?? ''} placeholder="es. donne 30-50 anni, stressate dal lavoro, che cercano un momento per sé" /></div>
            <div className="form-full"><label className="fld" htmlFor="tone">Tono di voce</label><textarea className="fin" id="tone" name="tone" rows={2} defaultValue={profile.tone ?? ''} placeholder="es. caldo e accogliente, diretto, con un pizzico di ironia; uso del tu" /></div>
          </div>
          <div className="form-actions"><button className="btn pri" type="submit">Salva</button></div>
        </form>
      </div>
    </>
  );
}
