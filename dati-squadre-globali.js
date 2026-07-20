/* ============================================================
   DATI-SQUADRE-GLOBALI.JS
   Una "squadra globale" rappresenta un club/squadra che può
   partecipare a più tornei nel tempo. Ogni torneo continua ad avere
   le sue squadre "locali" indipendenti (stesso modello di sempre);
   una squadra locale può facoltativamente essere "collegata" a una
   squadra globale tramite squadra.squadraGlobaleId.

   Le statistiche all-time si ottengono sempre per SOMMA dei dati dei
   singoli tornei — non esiste un numero salvato a parte, quindi
   restano coerenti anche se cambi un risultato passato.
   ============================================================ */

const SquadreGlobali = (() => {

  function elencoUtente(utenteId){
    return DB.getState().squadreGlobali.filter(s => s.proprietarioId === utenteId);
  }

  function ottieni(id){
    return DB.getState().squadreGlobali.find(s => s.id === id) || null;
  }

  function crea(proprietarioId, { nome, logo, colore }){
    const stato = DB.getState();
    const nuova = {
      id: DB.generaId("squadraglobale"),
      proprietarioId, nome: nome.trim(),
      logo: logo || null, colore: colore || "#12161C"
    };
    stato.squadreGlobali.push(nuova);
    DB.setState(stato);
    return nuova;
  }

  function aggiorna(id, dati){
    const stato = DB.getState();
    const s = stato.squadreGlobali.find(x => x.id === id);
    if(!s) return false;
    Object.assign(s, dati);
    return DB.setState(stato);
  }

  function elimina(id){
    const stato = DB.getState();
    stato.squadreGlobali = stato.squadreGlobali.filter(s => s.id !== id);
    stato.tornei.forEach(t => (t.squadre || []).forEach(sq => {
      if(sq.squadraGlobaleId === id) sq.squadraGlobaleId = null;
    }));
    return DB.setState(stato);
  }

  /* Collega/scollega una squadra locale di un torneo a una squadra globale. */
  function collega(torneoId, squadraId, squadraGlobaleId){
    return Tornei.aggiornaSquadra(torneoId, squadraId, { squadraGlobaleId: squadraGlobaleId || null });
  }

  function torneiCollegati(utenteId, squadraGlobaleId){
    return DB.getState().tornei.filter(t =>
      t.proprietarioId === utenteId && (t.squadre || []).some(s => s.squadraGlobaleId === squadraGlobaleId)
    );
  }

  function statisticheAllTime(utenteId, squadraGlobaleId){
    const tornei = torneiCollegati(utenteId, squadraGlobaleId);
    const totale = { giocate: 0, vinte: 0, pareggi: 0, perse: 0, golFatti: 0, golSubiti: 0, punti: 0 };
    const storico = [];

    tornei.forEach(torneo => {
      const squadraLocale = torneo.squadre.find(s => s.squadraGlobaleId === squadraGlobaleId);
      if(!squadraLocale) return;
      const record = Statistiche.calcolaClassifica(torneo, torneo.squadre.map(s => s.id), torneo.partite)
        .find(r => r.id === squadraLocale.id);
      if(!record) return;

      totale.giocate += record.giocate; totale.vinte += record.vinte;
      totale.pareggi += record.pareggi; totale.perse += record.perse;
      totale.golFatti += record.golFatti; totale.golSubiti += record.golSubiti;
      totale.punti += record.punti;

      storico.push({
        torneoId: torneo.id, torneoNome: torneo.nome, squadraLocaleId: squadraLocale.id,
        formato: torneo.formato, ...record
      });
    });

    totale.dr = totale.golFatti - totale.golSubiti;
    return { totale, storico };
  }

  return { elencoUtente, ottieni, crea, aggiorna, elimina, collega, torneiCollegati, statisticheAllTime };
})();
