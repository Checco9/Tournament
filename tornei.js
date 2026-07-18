/* ============================================================
   TORNEI.JS
   CRUD dei tornei + calcolo di classifica e statistiche a partire
   dai risultati inseriti. Nessuna funzione qui tocca il DOM: solo
   dati. app.js si occupa di disegnare tutto a schermo.
   ============================================================ */

const Tornei = (() => {

  function torneiUtente(utenteId){
    const stato = DB.getState();
    return stato.tornei.filter(t => t.proprietarioId === utenteId);
  }

  function ottieni(torneoId){
    const stato = DB.getState();
    return stato.tornei.find(t => t.id === torneoId) || null;
  }

  function salva(torneoAggiornato){
    const stato = DB.getState();
    const i = stato.tornei.findIndex(t => t.id === torneoAggiornato.id);
    if(i === -1) return false;
    stato.tornei[i] = torneoAggiornato;
    return DB.setState(stato);
  }

  function crea({ proprietarioId, nome, formato, squadreNomi, generaAutomatico, puntiVittoria, puntiPareggio, puntiSconfitta }){
    const squadre = squadreNomi.map(n => ({ id: DB.generaId("squadra"), nome: n.trim() }));

    const nuovoTorneo = {
      id: DB.generaId("torneo"),
      proprietarioId,
      nome: nome.trim(),
      formato, // "semplice" | "andata_ritorno" | "libero"
      puntiVittoria: puntiVittoria ?? 3,
      puntiPareggio: puntiPareggio ?? 1,
      puntiSconfitta: puntiSconfitta ?? 0,
      squadre,
      partite: [],
      creatoIl: new Date().toISOString()
    };

    if(generaAutomatico && squadre.length >= 2){
      const squadreIds = squadre.map(s => s.id);
      const calendario = Scheduler.generaCalendario(squadreIds, formato === "andata_ritorno" ? "andata_ritorno" : "semplice");
      nuovoTorneo.partite = calendario.map(p => ({
        id: DB.generaId("partita"),
        giornata: p.giornata,
        casaId: p.casaId,
        trasfertaId: p.trasfertaId,
        golCasa: null,
        golTrasferta: null,
        marcatori: [],
        giocata: false
      }));
    }

    const stato = DB.getState();
    stato.tornei.push(nuovoTorneo);
    DB.setState(stato);
    return nuovoTorneo;
  }

  function elimina(torneoId){
    const stato = DB.getState();
    stato.tornei = stato.tornei.filter(t => t.id !== torneoId);
    return DB.setState(stato);
  }

  function aggiungiPartitaManuale(torneoId, { giornata, casaId, trasfertaId }){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    const nuovaPartita = {
      id: DB.generaId("partita"),
      giornata: Number(giornata) || (torneo.partite.reduce((m, p) => Math.max(m, p.giornata), 0) + 1),
      casaId, trasfertaId,
      golCasa: null, golTrasferta: null,
      marcatori: [], giocata: false
    };
    torneo.partite.push(nuovaPartita);
    salva(torneo);
    return nuovaPartita;
  }

  function eliminaPartita(torneoId, partitaId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.partite = torneo.partite.filter(p => p.id !== partitaId);
    return salva(torneo);
  }

  function registraRisultato(torneoId, partitaId, { golCasa, golTrasferta, marcatori }){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const partita = torneo.partite.find(p => p.id === partitaId);
    if(!partita) return false;

    partita.golCasa = Number(golCasa);
    partita.golTrasferta = Number(golTrasferta);
    partita.marcatori = marcatori || [];
    partita.giocata = true;

    return salva(torneo);
  }

  function annullaRisultato(torneoId, partitaId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const partita = torneo.partite.find(p => p.id === partitaId);
    if(!partita) return false;
    partita.golCasa = null;
    partita.golTrasferta = null;
    partita.marcatori = [];
    partita.giocata = false;
    return salva(torneo);
  }

  function aggiungiSquadra(torneoId, nome){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    const squadra = { id: DB.generaId("squadra"), nome: nome.trim() };
    torneo.squadre.push(squadra);
    salva(torneo);
    return squadra;
  }

  function rinominaSquadra(torneoId, squadraId, nuovoNome){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const sq = torneo.squadre.find(s => s.id === squadraId);
    if(!sq) return false;
    sq.nome = nuovoNome.trim();
    return salva(torneo);
  }

  function eliminaSquadra(torneoId, squadraId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.squadre = torneo.squadre.filter(s => s.id !== squadraId);
    torneo.partite = torneo.partite.filter(p => p.casaId !== squadraId && p.trasfertaId !== squadraId);
    return salva(torneo);
  }

  /* ---------------- Calcoli derivati (classifica / statistiche) ---------------- */

  function calcolaClassifica(torneo){
    const righe = {};
    torneo.squadre.forEach(sq => {
      righe[sq.id] = {
        id: sq.id, nome: sq.nome,
        giocate: 0, vinte: 0, pareggi: 0, perse: 0,
        golFatti: 0, golSubiti: 0, punti: 0
      };
    });

    torneo.partite.filter(p => p.giocata).forEach(p => {
      const casa = righe[p.casaId];
      const trasferta = righe[p.trasfertaId];
      if(!casa || !trasferta) return; // squadra eliminata nel frattempo

      casa.giocate++; trasferta.giocate++;
      casa.golFatti += p.golCasa; casa.golSubiti += p.golTrasferta;
      trasferta.golFatti += p.golTrasferta; trasferta.golSubiti += p.golCasa;

      if(p.golCasa > p.golTrasferta){
        casa.vinte++; casa.punti += torneo.puntiVittoria;
        trasferta.perse++; trasferta.punti += torneo.puntiSconfitta;
      }else if(p.golCasa < p.golTrasferta){
        trasferta.vinte++; trasferta.punti += torneo.puntiVittoria;
        casa.perse++; casa.punti += torneo.puntiSconfitta;
      }else{
        casa.pareggi++; casa.punti += torneo.puntiPareggio;
        trasferta.pareggi++; trasferta.punti += torneo.puntiPareggio;
      }
    });

    return Object.values(righe)
      .map(r => ({ ...r, dr: r.golFatti - r.golSubiti }))
      .sort((a, b) => b.punti - a.punti || b.dr - a.dr || b.golFatti - a.golFatti);
  }

  function calcolaMarcatori(torneo){
    const mappa = {};
    torneo.partite.filter(p => p.giocata).forEach(p => {
      (p.marcatori || []).forEach(m => {
        const squadra = torneo.squadre.find(s => s.id === m.squadraId);
        const chiave = m.nome.trim().toLowerCase() + "|" + m.squadraId;
        if(!mappa[chiave]){
          mappa[chiave] = { nome: m.nome.trim(), squadra: squadra ? squadra.nome : "—", gol: 0 };
        }
        mappa[chiave].gol += Number(m.gol) || 0;
      });
    });
    return Object.values(mappa).sort((a, b) => b.gol - a.gol);
  }

  function partiteDaGiocare(torneo){
    return torneo.partite.filter(p => !p.giocata).length;
  }

  return {
    torneiUtente, ottieni, salva, crea, elimina,
    aggiungiPartitaManuale, eliminaPartita,
    registraRisultato, annullaRisultato,
    aggiungiSquadra, rinominaSquadra, eliminaSquadra,
    calcolaClassifica, calcolaMarcatori, partiteDaGiocare
  };
})();
