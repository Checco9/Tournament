/* ============================================================
   CORE-AUTH.JS
   Autenticazione vera tramite Supabase (email + password gestite in
   modo sicuro da Supabase, non più salvate/offuscate da noi).

   Mantiene di proposito la stessa "forma" pubblica della versione
   precedente (Auth.utenteCorrente(), Auth.accedi(), ecc.) così il
   resto dell'app non ha dovuto cambiare: dietro le quinte ora parla
   con Supabase invece che con localStorage.

   MODALITÀ OSPITE: rimane locale al dispositivo, senza account reale
   — utile per provare l'app, ma i dati creati in questa modalità non
   sono ancora collegati a Supabase (i tornei restano sul dispositivo
   finché non facciamo il prossimo passo di migrazione dati).
   ============================================================ */

const Auth = (() => {
  let _sessione = null;
  let _ascoltatoriPronti = false;

  const CHIAVE_OSPITE = "trophy_modalita_ospite";

  function traduciErrore(msg){
    const mappa = [
      [/user already registered/i, "Esiste già un account con questa email."],
      [/invalid login credentials/i, "Email o password non corrette."],
      [/password should be at least/i, "La password deve avere almeno 6 caratteri."],
      [/email rate limit|rate limit/i, "Troppi tentativi in poco tempo: riprova tra qualche minuto."],
      [/email not confirmed/i, "Devi confermare l'email prima di accedere: controlla la posta (anche lo spam)."],
      [/unable to validate email address/i, "Indirizzo email non valido."],
      [/network/i, "Problema di connessione: controlla la rete e riprova."]
    ];
    for(const [re, it] of mappa){
      if(re.test(msg)) return it;
    }
    return msg;
  }

  function daUtenteSupabase(utenteSupabase){
    if(!utenteSupabase) return null;
    return {
      id: utenteSupabase.id,
      nome: utenteSupabase.user_metadata?.nome || utenteSupabase.email.split("@")[0],
      email: utenteSupabase.email,
      ospite: false
    };
  }

  async function inizializza(){
    if(localStorage.getItem(CHIAVE_OSPITE) === "1"){
      _sessione = { id: "ospite", nome: "Ospite", ospite: true };
      return _sessione;
    }

    try{
      const { data, error } = await supabaseClient.auth.getSession();
      if(error) console.error("Errore lettura sessione Supabase:", error);
      _sessione = daUtenteSupabase(data?.session?.user || null);
    }catch(err){
      console.error("Impossibile contattare Supabase:", err);
      _sessione = null;
    }

    if(!_ascoltatoriPronti){
      supabaseClient.auth.onAuthStateChange((_evento, sessione) => {
        _sessione = daUtenteSupabase(sessione?.user || null);
      });
      _ascoltatoriPronti = true;
    }

    return _sessione;
  }

  function utenteCorrente(){
    return _sessione;
  }

  async function registra(nome, email, password){
    nome = (nome || "").trim();
    email = (email || "").trim().toLowerCase();

    if(!nome || !email || !password) return { ok: false, errore: "Compila tutti i campi." };
    if(password.length < 6) return { ok: false, errore: "La password deve avere almeno 6 caratteri." };

    const { data, error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { nome } }
    });

    if(error) return { ok: false, errore: traduciErrore(error.message) };

    if(!data.session){
      return { ok: true, richiedeConferma: true };
    }

    _sessione = daUtenteSupabase(data.user);
    return { ok: true, utente: _sessione };
  }

  async function accedi(email, password){
    email = (email || "").trim().toLowerCase();
    if(!email || !password) return { ok: false, errore: "Inserisci email e password." };

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if(error) return { ok: false, errore: traduciErrore(error.message) };

    _sessione = daUtenteSupabase(data.user);
    return { ok: true, utente: _sessione };
  }

  function accediComeOspite(){
    localStorage.setItem(CHIAVE_OSPITE, "1");
    _sessione = { id: "ospite", nome: "Ospite", ospite: true };
  }

  async function esci(){
    if(_sessione?.ospite){
      localStorage.removeItem(CHIAVE_OSPITE);
    }else{
      try{ await supabaseClient.auth.signOut(); }
      catch(err){ console.error("Errore durante il logout:", err); }
    }
    _sessione = null;
  }

  return { inizializza, utenteCorrente, registra, accedi, accediComeOspite, esci };
})();
