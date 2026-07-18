/* ============================================================
   CORE-AUTH.JS
   Login locale: gli account vivono solo nel browser dell'utente.
   ATTENZIONE: password solo offuscata (base64), non è sicurezza
   vera. Da sostituire con verifica lato server quando avrai un
   backend — cambierà solo questo file.
   ============================================================ */

const Auth = (() => {

  function cifraPassword(pw){
    return btoa(unescape(encodeURIComponent(pw)));
  }

  function utenteCorrente(){
    const stato = DB.getState();
    if(stato.sessioneUtenteId === "ospite") return { id: "ospite", nome: "Ospite", ospite: true };
    if(!stato.sessioneUtenteId) return null;
    return stato.utenti.find(u => u.id === stato.sessioneUtenteId) || null;
  }

  function registra(nome, email, password){
    const stato = DB.getState();
    email = email.trim().toLowerCase();
    if(!nome.trim() || !email || !password) return { ok: false, errore: "Compila tutti i campi." };
    if(stato.utenti.some(u => u.email === email)) return { ok: false, errore: "Esiste già un account con questa email su questo dispositivo." };

    const nuovoUtente = { id: DB.generaId("utente"), nome: nome.trim(), email, passwordCifrata: cifraPassword(password) };
    stato.utenti.push(nuovoUtente);
    stato.sessioneUtenteId = nuovoUtente.id;
    DB.setState(stato);
    return { ok: true, utente: nuovoUtente };
  }

  function accedi(email, password){
    const stato = DB.getState();
    email = email.trim().toLowerCase();
    const utente = stato.utenti.find(u => u.email === email);
    if(!utente || utente.passwordCifrata !== cifraPassword(password)) return { ok: false, errore: "Email o password non corrette." };
    stato.sessioneUtenteId = utente.id;
    DB.setState(stato);
    return { ok: true, utente };
  }

  function accediComeOspite(){
    const stato = DB.getState();
    stato.sessioneUtenteId = "ospite";
    DB.setState(stato);
  }

  function esci(){
    const stato = DB.getState();
    stato.sessioneUtenteId = null;
    DB.setState(stato);
  }

  return { utenteCorrente, registra, accedi, accediComeOspite, esci };
})();
