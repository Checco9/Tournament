/* ============================================================
   STORAGE.JS
   Unico punto di contatto con localStorage. Tutta l'app legge e
   scrive i dati SOLO attraverso queste funzioni.

   QUANDO AVRAI UN VERO BACKEND: dovrai riscrivere solo questo
   file (sostituendo localStorage con chiamate fetch() a un
   server), il resto dell'app (auth.js, tornei.js, app.js)
   continuerà a funzionare senza modifiche, perché usa solo le
   funzioni esposte qui sotto (DB.getState / DB.setState).
   ============================================================ */

const DB = (() => {
  const CHIAVE = "gestoreTornei_v1";

  function statoIniziale(){
    return {
      utenti: [],           // { id, nome, email, passwordCifrata }
      sessioneUtenteId: null, // id utente loggato, oppure "ospite", oppure null
      tornei: []             // vedi tornei.js per la struttura di un torneo
    };
  }

  function getState(){
    try{
      const grezzo = localStorage.getItem(CHIAVE);
      if(!grezzo) return statoIniziale();
      const dati = JSON.parse(grezzo);
      // protezione minima se la struttura salvata è incompleta/vecchia
      return { ...statoIniziale(), ...dati };
    }catch(err){
      console.error("Errore lettura storage:", err);
      return statoIniziale();
    }
  }

  function setState(stato){
    try{
      localStorage.setItem(CHIAVE, JSON.stringify(stato));
      return true;
    }catch(err){
      console.error("Errore scrittura storage:", err);
      return false;
    }
  }

  function generaId(prefisso){
    return `${prefisso}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return { getState, setState, generaId };
})();
