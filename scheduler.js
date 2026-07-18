/* ============================================================
   SCHEDULER.JS
   Genera automaticamente il calendario di un girone all'italiana
   con il "metodo del cerchio": una squadra resta fissa, le altre
   ruotano attorno ad essa, una giornata per rotazione.
   Funziona sia con numero di squadre pari che dispari (in caso di
   numero dispari si aggiunge un turno di riposo fittizio).
   ============================================================ */

const Scheduler = (() => {

  function generaGironeSemplice(squadreIds){
    let squadre = [...squadreIds];
    const dispari = squadre.length % 2 !== 0;
    if(dispari) squadre.push(null); // null = riposo

    const n = squadre.length;
    const numeroGiornate = n - 1;
    const meta = n / 2;
    const giornate = [];

    let elenco = [...squadre];

    for(let g = 0; g < numeroGiornate; g++){
      const partiteGiornata = [];
      for(let i = 0; i < meta; i++){
        const casa = elenco[i];
        const trasferta = elenco[n - 1 - i];
        if(casa !== null && trasferta !== null){
          // alterna casa/trasferta ad ogni giornata per equilibrare le partite in casa
          if(g % 2 === 0){
            partiteGiornata.push({ casaId: casa, trasfertaId: trasferta });
          }else{
            partiteGiornata.push({ casaId: trasferta, trasfertaId: casa });
          }
        }
      }
      giornate.push(partiteGiornata);

      // ruota tutti tranne il primo elemento, che resta fisso
      const fisso = elenco[0];
      const resto = elenco.slice(1);
      resto.unshift(resto.pop());
      elenco = [fisso, ...resto];
    }

    return giornate;
  }

  /**
   * formato: "semplice" (solo andata) oppure "andata_ritorno"
   * Ritorna un array piatto di partite, ognuna con numero di giornata.
   */
  function generaCalendario(squadreIds, formato){
    const gironeAndata = generaGironeSemplice(squadreIds);
    let partite = [];

    gironeAndata.forEach((giornata, i) => {
      giornata.forEach(p => {
        partite.push({ giornata: i + 1, casaId: p.casaId, trasfertaId: p.trasfertaId });
      });
    });

    if(formato === "andata_ritorno"){
      const numeroGiornateAndata = gironeAndata.length;
      gironeAndata.forEach((giornata, i) => {
        giornata.forEach(p => {
          partite.push({
            giornata: numeroGiornateAndata + i + 1,
            casaId: p.trasfertaId,
            trasfertaId: p.casaId
          });
        });
      });
    }

    return partite;
  }

  return { generaCalendario };
})();
