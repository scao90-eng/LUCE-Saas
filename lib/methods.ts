// Indicazioni per l'AI sui metodi specifici che un operatore può praticare.
// Solo fatti verificati: dove i principi del metodo non sono stati forniti,
// l'AI non deve inventarli.

const LUCE = `## Metodo praticato
L'operatore è facilitatore/facilitatrice di LUCE Danza Somatica e Terapeutica©, metodo ideato da Marta Schiabel.
- Non insegna il metodo: lo porta alle persone attraverso sessioni e percorsi (individuali o di gruppo),
  come un naturopata pratica la naturopatia per far stare meglio chi segue.
- I contenuti si rivolgono quindi a chi potrebbe vivere un'esperienza LUCE (benefici percepiti, cosa si prova,
  come si svolge una sessione, per chi è adatta), non a chi vuole diventare facilitatore.
- Usa il nome corretto: "LUCE Danza Somatica e Terapeutica©" (o "LUCE" dopo la prima menzione);
  quando serve, ricorda che il metodo è stato ideato da Marta Schiabel.
- Non inventare tecniche, fasi o principi specifici del metodo che non ti sono stati forniti: descrivi
  l'esperienza in termini generali (ascolto del corpo, movimento, presenza, espressione di sé).
- Nonostante la parola "Terapeutica" nel nome, niente promesse di cura o affermazioni sanitarie:
  parla di benessere, consapevolezza ed esperienza vissuta.`;

export function methodGuidance(discipline: string | null | undefined): string {
  if (/metodo\s*luce|luce\s+danza/i.test(discipline ?? '')) return LUCE;
  return '';
}
