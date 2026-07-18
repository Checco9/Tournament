/* ============================================================
   FORMATO-ELIMINAZIONE.JS
   Tabellone a eliminazione diretta. Se il numero di squadre non è
   una potenza di 2, le squadre in eccesso vengono compensate con
   turni di "bye" (passaggio diretto) al primo turno. Quando tutte
   le partite di un turno sono giocate, il turno successivo viene
   generato in automatico con i vincitori. In caso di pareggio serve
   il risultato dei rigori per stabilire chi avanza.
   ============================================================ */

function prossimaPotenzaDiDue(n){
  let p = 1;
  while(p < n) p *= 2;
  return p;
}

function etichettaTurnoEliminazione(turno, numeroTurniTotali){
  const daLlaFine = numeroTurniTotali - turno;
  if(daLlaFine === 0) return "Finale";
  if(daLlaFine === 1) return "Semifinale";
  if(daLlaFine === 2) return "Quarti di finale";
  if(daLlaFine === 3) return "Ottavi di finale";
  return `Turno ${turno}`;
}

function vincitorePartitaEliminazione(p){
  if(p.casaId === null) return p.trasfertaId;
  if(p.trasfertaId === null) return p.casaId;
  if(!p.giocata) return null;
  if(p.golCasa > p.golTrasferta) return p.casaId;
  if(p.golCasa < p.golTrasferta) return p.trasfertaId;
  if(p.rigoriCasa !== null && p.rigoriTrasferta !== null && p.rigoriCasa !== p.rigoriTrasferta){
    return p.rigoriCasa > p.rigoriTrasferta ? p.casaId : p.trasfertaId;
  }
  return null; // pareggio non ancora risolto: servono i rigori
}

function propagaAvanzamentoEliminazione(torneo){
  const numeroTurniTotali = torneo.opzioniFormato.numeroTurniTotali;
  const partiteElim = torneo.partite.filter(p => p.faseTipo === "eliminazione");
  const turniPresenti = [...new Set(partiteElim.map(p => p.turno))].sort((a, b) => a - b);

  turniPresenti.forEach(turno => {
    const partiteTurno = partiteElim.filter(p => p.turno === turno).sort((a, b) => a.slot - b.slot);
    if(partiteTurno.length < 2) return; // era la finale
    if(!partiteTurno.every(p => p.giocata)) return;

    const prossimoTurnoEsiste = torneo.partite.some(p => p.faseTipo === "eliminazione" && p.turno === turno + 1);
    if(prossimoTurnoEsiste) return;

    const vincitori = partiteTurno.map(vincitorePartitaEliminazione);
    if(vincitori.some(v => v === null)) return; // c'è ancora un pareggio da risolvere ai rigori

    const numeroPartite = vincitori.length / 2;
    for(let i = 0; i < numeroPartite; i++){
      const casa = vincitori[2 * i], trasferta = vincitori[2 * i + 1];
      const nuova = Tornei.creaPartitaVuota({
        turno: turno + 1,
        etichettaTurno: etichettaTurnoEliminazione(turno + 1, numeroTurniTotali),
        faseTipo: "eliminazione", casaId: casa, trasfertaId: trasferta
      });
      nuova.slot = i;
      if(casa === null || trasferta === null){
        nuova.bye = true; nuova.giocata = true; nuova.stato = "giocata";
        nuova.golCasa = casa ? 1 : 0; nuova.golTrasferta = trasferta ? 1 : 0;
      }
      torneo.partite.push(nuova);
    }
  });

  // se sono stati creati nuovi bye, propaga ancora finché non ci sono più avanzamenti automatici
  const partiteDopo = torneo.partite.filter(p => p.faseTipo === "eliminazione").length;
  if(partiteDopo !== partiteElim.length) propagaAvanzamentoEliminazione(torneo);
}

function mescola(array){
  const a = [...array];
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Formati.registra("eliminazione_diretta", {
  label: "Eliminazione diretta",
  descrizione: "Tabellone a turni: chi perde è fuori. Sorteggio automatico degli accoppiamenti, con eventuale spareggio ai rigori in caso di pareggio.",

  opzioniDefault(){ return { spareggio: "rigori" }; },

  generaPartiteIniziali(torneo){
    const potenza = prossimaPotenzaDiDue(torneo.squadre.length);
    const numeroTurniTotali = Math.log2(potenza);
    torneo.opzioniFormato.numeroTurniTotali = numeroTurniTotali;

    const seed = mescola(torneo.squadre.map(s => s.id));
    while(seed.length < potenza) seed.push(null);

    const partite = [];
    for(let i = 0; i < potenza / 2; i++){
      const casa = seed[2 * i], trasferta = seed[2 * i + 1];
      const p = Tornei.creaPartitaVuota({
        turno: 1, etichettaTurno: etichettaTurnoEliminazione(1, numeroTurniTotali),
        faseTipo: "eliminazione", casaId: casa, trasfertaId: trasferta
      });
      p.slot = i;
      if(casa === null || trasferta === null){
        p.bye = true; p.giocata = true; p.stato = "giocata";
        p.golCasa = casa ? 1 : 0; p.golTrasferta = trasferta ? 1 : 0;
      }
      partite.push(p);
    }
    return partite;
  },

  dopoRisultato(torneo){
    propagaAvanzamentoEliminazione(torneo);
  },

  calcolaVista(torneo){
    const partiteElim = torneo.partite.filter(p => p.faseTipo === "eliminazione");
    const numeriTurno = [...new Set(partiteElim.map(p => p.turno))].sort((a, b) => a - b);
    const turni = numeriTurno.map(numero => ({
      numero,
      etichetta: partiteElim.find(p => p.turno === numero)?.etichettaTurno || `Turno ${numero}`,
      partite: partiteElim.filter(p => p.turno === numero).sort((a, b) => a.slot - b.slot)
    }));
    const ultimoTurno = turni[turni.length - 1];
    const campione = ultimoTurno && ultimoTurno.partite.length === 1 && ultimoTurno.partite[0].giocata
      ? vincitorePartitaEliminazione(ultimoTurno.partite[0]) : null;
    return { tipo: "bracket", turni, campioneId: campione };
  }
});
