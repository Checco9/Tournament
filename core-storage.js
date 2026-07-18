/* ============================================================
   CORE-STORAGE.JS
   Unico punto di contatto con localStorage. Quando avrai un vero
   backend, riscrivi solo questo file (fetch API al posto di
   localStorage): tutto il resto dell'app resta invariato perché
   passa sempre da DB.getState()/DB.setState().
   ============================================================ */

const DB = (() => {
  const CHIAVE = "gestoreTornei_v2";

  function statoIniziale(){
    return {
      utenti: [],            // { id, nome, email, passwordCifrata }
      sessioneUtenteId: null,
      preferiti: {},          // { [utenteId]: [torneoId, ...] }
      tornei: []
    };
  }

  function getState(){
    try{
      const grezzo = localStorage.getItem(CHIAVE);
      if(!grezzo) return statoIniziale();
      return { ...statoIniziale(), ...JSON.parse(grezzo) };
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

  return { getState, setState, generaId, CHIAVE };
})();
