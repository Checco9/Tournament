/* ============================================================
   DATI-TORNEI.JS
   CRUD puro sulle entità del dominio: tornei, squadre, giocatori,
   partite. Nessuna funzione qui calcola classifiche o statistiche
   (quello è compito di dati-statistiche.js) e nessuna tocca il DOM
   (quello è compito dei file app-*.js).
   ============================================================ */

const Tornei = (() => {

  /* ---------------- Tornei ---------------- */

  function torneiUtente(utenteId){
    return DB.getState().tornei.filter(t => t.proprietarioId === utenteId);
  }

  function ottieni(torneoId){
    return DB.getState().tornei.find(t => t.id === torneoId) || null;
  }

  function salva(torneo){
    const stato = DB.getState();
    const i = stato.tornei.findIndex(t => t.id === torneo.id);
    if(i === -1) return false;
    stato.tornei[i] = torneo;
    return DB.setState(stato);
  }

  function crea(dati){
    const nuovoTorneo = {
      id: DB.generaId("torneo"),
      proprietarioId: dati.proprietarioId,
      nome: dati.nome.trim(),
      sport: dati.sport || "calcio",
      logo: dati.logo || null,
      coloreprimario: dati.coloreprimario || "#1F6F50",
      coloreSecondario: dati.coloreSecondario || "#12161C",
      formato: dati.formato,                 // campionato | gironi | eliminazione_diretta | formula_mista
      opzioniFormato: dati.opzioniFormato || {},
      puntiVittoria: dati.puntiVittoria ?? 3,
      puntiPareggio: dati.puntiPareggio ?? 1,
      puntiSconfitta: dati.puntiSconfitta ?? 0,
      criterioSpareggio: dati.criterioSpareggio || "differenza_reti",
      numeroTitolari: dati.numeroTitolari || 11,
      durataPartitaMinuti: dati.durataPartitaMinuti || 90,
      squadre: [],
      giocatori: [],
      staff: [],
      campi: [],
      news: [],
      analytics: { visualizzazioniGiocatori: {}, visualizzazioniSquadre: {} },
      sponsor: dati.sponsor || null,   // { nome, logo, link }
      partite: [],
      creatoIl: new Date().toISOString()
    };

    const squadre = (dati.squadreNomi || []).map(n => ({
      id: DB.generaId("squadra"), nome: n.trim(), logo: null, colore: "#12161C", allenatore: "", squadraGlobaleId: null
    }));
    nuovoTorneo.squadre = squadre;

    if(squadre.length >= 2){
      nuovoTorneo.partite = Formati.get(nuovoTorneo.formato).generaPartiteIniziali(nuovoTorneo);
    }

    const stato = DB.getState();
    stato.tornei.push(nuovoTorneo);
    DB.setState(stato);
    return nuovoTorneo;
  }

  function elimina(torneoId){
    const stato = DB.getState();
    stato.tornei = stato.tornei.filter(t => t.id !== torneoId);
    Object.keys(stato.preferiti).forEach(uid => {
      stato.preferiti[uid] = (stato.preferiti[uid] || []).filter(id => id !== torneoId);
    });
    return DB.setState(stato);
  }

  /* ---------------- Preferiti ---------------- */

  function preferitiUtente(utenteId){
    return DB.getState().preferiti[utenteId] || [];
  }

  function isPreferito(utenteId, torneoId){
    return preferitiUtente(utenteId).includes(torneoId);
  }

  function toggleFavorito(utenteId, torneoId){
    const stato = DB.getState();
    if(!stato.preferiti[utenteId]) stato.preferiti[utenteId] = [];
    const lista = stato.preferiti[utenteId];
    const i = lista.indexOf(torneoId);
    if(i === -1) lista.push(torneoId); else lista.splice(i, 1);
    DB.setState(stato);
    return i === -1; // true se ora è preferito
  }

  /* ---------------- Squadre ---------------- */

  function aggiungiSquadra(torneoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    const squadra = {
      id: DB.generaId("squadra"), nome: dati.nome.trim(),
      logo: dati.logo || null, colore: dati.colore || "#12161C", allenatore: dati.allenatore || "",
      squadraGlobaleId: dati.squadraGlobaleId || null
    };
    torneo.squadre.push(squadra);
    salva(torneo);
    return squadra;
  }

  function aggiornaSquadra(torneoId, squadraId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const sq = torneo.squadre.find(s => s.id === squadraId);
    if(!sq) return false;
    Object.assign(sq, dati);
    return salva(torneo);
  }

  function eliminaSquadra(torneoId, squadraId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.squadre = torneo.squadre.filter(s => s.id !== squadraId);
    torneo.giocatori = torneo.giocatori.filter(g => g.squadraId !== squadraId);
    torneo.partite = torneo.partite.filter(p => p.casaId !== squadraId && p.trasfertaId !== squadraId);
    return salva(torneo);
  }

  /* ---------------- Staff (arbitri, dirigenti, ecc.) ---------------- */

  function aggiungiStaff(torneoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    if(!torneo.staff) torneo.staff = [];
    const membro = {
      id: DB.generaId("staff"), nome: dati.nome.trim(), ruolo: dati.ruolo || "",
      telefono: dati.telefono || "", email: dati.email || "", foto: dati.foto || null
    };
    torneo.staff.push(membro);
    salva(torneo);
    return membro;
  }

  function aggiornaStaff(torneoId, staffId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const m = (torneo.staff || []).find(s => s.id === staffId);
    if(!m) return false;
    Object.assign(m, dati);
    return salva(torneo);
  }

  function eliminaStaff(torneoId, staffId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.staff = (torneo.staff || []).filter(s => s.id !== staffId);
    torneo.partite.forEach(p => { if(p.arbitroStaffId === staffId) p.arbitroStaffId = null; });
    return salva(torneo);
  }

  /* ---------------- Campi ---------------- */

  function aggiungiCampo(torneoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    if(!torneo.campi) torneo.campi = [];
    const campo = {
      id: DB.generaId("campo"), nome: dati.nome.trim(),
      indirizzo: dati.indirizzo || "", note: dati.note || ""
    };
    torneo.campi.push(campo);
    salva(torneo);
    return campo;
  }

  function aggiornaCampo(torneoId, campoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const c = (torneo.campi || []).find(x => x.id === campoId);
    if(!c) return false;
    Object.assign(c, dati);
    return salva(torneo);
  }

  function eliminaCampo(torneoId, campoId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.campi = (torneo.campi || []).filter(c => c.id !== campoId);
    return salva(torneo);
  }

  /* ---------------- News (aggiornamenti, tipo bacheca) ---------------- */

  function aggiungiNews(torneoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    if(!torneo.news) torneo.news = [];
    const post = {
      id: DB.generaId("news"),
      testo: dati.testo.trim(),
      immagine: dati.immagine || null,
      linkVideo: dati.linkVideo || "",
      partitaId: dati.partitaId || null,
      dataCreazione: new Date().toISOString(),
      commenti: []
    };
    torneo.news.unshift(post); // più recente in cima
    salva(torneo);
    return post;
  }

  function eliminaNews(torneoId, newsId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.news = (torneo.news || []).filter(n => n.id !== newsId);
    return salva(torneo);
  }

  function aggiungiCommento(torneoId, newsId, { nome, testo }){
    const torneo = ottieni(torneoId);
    const post = torneo && (torneo.news || []).find(n => n.id === newsId);
    if(!post) return null;
    const commento = {
      id: DB.generaId("commento"), nome: (nome || "Anonimo").trim() || "Anonimo",
      testo: testo.trim(), dataCreazione: new Date().toISOString()
    };
    post.commenti.push(commento);
    salva(torneo);
    return commento;
  }

  function eliminaCommento(torneoId, newsId, commentoId){
    const torneo = ottieni(torneoId);
    const post = torneo && (torneo.news || []).find(n => n.id === newsId);
    if(!post) return false;
    post.commenti = post.commenti.filter(c => c.id !== commentoId);
    return salva(torneo);
  }

  /* Voto "MVP dei tifosi": indicativo, non sostituisce la scelta ufficiale
     dell'organizzatore (partita.mvpGiocatoreId). Un conteggio semplice per
     giocatore, salvato sulla partita stessa. */
  function votaMvpTifosi(torneoId, partitaId, giocatoreId){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;
    if(!partita.votiMvpTifosi) partita.votiMvpTifosi = {};
    partita.votiMvpTifosi[giocatoreId] = (partita.votiMvpTifosi[giocatoreId] || 0) + 1;
    return salva(torneo);
  }

  /* ---------------- Analytics (visualizzazioni) ---------------- */

  function tracciaVisualizzazioneGiocatore(torneoId, giocatoreId){
    const torneo = ottieni(torneoId);
    if(!torneo) return;
    if(!torneo.analytics) torneo.analytics = { visualizzazioniGiocatori: {}, visualizzazioniSquadre: {} };
    torneo.analytics.visualizzazioniGiocatori[giocatoreId] = (torneo.analytics.visualizzazioniGiocatori[giocatoreId] || 0) + 1;
    salva(torneo);
  }

  function tracciaVisualizzazioneSquadra(torneoId, squadraId){
    const torneo = ottieni(torneoId);
    if(!torneo) return;
    if(!torneo.analytics) torneo.analytics = { visualizzazioniGiocatori: {}, visualizzazioniSquadre: {} };
    torneo.analytics.visualizzazioniSquadre[squadraId] = (torneo.analytics.visualizzazioniSquadre[squadraId] || 0) + 1;
    salva(torneo);
  }

  /* ---------------- Giocatori ---------------- */

  function giocatoriSquadra(torneo, squadraId){
    return torneo.giocatori.filter(g => g.squadraId === squadraId);
  }

  function aggiungiGiocatore(torneoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    const giocatore = {
      id: DB.generaId("giocatore"),
      squadraId: dati.squadraId,
      nome: dati.nome.trim(),
      foto: dati.foto || null,
      numeroMaglia: dati.numeroMaglia || "",
      ruolo: dati.ruolo || "",
      dataNascita: dati.dataNascita || "",
      altezza: dati.altezza || "",
      peso: dati.peso || "",
      nazionalita: dati.nazionalita || ""
    };
    torneo.giocatori.push(giocatore);
    salva(torneo);
    return giocatore;
  }

  function aggiornaGiocatore(torneoId, giocatoreId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    const g = torneo.giocatori.find(x => x.id === giocatoreId);
    if(!g) return false;
    Object.assign(g, dati);
    return salva(torneo);
  }

  function eliminaGiocatore(torneoId, giocatoreId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.giocatori = torneo.giocatori.filter(g => g.id !== giocatoreId);
    // rimuove il giocatore anche da formazioni/eventi delle partite già impostate
    torneo.partite.forEach(p => {
      Object.values(p.formazioni || {}).forEach(f => {
        f.titolari = (f.titolari || []).filter(id => id !== giocatoreId);
        f.panchina = (f.panchina || []).filter(id => id !== giocatoreId);
      });
      p.eventi = (p.eventi || []).filter(e =>
        e.giocatoreId !== giocatoreId && e.assistId !== giocatoreId &&
        e.giocatoreEntrataId !== giocatoreId && e.giocatoreUscitaId !== giocatoreId
      );
      if(p.mvpGiocatoreId === giocatoreId) p.mvpGiocatoreId = null;
    });
    return salva(torneo);
  }

  /* ---------------- Partite ---------------- */

  function ottieniPartita(torneo, partitaId){
    return torneo.partite.find(p => p.id === partitaId) || null;
  }

  function aggiungiPartitaManuale(torneoId, dati){
    const torneo = ottieni(torneoId);
    if(!torneo) return null;
    const partita = creaPartitaVuota({
      turno: Number(dati.turno) || 1,
      etichettaTurno: dati.etichettaTurno || `Giornata ${dati.turno || 1}`,
      faseTipo: "libera",
      casaId: dati.casaId,
      trasfertaId: dati.trasfertaId
    });
    torneo.partite.push(partita);
    salva(torneo);
    return partita;
  }

  function creaPartitaVuota({ turno, etichettaTurno, faseTipo, girone, casaId, trasfertaId }){
    return {
      id: DB.generaId("partita"),
      turno, etichettaTurno, faseTipo: faseTipo || "campionato", girone: girone || null,
      casaId: casaId || null, trasfertaId: trasfertaId || null,
      campo: "", arbitro: "", dataOra: null, stato: "programmata",
      golCasa: null, golTrasferta: null,
      rigoriCasa: null, rigoriTrasferta: null,
      formazioni: {}, eventi: [], mvpGiocatoreId: null,
      giocata: false
    };
  }

  function eliminaPartita(torneoId, partitaId){
    const torneo = ottieni(torneoId);
    if(!torneo) return false;
    torneo.partite = torneo.partite.filter(p => p.id !== partitaId);
    return salva(torneo);
  }

  function aggiornaInfoPartita(torneoId, partitaId, { campo, arbitro, dataOra }){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;
    if(campo !== undefined) partita.campo = campo;
    if(arbitro !== undefined) partita.arbitro = arbitro;
    if(dataOra !== undefined) partita.dataOra = dataOra || null;
    return salva(torneo);
  }

  function rinviaPartita(torneoId, partitaId){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;
    partita.stato = "rinviata";
    return salva(torneo);
  }

  function ripristinaProgrammata(torneoId, partitaId){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;
    partita.stato = partita.giocata ? "giocata" : "programmata";
    return salva(torneo);
  }

  function salvaFormazioni(torneoId, partitaId, formazioni){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;
    partita.formazioni = formazioni;
    return salva(torneo);
  }

  function salvaEventiERisultato(torneoId, partitaId, { eventi, golCasaManuale, golTrasfertaManuale, rigoriCasa, rigoriTrasferta, mvpGiocatoreId }){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;

    partita.eventi = eventi || [];

    // Il risultato deriva dagli eventi gol/autogol se ce ne sono;
    // altrimenti si usa il risultato "rapido" inserito manualmente.
    const golDaEventi = Statistiche.calcolaGolDaEventi(partita);
    if(golDaEventi.haEventiGol){
      partita.golCasa = golDaEventi.golCasa;
      partita.golTrasferta = golDaEventi.golTrasferta;
    }else{
      partita.golCasa = golCasaManuale !== undefined ? Number(golCasaManuale) : partita.golCasa;
      partita.golTrasferta = golTrasfertaManuale !== undefined ? Number(golTrasfertaManuale) : partita.golTrasferta;
    }

    partita.rigoriCasa = (rigoriCasa === "" || rigoriCasa === undefined) ? null : Number(rigoriCasa);
    partita.rigoriTrasferta = (rigoriTrasferta === "" || rigoriTrasferta === undefined) ? null : Number(rigoriTrasferta);
    partita.mvpGiocatoreId = mvpGiocatoreId || null;
    partita.giocata = true;
    partita.stato = "giocata";

    salva(torneo);

    // Se il formato lo prevede (es. eliminazione diretta), fa avanzare
    // automaticamente il vincitore al turno successivo.
    Formati.get(torneo.formato).dopoRisultato?.(torneo, partita);
    salva(torneo);

    return true;
  }

  function annullaRisultato(torneoId, partitaId){
    const torneo = ottieni(torneoId);
    const partita = torneo && ottieniPartita(torneo, partitaId);
    if(!partita) return false;
    partita.golCasa = null; partita.golTrasferta = null;
    partita.rigoriCasa = null; partita.rigoriTrasferta = null;
    partita.eventi = []; partita.mvpGiocatoreId = null;
    partita.giocata = false; partita.stato = "programmata";
    return salva(torneo);
  }

  function partiteDaGiocare(torneo){
    return torneo.partite.filter(p => !p.giocata).length;
  }

  return {
    torneiUtente, ottieni, salva, crea, elimina,
    preferitiUtente, isPreferito, toggleFavorito,
    aggiungiSquadra, aggiornaSquadra, eliminaSquadra,
    aggiungiStaff, aggiornaStaff, eliminaStaff,
    aggiungiCampo, aggiornaCampo, eliminaCampo,
    aggiungiNews, eliminaNews, aggiungiCommento, eliminaCommento, votaMvpTifosi,
    tracciaVisualizzazioneGiocatore, tracciaVisualizzazioneSquadra,
    giocatoriSquadra, aggiungiGiocatore, aggiornaGiocatore, eliminaGiocatore,
    ottieniPartita, aggiungiPartitaManuale, creaPartitaVuota, eliminaPartita,
    aggiornaInfoPartita, rinviaPartita, ripristinaProgrammata,
    salvaFormazioni, salvaEventiERisultato, annullaRisultato,
    partiteDaGiocare
  };
})();
