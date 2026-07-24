/* ============================================================
   APP-CORE.JS
   Stato dell'interfaccia (non i dati: quelli sono in dati-tornei.js)
   e funzioni di navigazione tra le viste principali.
   ============================================================ */

const Stato = {
  authModo: "login",
  torneoId: null,
  tab: "classifica",
  filtroFaseCalendario: "tutte",
  ricercaDashboard: "",
  wizard: null,
  squadraGiocatori: null,
  vistaGiocatoriTab: "rose",  // "rose" | "staff"
  tabStatistiche: "marcatori",
  modale: { torneoId: null, partitaId: null, eventi: [], formazioni: {} }
};

const RUOLI_SUGGERITI = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

function mostraVista(id){
  document.getElementById("vista-caricamento").style.display = "none";
  document.getElementById("vista-auth").classList.toggle("attiva", id === "auth");
  document.getElementById("shell").classList.toggle("attiva", id === "shell");
}

function mostraSottoVista(nome){
  ["dashboard", "wizard", "torneo", "squadre-globali"].forEach(n => {
    document.getElementById("vista-" + n).classList.toggle("attiva", n === nome);
  });
}

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("btn-ospite").addEventListener("click", () => {
    Auth.accediComeOspite();
    entraNellApp();
  });

  document.getElementById("btn-reset-dati").addEventListener("click", () => {
    if(!confirm("Questo cancella i tornei salvati su questo dispositivo in modalità ospite (non tocca il tuo account, che è gestito separatamente). Continuare?")) return;
    localStorage.removeItem(DB.CHIAVE);
    mostraToast("Dati locali cancellati.");
    setTimeout(() => location.reload(), 500);
  });

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await Auth.esci();
    Stato.authModo = "login";
    mostraVista("auth");
    renderAuth();
  });

  document.getElementById("btn-brand").addEventListener("click", () => {
    mostraSottoVista("dashboard");
    renderDashboard();
  });

  document.getElementById("btn-nuovo-torneo").addEventListener("click", apriWizard);

  document.getElementById("btn-nav-squadre-globali").addEventListener("click", () => {
    if(typeof renderSquadreGlobali === "undefined"){
      mostraToast("Questa pagina non è disponibile: manca il file app-squadre-globali.js.", "errore");
      return;
    }
    mostraSottoVista("squadre-globali");
    renderSquadreGlobali();
  });

  document.querySelectorAll(".tab-torneo").forEach(btn => {
    btn.addEventListener("click", () => {
      Stato.tab = btn.dataset.tab;
      Stato.filtroFaseCalendario = "tutte";
      renderTorneo();
    });
  });

  document.getElementById("btn-torna-dashboard").addEventListener("click", () => {
    mostraSottoVista("dashboard");
    renderDashboard();
  });

  document.getElementById("btn-apri-schermo").addEventListener("click", () => {
    if(typeof apriModalitaSchermo === "undefined"){
      mostraToast("Funzione non disponibile: manca il file app-schermo.js.", "errore");
      return;
    }
    apriModalitaSchermo(Stato.torneoId);
  });
  document.getElementById("btn-apri-schermo-finestra").addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}?schermo=${Stato.torneoId}`;
    window.open(url, "_blank", "noopener");
    mostraToast("Aperta una nuova finestra: spostala sullo schermo/proiettore. Resterà sincronizzata in automatico mentre lavori qui.");
  });
  document.getElementById("btn-chiudi-schermo").addEventListener("click", chiudiModalitaSchermo);

  document.getElementById("chiudi-modale-partita").addEventListener("click", chiudiModalePartita);
  document.getElementById("modale-partita").addEventListener("click", e => {
    if(e.target.id === "modale-partita") chiudiModalePartita();
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape") chiudiModalePartita();
  });

  // Se un'altra finestra/scheda dello stesso browser modifica i dati
  // (es. l'admin segna un gol in un'altra scheda), la modalità schermo
  // aperta qui si aggiorna subito, senza aspettare il prossimo cambio slide.
  window.addEventListener("storage", e => {
    if(e.key !== DB.CHIAVE) return;
    const vistaSchermo = document.getElementById("vista-schermo");
    if(vistaSchermo && vistaSchermo.classList.contains("attiva") && typeof renderSlideSchermo !== "undefined"){
      renderSlideSchermo();
    }
  });

  const parametriUrl = new URLSearchParams(location.search);
  const schermoDaUrl = parametriUrl.get("schermo");

  // L'avvio ora aspetta la risposta di Supabase (c'è una sessione salvata?
  // token ancora valido?) prima di decidere cosa mostrare. Nel frattempo
  // teniamo la schermata di login/caricamento visibile invece di lasciare
  // la pagina vuota per un istante.
  Auth.inizializza().then(utente => {
    if(utente){
      entraNellApp();
      if(schermoDaUrl && typeof apriModalitaSchermo !== "undefined"){
        apriModalitaSchermo(schermoDaUrl);
      }
    }else{
      mostraVista("auth");
      renderAuth();
    }
  }).catch(err => {
    console.error("Errore di avvio:", err);
    mostraVista("auth");
    renderAuth();
    mostraToast("Problema di connessione al server. Riprova tra poco.", "errore");
  });
});
