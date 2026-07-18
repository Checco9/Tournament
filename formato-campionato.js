/* ============================================================
   FORMATO-CAMPIONATO.JS
   Tutte le squadre in un unico girone all'italiana, andata sola o
   andata e ritorno. Calendario generato con il "metodo del cerchio".
   ============================================================ */

function generaGironeAllItaliana(squadreIds){
  let squadre = [...squadreIds];
  if(squadre.length % 2 !== 0) squadre.push(null); // null = riposo, per numero dispari

  const n = squadre.length;
  const numeroGiornate = n - 1;
  const meta = n / 2;
  const giornate = [];
  let elenco = [...squadre];

  for(let g = 0; g < numeroGiornate; g++){
    const partiteGiornata = [];
    for(let i = 0; i < meta; i++){
      const a = elenco[i], b = elenco[n - 1 - i];
      if(a !== null && b !== null){
        partiteGiornata.push(g % 2 === 0 ? { casaId: a, trasfertaId: b } : { casaId: b, trasfertaId: a });
      }
    }
    giornate.push(partiteGiornata);
    const fisso = elenco[0];
    const resto = elenco.slice(1);
    resto.unshift(resto.pop());
    elenco = [fisso, ...resto];
  }
  return giornate;
}

Formati.registra("campionato", {
  label: "Campionato",
  descrizione: "Tutte le squadre in un unico girone. Calendario generato in automatico, andata sola o andata e ritorno.",

  opzioniDefault(){ return { andataRitorno: false }; },

  generaPartiteIniziali(torneo){
    const squadreIds = torneo.squadre.map(s => s.id);
    const girone = generaGironeAllItaliana(squadreIds);
    let partite = [];

    girone.forEach((giornata, i) => {
      giornata.forEach(p => partite.push(Tornei.creaPartitaVuota({
        turno: i + 1, etichettaTurno: `Giornata ${i + 1}`, faseTipo: "campionato",
        casaId: p.casaId, trasfertaId: p.trasfertaId
      })));
    });

    if(torneo.opzioniFormato.andataRitorno){
      const numeroAndata = girone.length;
      girone.forEach((giornata, i) => {
        giornata.forEach(p => partite.push(Tornei.creaPartitaVuota({
          turno: numeroAndata + i + 1, etichettaTurno: `Giornata ${numeroAndata + i + 1}`, faseTipo: "campionato",
          casaId: p.trasfertaId, trasfertaId: p.casaId
        })));
      });
    }
    return partite;
  },

  calcolaVista(torneo){
    const squadreIds = torneo.squadre.map(s => s.id);
    return { tipo: "classifica_singola", classifica: Statistiche.calcolaClassifica(torneo, squadreIds, torneo.partite) };
  }
});
