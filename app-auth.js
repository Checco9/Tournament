/* ============================================================
   APP-AUTH.JS
   ============================================================ */

function renderAuth(){
  const card = document.getElementById("auth-card");
  const modo = Stato.authModo;

  card.innerHTML = modo === "login" ? `
    <h2>Accedi</h2>
    <p class="sottotitolo">Bentornato: inserisci le tue credenziali.</p>
    <div id="area-errore"></div>
    <form id="form-auth">
      <div class="campo"><label>Email</label><input type="email" id="input-email" required autocomplete="email"></div>
      <div class="campo"><label>Password</label><input type="password" id="input-password" required autocomplete="current-password"></div>
      <button type="submit" class="btn btn-primario btn-blocco" id="btn-submit-auth">Accedi</button>
    </form>
    <p class="auth-switch">Non hai un account? <button id="switch-auth">Registrati</button></p>
  ` : `
    <h2>Crea account</h2>
    <p class="sottotitolo">Il tuo account funziona su qualsiasi dispositivo — i tornei, per ora, restano salvati su questo (lo stiamo per cambiare).</p>
    <div id="area-errore"></div>
    <form id="form-auth">
      <div class="campo"><label>Nome</label><input type="text" id="input-nome" required autocomplete="name"></div>
      <div class="campo"><label>Email</label><input type="email" id="input-email" required autocomplete="email"></div>
      <div class="campo"><label>Password</label><input type="password" id="input-password" required minlength="6" autocomplete="new-password"></div>
      <button type="submit" class="btn btn-primario btn-blocco" id="btn-submit-auth">Crea account</button>
    </form>
    <p class="auth-switch">Hai già un account? <button id="switch-auth">Accedi</button></p>
  `;

  document.getElementById("switch-auth").addEventListener("click", () => {
    Stato.authModo = modo === "login" ? "registrazione" : "login";
    renderAuth();
  });

  document.getElementById("form-auth").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("input-email").value;
    const password = document.getElementById("input-password").value;
    const bottone = document.getElementById("btn-submit-auth");
    const areaErrore = document.getElementById("area-errore");

    areaErrore.innerHTML = "";
    bottone.disabled = true;
    bottone.textContent = modo === "login" ? "Accesso in corso..." : "Creazione account...";

    const risultato = modo === "login"
      ? await Auth.accedi(email, password)
      : await Auth.registra(document.getElementById("input-nome").value, email, password);

    if(!risultato.ok){
      areaErrore.innerHTML = `<div class="errore-form">${escapeHtml(risultato.errore)}</div>`;
      bottone.disabled = false;
      bottone.textContent = modo === "login" ? "Accedi" : "Crea account";
      return;
    }

    if(risultato.richiedeConferma){
      areaErrore.innerHTML = `<div class="errore-form" style="background:var(--accent-soft); color:var(--accent-dark);">
        Account creato! Controlla la tua email (anche lo spam) e clicca il link di conferma prima di accedere.
      </div>`;
      bottone.disabled = false;
      bottone.textContent = "Crea account";
      return;
    }

    entraNellApp();
  });
}

function entraNellApp(){
  const utente = Auth.utenteCorrente();
  document.getElementById("nome-utente").textContent = utente.ospite ? "Ospite" : utente.nome;
  mostraVista("shell");
  mostraSottoVista("dashboard");
  renderDashboard();
}
