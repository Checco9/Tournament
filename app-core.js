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
  tabClassificaIndividuale: "marcatori",
  modale: { torneoId: null, partitaId: null, eventi: [], formazioni: {} }
};

const RUOLI_SUGGERITI = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

function mostraVista(id){
  document.getElementById("vista-auth").classList.toggle("attiva", id === "auth");
  document.getElementById("shell").classList.toggle("attiva", id === "shell");
}

function mostraSottoVista(nome){
  ["dashboard", "wizard", "torneo"].forEach(n => {
    document.getElementById("vista-" + n).classList.toggle("attiva", n === nome);
  });
}

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("btn-ospite").addEventListener("click", () => {
    Auth.accediComeOspite();
    entraNellApp();
  });

  document.getElementById("btn-reset-dati").addEventListener("click", () => {
    if(!confirm("Questo cancella TUTTI gli account e i tornei salvati su questo browser (non è recuperabile). Continuare?")) return;
    localStorage.removeItem(DB.CHIAVE);
    mostraToast("Dati locali cancellati.");
    setTimeout(() => location.reload(), 500);
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    Auth.esci();
    Stato.authModo = "login";
    mostraVista("auth");
    renderAuth();
  });

  document.getElementById("btn-brand").addEventListener("click", () => {
    mostraSottoVista("dashboard");
    renderDashboard();
  });

  document.getElementById("btn-nuovo-torneo").addEventListener("click", apriWizard);

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

  document.getElementById("chiudi-modale-partita").addEventListener("click", chiudiModalePartita);
  document.getElementById("modale-partita").addEventListener("click", e => {
    if(e.target.id === "modale-partita") chiudiModalePartita();
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape") chiudiModalePartita();
  });

  const utente = Auth.utenteCorrente();
  if(utente){
    entraNellApp();
  }else{
    mostraVista("auth");
    renderAuth();
  }
});
