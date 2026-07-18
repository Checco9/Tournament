/* ============================================================
   DATI-STATISTICHE.JS
   Tutto ciò che è "calcolato" (mai salvato direttamente): risultato
   partita dagli eventi, classifiche squadre (con criterio di
   spareggio configurabile) e classifiche individuali. Nessuna
   funzione qui scrive nel DB: legge un torneo e restituisce dati.
   ============================================================ */

const Statistiche = (() => {

  /* Determina il risultato di una partita a partire dagli eventi
     gol/autogol inseriti. Se non ci sono eventi di questo tipo,
     segnala che va usato il risultato "rapido" inserito a mano. */
  function calcolaGolDaEventi(partita){
    const eventiGol = (partita.eventi || []).filter(e => e.tipo === "gol" || e.tipo === "autogol");
    if(eventiGol.length === 0) return { haEventiGol: false, golCasa: 0, golTrasferta: 0 };

    let golCasa = 0, golTrasferta = 0;
    eventiGol.forEach(e => {
      const perCasa = e.squadraId === partita.casaId;
      const perTrasferta = e.squadraId === partita.trasfertaId;
      if(e.tipo === "gol"){
        if(perCasa) golCasa++; else if(perTrasferta) golTrasferta++;
      }else{ // autogol: punto all'avversario
        if(perCasa) golTrasferta++; else if(perTrasferta) golCasa++;
      }
    });
    return { haEventiGol: true, golCasa, golTrasferta };
  }

  /* Classifica di un sottoinsieme di squadre su un sottoinsieme di
     partite (usata sia per il campionato intero sia per un singolo
     girone). Il criterio di spareggio è configurabile sul torneo. */
  function calcolaClassifica(torneo, squadreIds, partite){
    const righe = {};
    squadreIds.forEach(id => {
      const sq = torneo.squadre.find(s => s.id === id);
      righe[id] = { id, nome: sq ? sq.nome : "—", giocate: 0, vinte: 0, pareggi: 0, perse: 0, golFatti: 0, golSubiti: 0, punti: 0 };
    });

    partite.filter(p => p.giocata && righe[p.casaId] && righe[p.trasfertaId]).forEach(p => {
      const casa = righe[p.casaId], trasferta = righe[p.trasfertaId];
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

    let righeArr = Object.values(righe).map(r => ({ ...r, dr: r.golFatti - r.golSubiti }));
    return ordinaClassifica(righeArr, partite, torneo);
  }

  function ordinaClassifica(righe, partite, torneo){
    const criterio = torneo.criterioSpareggio || "differenza_reti";

    if(criterio === "gol_fatti"){
      return righe.sort((a, b) => b.punti - a.punti || b.golFatti - a.golFatti || b.dr - a.dr);
    }

    if(criterio === "scontri_diretti"){
      righe.sort((a, b) => b.punti - a.punti);
      let i = 0;
      while(i < righe.length){
        let j = i;
        while(j + 1 < righe.length && righe[j + 1].punti === righe[i].punti) j++;
        if(j > i){
          const idsGruppo = righe.slice(i, j + 1).map(r => r.id);
          const mini = {};
          idsGruppo.forEach(id => mini[id] = { punti: 0, dr: 0 });
          partite.filter(p => p.giocata && idsGruppo.includes(p.casaId) && idsGruppo.includes(p.trasfertaId)).forEach(p => {
            if(p.golCasa > p.golTrasferta){ mini[p.casaId].punti += torneo.puntiVittoria; mini[p.trasfertaId].punti += torneo.puntiSconfitta; }
            else if(p.golCasa < p.golTrasferta){ mini[p.trasfertaId].punti += torneo.puntiVittoria; mini[p.casaId].punti += torneo.puntiSconfitta; }
            else{ mini[p.casaId].punti += torneo.puntiPareggio; mini[p.trasfertaId].punti += torneo.puntiPareggio; }
            mini[p.casaId].dr += p.golCasa - p.golTrasferta;
            mini[p.trasfertaId].dr += p.golTrasferta - p.golCasa;
          });
          const sottoOrdinato = righe.slice(i, j + 1).sort((a, b) =>
            mini[b.id].punti - mini[a.id].punti || mini[b.id].dr - mini[a.id].dr || b.dr - a.dr || b.golFatti - a.golFatti
          );
          righe.splice(i, j - i + 1, ...sottoOrdinato);
        }
        i = j + 1;
      }
      return righe;
    }

    // default: differenza reti
    return righe.sort((a, b) => b.punti - a.punti || b.dr - a.dr || b.golFatti - a.golFatti);
  }

  /* Statistiche individuali di tutti i giocatori del torneo,
     ricalcolate da zero ogni volta a partire dagli eventi delle
     partite giocate: nessun numero è mai salvato "a mano". */
  function calcolaStatisticheGiocatori(torneo){
    const mappa = {};
    torneo.giocatori.forEach(g => {
      const squadra = torneo.squadre.find(s => s.id === g.squadraId);
      mappa[g.id] = {
        id: g.id, nome: g.nome, foto: g.foto, numeroMaglia: g.numeroMaglia, ruolo: g.ruolo,
        squadraId: g.squadraId, squadraNome: squadra ? squadra.nome : "—",
        presenze: 0, minuti: 0, gol: 0, assist: 0, autogol: 0,
        gialli: 0, rossi: 0, mvp: 0, cleanSheet: 0
      };
    });

    const durataDefault = torneo.durataPartitaMinuti || 90;

    torneo.partite.filter(p => p.giocata).forEach(p => {
      Object.entries(p.formazioni || {}).forEach(([squadraId, formazione]) => {
        (formazione.titolari || []).forEach(gid => {
          if(!mappa[gid]) return;
          mappa[gid].presenze++;
          const sub = (p.eventi || []).find(e => e.tipo === "sostituzione" && e.giocatoreUscitaId === gid);
          mappa[gid].minuti += sub ? (Number(sub.minuto) || durataDefault) : durataDefault;
        });

        const golSubiti = squadraId === p.casaId ? p.golTrasferta : (squadraId === p.trasfertaId ? p.golCasa : null);
        if(golSubiti === 0){
          (formazione.titolari || []).forEach(gid => {
            const giocatore = torneo.giocatori.find(g => g.id === gid);
            if(giocatore && mappa[gid] && /portier/i.test(giocatore.ruolo || "")) mappa[gid].cleanSheet++;
          });
        }
      });

      (p.eventi || []).forEach(e => {
        if(e.tipo === "sostituzione" && mappa[e.giocatoreEntrataId]){
          mappa[e.giocatoreEntrataId].presenze++;
          mappa[e.giocatoreEntrataId].minuti += Math.max(0, durataDefault - (Number(e.minuto) || 0));
        }
        if(e.tipo === "gol"){
          if(mappa[e.giocatoreId]) mappa[e.giocatoreId].gol++;
          if(e.assistId && mappa[e.assistId]) mappa[e.assistId].assist++;
        }
        if(e.tipo === "autogol" && mappa[e.giocatoreId]) mappa[e.giocatoreId].autogol++;
        if(e.tipo === "cartellinoGiallo" && mappa[e.giocatoreId]) mappa[e.giocatoreId].gialli++;
        if(e.tipo === "cartellinoRosso" && mappa[e.giocatoreId]) mappa[e.giocatoreId].rossi++;
      });

      if(p.mvpGiocatoreId && mappa[p.mvpGiocatoreId]) mappa[p.mvpGiocatoreId].mvp++;
    });

    return Object.values(mappa);
  }

  function statisticheGiocatore(torneo, giocatoreId){
    return calcolaStatisticheGiocatori(torneo).find(s => s.id === giocatoreId) || null;
  }

  return { calcolaGolDaEventi, calcolaClassifica, calcolaStatisticheGiocatori, statisticheGiocatore };
})();
