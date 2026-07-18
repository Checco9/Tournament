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
      <div class="campo"><label>Email</label><input type="email" id="input-email" required></div>
      <div class="campo"><label>Password</label><input type="password" id="input-password" required></div>
      <button type="submit" class="btn btn-primario btn-blocco">Accedi</button>
    </form>
    <p class="auth-switch">Non hai un account? <button id="switch-auth">Registrati</button></p>
  ` : `
    <h2>Crea account</h2>
    <p class="sottotitolo">Salvato solo su questo dispositivo, per ora.</p>
    <div id="area-errore"></div>
    <form id="form-auth">
      <div class="campo"><label>Nome</label><input type="text" id="input-nome" required></div>
      <div class="campo"><label>Email</label><input type="email" id="input-email" required></div>
      <div class="campo"><label>Password</label><input type="password" id="input-password" required></div>
      <button type="submit" class="btn btn-primario btn-blocco">Crea account</button>
    </form>
    <p class="auth-switch">Hai già un account? <button id="switch-auth">Accedi</button></p>
  `;

  document.getElementById("switch-auth").addEventListener("click", () => {
    Stato.authModo = modo === "login" ? "registrazione" : "login";
    renderAuth();
  });

  document.getElementById("form-auth").addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("input-email").value;
    const password = document.getElementById("input-password").value;
    const risultato = modo === "login"
      ? Auth.accedi(email, password)
      : Auth.registra(document.getElementById("input-nome").value, email, password);

    if(!risultato.ok){
      document.getElementById("area-errore").innerHTML = `<div class="errore-form">${escapeHtml(risultato.errore)}</div>`;
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
