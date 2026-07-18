/* ============================================================
   FORMATI-REGISTRY.JS
   Ogni formato di torneo (campionato, gironi, eliminazione diretta,
   formula mista...) si registra qui con un'interfaccia comune:

     - label, descrizione
     - opzioniDefault()               -> opzioni iniziali per il wizard
     - generaPartiteIniziali(torneo)  -> array di partite di partenza
     - calcolaVista(torneo)           -> struttura pronta per la UI
     - dopoRisultato(torneo, partita) -> (opzionale) fa avanzare il
                                          torneo quando serve, es. crea
                                          la partita del turno successivo
                                          in un tabellone a eliminazione

   PER AGGIUNGERE UN NUOVO FORMATO IN FUTURO: crea un nuovo file
   formato-nomeformato.js seguendo lo stesso schema di uno di quelli
   esistenti, poi registralo con Formati.registra("chiave", {...}) e
   aggiungi il suo <script> in index.html PRIMA di dati-tornei.js.
   Non serve toccare nessun altro file.
   ============================================================ */

const Formati = (() => {
  const registro = {};

  function registra(chiave, modulo){ registro[chiave] = modulo; }
  function get(chiave){ return registro[chiave]; }
  function elenco(){ return Object.entries(registro).map(([chiave, m]) => ({ chiave, label: m.label, descrizione: m.descrizione })); }

  return { registra, get, elenco };
})();
