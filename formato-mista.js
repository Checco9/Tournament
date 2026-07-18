/* ============================================================
   FORMATO-MISTA.JS
   Fase 1: gironi (riusa la logica di formato-gironi.js).
   Fase 2: quando l'organizzatore decide che la fase a gironi è
   conclusa, genera un tabellone a eliminazione diretta con i
   qualificati (riusa la logica di formato-eliminazione.js).
   La fase 2 NON si genera da sola: va avviata dall'organizzatore
   con Formati.get("formula_mista").generaFaseEliminazione(torneo),
   perché solo lui sa quando considerare chiusa la fase a gironi.
   ============================================================ */

Formati.registra("formula_mista", {
  label: "Formula mista",
  descrizione: "Fase a gironi seguita da eliminazione diretta tra le squadre qualificate.",

  opzioniDefault(){ return { numeroGironi: 2, andataRitorno: false, qualificatiPerGirone: 2, spareggio: "rigori", faseEliminazioneGenerata: false }; },

  generaPartiteIniziali(torneo){
    // fase 1: identica al formato "gironi"
    return Formati.get("gironi").generaPartiteIniziali(torneo);
  },

  /* Chiamata esplicitamente dall'organizzatore quando la fase a
     gironi è conclusa. Prende i qualificati di ogni girone e genera
     il tabellone a eliminazione diretta. */
  generaFaseEliminazione(torneo){
    const vistaGironi = Formati.get("gironi").calcolaVista(torneo);
    const qualificatiPerGirone = torneo.opzioniFormato.qualificatiPerGirone || 2;

    const seedOrdinato = [];
    for(let pos = 0; pos < qualificatiPerGirone; pos++){
      vistaGironi.gruppi.forEach(g => {
        if(g.classifica[pos]) seedOrdinato.push(g.classifica[pos].id);
      });
    }

    const seedFinale = [];
    for(let i = 0; i < seedOrdinato.length / 2; i++){
      seedFinale.push(seedOrdinato[i]);
      seedFinale.push(seedOrdinato[seedOrdinato.length - 1 - i]);
    }

    const potenza = prossimaPotenzaDiDue(seedFinale.length);
    const numeroTurniTotali = Math.log2(potenza);
    torneo.opzioniFormato.numeroTurniTotali = numeroTurniTotali;
    while(seedFinale.length < potenza) seedFinale.push(null);

    for(let i = 0; i < potenza / 2; i++){
      const casa = seedFinale[2 * i], trasferta = seedFinale[2 * i + 1];
      const p = Tornei.creaPartitaVuota({
        turno: 1, etichettaTurno: etichettaTurnoEliminazione(1, numeroTurniTotali),
        faseTipo: "eliminazione", casaId: casa, trasfertaId: trasferta
      });
      p.slot = i;
      if(casa === null || trasferta === null){
        p.bye = true; p.giocata = true; p.stato = "giocata";
        p.golCasa = casa ? 1 : 0; p.golTrasferta = trasferta ? 1 : 0;
      }
      torneo.partite.push(p);
    }

    torneo.opzioniFormato.faseEliminazioneGenerata = true;
    propagaAvanzamentoEliminazione(torneo);
    Tornei.salva(torneo);
  },

  faseGironiCompleta(torneo){
    return torneo.partite.filter(p => p.faseTipo === "girone").every(p => p.giocata);
  },

  dopoRisultato(torneo, partita){
    if(partita && partita.faseTipo === "eliminazione") propagaAvanzamentoEliminazione(torneo);
  },

  calcolaVista(torneo){
    return {
      tipo: "mista",
      gironi: Formati.get("gironi").calcolaVista(torneo),
      eliminazione: torneo.opzioniFormato.faseEliminazioneGenerata ? Formati.get("eliminazione_diretta").calcolaVista(torneo) : null,
      faseGironiCompleta: this.faseGironiCompleta(torneo)
    };
  }
});
