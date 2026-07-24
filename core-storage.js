/* ============================================================
   CORE-STORAGE.JS
   Punto di contatto con localStorage per i dati che, per ora,
   restano sul dispositivo: tornei, preferiti, squadre globali.

   L'autenticazione (login/registrazione) è passata a Supabase — vedi
   core-auth.js — quindi qui non c'è più bisogno di gestire utenti o
   password. Questo file sparirà quando anche tornei/preferiti/squadre
   globali verranno spostati su Supabase (prossimo passo del piano).
   ============================================================ */

const DB = (() => {
  const CHIAVE = "gestoreTornei_v2";

  function statoIniziale(){
    return {
      preferiti: {},          // { [utenteId]: [torneoId, ...] }
      squadreGlobali: [],     // { id, proprietarioId, nome, logo, colore } — squadre "cross-torneo"
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
