/* ============================================================
   FORMATO-GIRONI.JS
   Le squadre vengono divise in N gruppi (A, B, C...) il più possibile
   equilibrati; dentro ogni gruppo si gioca un girone all'italiana.
   Ogni gruppo ha la propria classifica indipendente.
   ============================================================ */

const LETTERE_GIRONI = "ABCDEFGHIJKL";

function suddividiInGruppi(squadreIds, numeroGironi){
  const gruppi = Array.from({ length: numeroGironi }, () => []);
  squadreIds.forEach((id, i) => gruppi[i % numeroGironi].push(id));
  return gruppi;
}

Formati.registra("gironi", {
  label: "Gironi",
  descrizione: "Le squadre vengono divise in gruppi; dentro ogni gruppo si gioca un girone all'italiana, con classifiche separate.",

  opzioniDefault(){ return { numeroGironi: 2, andataRitorno: false, qualificatiPerGirone: 2 }; },

  generaPartiteIniziali(torneo){
    const numeroGironi = Math.max(1, Math.min(torneo.opzioniFormato.numeroGironi || 2, Math.floor(torneo.squadre.length / 2) || 1));
    const gruppi = suddividiInGruppi(torneo.squadre.map(s => s.id), numeroGironi);
    let partite = [];

    gruppi.forEach((squadreIds, indiceGruppo) => {
      const nomeGruppo = LETTERE_GIRONI[indiceGruppo] || String(indiceGruppo + 1);
      const giornate = generaGironeAllItaliana(squadreIds);

      giornate.forEach((giornata, i) => {
        giornata.forEach(p => partite.push(Tornei.creaPartitaVuota({
          turno: i + 1, etichettaTurno: `Girone ${nomeGruppo} — Giornata ${i + 1}`,
          faseTipo: "girone", girone: nomeGruppo, casaId: p.casaId, trasfertaId: p.trasfertaId
        })));
      });

      if(torneo.opzioniFormato.andataRitorno){
        const numeroAndata = giornate.length;
        giornate.forEach((giornata, i) => {
          giornata.forEach(p => partite.push(Tornei.creaPartitaVuota({
            turno: numeroAndata + i + 1, etichettaTurno: `Girone ${nomeGruppo} — Giornata ${numeroAndata + i + 1}`,
            faseTipo: "girone", girone: nomeGruppo, casaId: p.trasfertaId, trasfertaId: p.casaId
          })));
        });
      }
    });
    return partite;
  },

  calcolaVista(torneo){
    const nomiGironi = [...new Set(torneo.partite.map(p => p.girone))].filter(Boolean).sort();
    const gruppi = nomiGironi.map(nome => {
      const squadreIds = [...new Set(
        torneo.partite.filter(p => p.girone === nome).flatMap(p => [p.casaId, p.trasfertaId])
      )];
      return { nome, classifica: Statistiche.calcolaClassifica(torneo, squadreIds, torneo.partite.filter(p => p.girone === nome)) };
    });
    return { tipo: "classifiche_multiple", gruppi };
  }
});
