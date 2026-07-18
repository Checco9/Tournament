/* ============================================================
   APP.JS
   Gestisce SOLO l'interfaccia (routing tra viste e rendering).
   I dati vivono in storage.js / auth.js / tornei.js / scheduler.js.
   ============================================================ */

const Stato = {
  authModo: "login",       // "login" | "registrazione"
  torneoId: null,
  tab: "classifica",
  filtroGiornata: null,
  wizard: null,
  modaleTorneoId: null,
  modalePartitaId: null,
  modaleMarcatori: []
};

/* ---------------- helper generici ---------------- */

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function inizialiNome(nome){
  return (nome || "?").trim().split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatoLabel(formato){
  return { semplice: "Solo andata", andata_ritorno: "Andata e ritorno", libero: "Calendario libero" }[formato] || formato;
}

function mostraToast(msg, tipo = "successo"){
  const el = document.createElement("div");
  el.className = "toast" + (tipo === "errore" ? " errore" : "");
  el.textContent = msg;
  document.getElementById("toast-contenitore").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function mostraVista(id){
  document.getElementById("vista-auth").classList.toggle("attiva", id === "auth");
  document.getElementById("shell").classList.toggle("attiva", id === "shell");
}

function mostraSottoVista(nome){
  ["dashboard", "wizard", "torneo"].forEach(n => {
    document.getElementById("vista-" + n).classList.toggle("attiva", n === nome);
  });
}

/* ================================================================
   AUTENTICAZIONE
   ================================================================ */

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

/* ================================================================
   DASHBOARD
   ================================================================ */

function renderDashboard(){
  const utente = Auth.utenteCorrente();
  const tornei = Tornei.torneiUtente(utente.id);
  const contenitore = document.getElementById("lista-tornei");

  const cardNuovo = `
    <div class="card-torneo card-nuovo" id="card-nuovo-torneo">
      <i class="fa-solid fa-plus"></i>
      <span>${tornei.length === 0 ? "Crea il tuo primo torneo" : "Nuovo torneo"}</span>
    </div>`;

  if(tornei.length === 0){
    contenitore.innerHTML = `
      <div class="stato-vuoto" style="grid-column:1/-1;">
        <i class="fa-solid fa-trophy"></i>
        <p>Non hai ancora nessun torneo.<br>Creane uno per iniziare a gestire squadre, calendario e classifica.</p>
      </div>
      ${cardNuovo}`;
  }else{
    contenitore.innerHTML = tornei.map(t => cardTorneoHTML(t)).join("") + cardNuovo;
  }

  contenitore.querySelectorAll(".card-torneo[data-id]").forEach(el => {
    el.addEventListener("click", () => apriTorneo(el.dataset.id));
  });
  document.getElementById("card-nuovo-torneo").addEventListener("click", apriWizard);
}

function cardTorneoHTML(t){
  const classifica = Tornei.calcolaClassifica(t);
  const capolista = classifica[0];
  const daGiocare = Tornei.partiteDaGiocare(t);
  return `
    <div class="card-torneo" data-id="${t.id}">
      <div class="card-torneo-testata">
        <h3>${escapeHtml(t.nome)}</h3>
        <span class="pillola">${formatoLabel(t.formato)}</span>
      </div>
      <div class="card-torneo-stats">
        <div><b>${t.squadre.length}</b>squadre</div>
        <div><b>${daGiocare}</b>da giocare</div>
        <div><b>${capolista && capolista.punti > 0 ? escapeHtml(capolista.nome) : "—"}</b>in testa</div>
      </div>
    </div>`;
}

/* ================================================================
   WIZARD CREAZIONE TORNEO
   ================================================================ */

function apriWizard(){
  Stato.wizard = {
    passo: 1,
    nome: "",
    formato: "semplice",
    puntiVittoria: 3, puntiPareggio: 1, puntiSconfitta: 0,
    squadre: ["", ""]
  };
  mostraSottoVista("wizard");
  renderWizard();
}

function renderWizard(){
  const w = Stato.wizard;
  const passiHTML = [1, 2, 3].map(n =>
    `<div class="wizard-passo ${n < w.passo ? "fatto" : (n === w.passo ? "attivo" : "")}"></div>`
  ).join("");

  let corpo;
  if(w.passo === 1) corpo = wizardPasso1HTML(w);
  else if(w.passo === 2) corpo = wizardPasso2HTML(w);
  else corpo = wizardPasso3HTML(w);

  document.getElementById("wizard-contenuto").innerHTML = `
    <div class="wizard-passi">${passiHTML}</div>
    <div class="wizard-card">${corpo}</div>`;

  attachWizardHandlers();
}

function wizardPasso1HTML(w){
  const opzioni = [
    ["semplice", "Girone all'italiana — solo andata", "Ogni squadra incontra tutte le altre una volta. Calendario generato in automatico."],
    ["andata_ritorno", "Andata e ritorno", "Ogni squadra incontra tutte le altre due volte. Calendario generato in automatico."],
    ["libero", "Calendario libero", "Aggiungi tu le partite quando vuoi, nell'ordine che preferisci."]
  ];
  return `
    <h2>Crea un nuovo torneo</h2>
    <p class="sottotitolo">Passo 1 di 3 — informazioni di base</p>
    <div class="campo">
      <label>Nome del torneo</label>
      <input type="text" id="w-nome" value="${escapeHtml(w.nome)}" placeholder="Es. Campionato di classe 2026">
    </div>
    <div class="campo">
      <label>Formato calendario</label>
      <div class="scelta-formato">
        ${opzioni.map(([val, titolo, desc]) => `
          <label class="opzione ${w.formato === val ? "selezionata" : ""}">
            <input type="radio" name="w-formato" value="${val}" ${w.formato === val ? "checked" : ""}>
            <span><strong>${titolo}</strong><br><span>${desc}</span></span>
          </label>`).join("")}
      </div>
    </div>
    <div class="campo">
      <label>Punteggio</label>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Vittoria</label><input type="number" id="w-pv" value="${w.puntiVittoria}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Pareggio</label><input type="number" id="w-pp" value="${w.puntiPareggio}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Sconfitta</label><input type="number" id="w-ps" value="${w.puntiSconfitta}" min="0"></div>
      </div>
    </div>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-annulla">Annulla</button>
      <button class="btn btn-primario" id="w-avanti1">Continua</button>
    </div>`;
}

function wizardPasso2HTML(w){
  return `
    <h2>Squadre partecipanti</h2>
    <p class="sottotitolo">Passo 2 di 3 — aggiungi almeno due squadre</p>
    <div class="elenco-squadre-wizard" id="w-elenco-squadre">
      ${w.squadre.map((nome, i) => `
        <div class="riga-squadra-wizard">
          <input type="text" class="w-squadra-input" data-i="${i}" value="${escapeHtml(nome)}" placeholder="Nome squadra ${i + 1}">
          <button type="button" class="w-rimuovi-squadra" data-i="${i}" ${w.squadre.length <= 2 ? "disabled" : ""}><i class="fa-solid fa-xmark"></i></button>
        </div>`).join("")}
    </div>
    <button type="button" class="btn btn-secondario" id="w-aggiungi-squadra"><i class="fa-solid fa-plus"></i> Aggiungi squadra</button>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-indietro2">Indietro</button>
      <button class="btn btn-primario" id="w-avanti2">Continua</button>
    </div>`;
}

function wizardPasso3HTML(w){
  const squadreValide = w.squadre.map(s => s.trim()).filter(Boolean);
  const n = squadreValide.length;
  const moltiplicatore = w.formato === "andata_ritorno" ? 2 : 1;
  const numeroPartite = n >= 2 ? (n * (n - 1) / 2) * moltiplicatore : 0;

  return `
    <h2>Rivedi e crea</h2>
    <p class="sottotitolo">Passo 3 di 3 — controlla i dati prima di creare il torneo</p>
    <div class="riepilogo-lista">
      <div class="riepilogo-riga"><span>Nome</span><span>${escapeHtml(w.nome) || "—"}</span></div>
      <div class="riepilogo-riga"><span>Formato</span><span>${formatoLabel(w.formato)}</span></div>
      <div class="riepilogo-riga"><span>Squadre</span><span>${n}</span></div>
      <div class="riepilogo-riga"><span>Punti V / P / S</span><span>${w.puntiVittoria} / ${w.puntiPareggio} / ${w.puntiSconfitta}</span></div>
      <div class="riepilogo-riga"><span>Partite</span><span>${w.formato === "libero" ? "le aggiungi tu quando vuoi" : numeroPartite + " generate automaticamente"}</span></div>
    </div>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-indietro3">Indietro</button>
      <button class="btn btn-primario" id="w-crea">Crea torneo</button>
    </div>`;
}

function attachWizardHandlers(){
  const w = Stato.wizard;

  const annulla = document.getElementById("w-annulla");
  if(annulla) annulla.addEventListener("click", () => { mostraSottoVista("dashboard"); renderDashboard(); });

  document.querySelectorAll('input[name="w-formato"]').forEach(el => {
    el.addEventListener("change", () => {
      const nomeEl = document.getElementById("w-nome");
      if(nomeEl) w.nome = nomeEl.value;
      w.formato = el.value;
      renderWizard();
    });
  });

  const avanti1 = document.getElementById("w-avanti1");
  if(avanti1) avanti1.addEventListener("click", () => {
    const nome = document.getElementById("w-nome").value.trim();
    if(!nome){ mostraToast("Dai un nome al torneo prima di continuare.", "errore"); return; }
    w.nome = nome;
    w.puntiVittoria = Number(document.getElementById("w-pv").value) || 0;
    w.puntiPareggio = Number(document.getElementById("w-pp").value) || 0;
    w.puntiSconfitta = Number(document.getElementById("w-ps").value) || 0;
    w.passo = 2;
    renderWizard();
  });

  document.querySelectorAll(".w-squadra-input").forEach(el => {
    el.addEventListener("input", () => { w.squadre[Number(el.dataset.i)] = el.value; });
  });
  document.querySelectorAll(".w-rimuovi-squadra").forEach(el => {
    el.addEventListener("click", () => {
      if(w.squadre.length <= 2) return;
      w.squadre.splice(Number(el.dataset.i), 1);
      renderWizard();
    });
  });
  const aggiungiSquadra = document.getElementById("w-aggiungi-squadra");
  if(aggiungiSquadra) aggiungiSquadra.addEventListener("click", () => { w.squadre.push(""); renderWizard(); });

  const indietro2 = document.getElementById("w-indietro2");
  if(indietro2) indietro2.addEventListener("click", () => { w.passo = 1; renderWizard(); });

  const avanti2 = document.getElementById("w-avanti2");
  if(avanti2) avanti2.addEventListener("click", () => {
    const valide = w.squadre.map(s => s.trim()).filter(Boolean);
    if(valide.length < 2){ mostraToast("Servono almeno due squadre.", "errore"); return; }
    w.passo = 3;
    renderWizard();
  });

  const indietro3 = document.getElementById("w-indietro3");
  if(indietro3) indietro3.addEventListener("click", () => { w.passo = 2; renderWizard(); });

  const crea = document.getElementById("w-crea");
  if(crea) crea.addEventListener("click", () => {
    const utente = Auth.utenteCorrente();
    const squadreValide = w.squadre.map(s => s.trim()).filter(Boolean);
    const nuovoTorneo = Tornei.crea({
      proprietarioId: utente.id,
      nome: w.nome,
      formato: w.formato,
      squadreNomi: squadreValide,
      generaAutomatico: w.formato !== "libero",
      puntiVittoria: w.puntiVittoria,
      puntiPareggio: w.puntiPareggio,
      puntiSconfitta: w.puntiSconfitta
    });
    mostraToast("Torneo creato.");
    apriTorneo(nuovoTorneo.id);
  });
}

/* ================================================================
   GESTIONE TORNEO
   ================================================================ */

function apriTorneo(id){
  Stato.torneoId = id;
  Stato.tab = "classifica";
  Stato.filtroGiornata = null;
  mostraSottoVista("torneo");
  renderTorneo();
}

function renderTorneo(){
  const torneo = Tornei.ottieni(Stato.torneoId);
  if(!torneo){
    mostraToast("Torneo non trovato.", "errore");
    mostraSottoVista("dashboard");
    renderDashboard();
    return;
  }
  document.getElementById("torneo-sidebar-titolo").textContent = torneo.nome;
  document.querySelectorAll(".tab-torneo").forEach(b => b.classList.toggle("attivo", b.dataset.tab === Stato.tab));
  renderTabTorneo(torneo);
}

function renderTabTorneo(torneo){
  const cont = document.getElementById("torneo-contenuto");
  if(Stato.tab === "classifica"){
    cont.innerHTML = renderClassificaHTML(torneo);
  }else if(Stato.tab === "calendario"){
    cont.innerHTML = renderCalendarioHTML(torneo);
    attachCalendarioHandlers(torneo);
  }else if(Stato.tab === "squadre"){
    cont.innerHTML = renderSquadreHTML(torneo);
    attachSquadreHandlers(torneo);
  }else if(Stato.tab === "statistiche"){
    cont.innerHTML = renderStatisticheHTML(torneo);
  }else if(Stato.tab === "impostazioni"){
    cont.innerHTML = renderImpostazioniHTML(torneo);
    attachImpostazioniHandlers(torneo);
  }
}

/* ---------------- Classifica ---------------- */

function renderClassificaHTML(torneo){
  const classifica = Tornei.calcolaClassifica(torneo);
  if(classifica.length === 0){
    return `<div class="pannello-testata"><h2>Classifica</h2></div>
      <div class="stato-vuoto"><i class="fa-solid fa-ranking-star"></i><p>Aggiungi squadre nella sezione "Squadre" per vedere la classifica.</p></div>`;
  }
  const righe = classifica.map((r, i) => `
    <tr>
      <td class="cella-nome"><span class="pos-medaglia ${i === 0 && r.punti > 0 ? "oro" : ""}">${i + 1}</span>${escapeHtml(r.nome)}</td>
      <td class="num">${r.giocate}</td>
      <td class="num">${r.vinte}</td>
      <td class="num">${r.pareggi}</td>
      <td class="num">${r.perse}</td>
      <td class="num">${r.golFatti}</td>
      <td class="num">${r.golSubiti}</td>
      <td class="num">${r.dr > 0 ? "+" + r.dr : r.dr}</td>
      <td class="num" style="font-weight:700;">${r.punti}</td>
    </tr>`).join("");

  return `
    <div class="pannello-testata"><h2>Classifica</h2></div>
    <div style="overflow-x:auto;">
      <table class="tabella-dati">
        <thead><tr>
          <th>Squadra</th><th class="num">G</th><th class="num">V</th><th class="num">P</th><th class="num">S</th>
          <th class="num">GF</th><th class="num">GS</th><th class="num">DR</th><th class="num">PT</th>
        </tr></thead>
        <tbody>${righe}</tbody>
      </table>
    </div>`;
}

/* ---------------- Calendario ---------------- */

function renderCalendarioHTML(torneo){
  const giornate = [...new Set(torneo.partite.map(p => p.giornata))].sort((a, b) => a - b);
  const chips = `<div class="chip-giornata ${Stato.filtroGiornata === null ? "attivo" : ""}" data-g="tutte">Tutte</div>` +
    giornate.map(g => `<div class="chip-giornata ${Stato.filtroGiornata === g ? "attivo" : ""}" data-g="${g}">G${g}</div>`).join("");

  const partite = [...torneo.partite]
    .filter(p => Stato.filtroGiornata === null || p.giornata === Stato.filtroGiornata)
    .sort((a, b) => a.giornata - b.giornata);

  const righe = partite.map(p => {
    const casa = torneo.squadre.find(s => s.id === p.casaId);
    const trasferta = torneo.squadre.find(s => s.id === p.trasfertaId);
    const risultato = p.giocata
      ? `<span class="risultato">${p.golCasa} - ${p.golTrasferta}</span>`
      : `<span class="risultato da-giocare">vs</span>`;
    return `
      <div class="riga-partita" data-id="${p.id}">
        <span class="giornata-tag">Giornata ${p.giornata}</span>
        <div class="squadre">
          <span class="nome-squadra">${casa ? escapeHtml(casa.nome) : "—"}</span>
          ${risultato}
          <span class="nome-squadra trasferta">${trasferta ? escapeHtml(trasferta.nome) : "—"}</span>
        </div>
        <button class="elimina-partita" data-id="${p.id}" title="Elimina partita"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }).join("");

  const opzioniSquadre = torneo.squadre.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join("");
  const prossimaGiornata = torneo.partite.reduce((m, p) => Math.max(m, p.giornata), 0) + 1;

  const formAggiungi = torneo.squadre.length >= 2 ? `
    <div class="aggiungi-partita-manuale">
      <label>Aggiungi partita al calendario</label>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Giornata</label><input type="number" id="cal-giornata" min="1" value="${prossimaGiornata}"></div>
        <div class="campo"><label style="font-weight:400;">Casa</label><select id="cal-casa">${opzioniSquadre}</select></div>
        <div class="campo"><label style="font-weight:400;">Trasferta</label><select id="cal-trasferta">${opzioniSquadre}</select></div>
      </div>
      <button class="btn btn-secondario" id="cal-aggiungi-btn"><i class="fa-solid fa-plus"></i> Aggiungi</button>
    </div>` : `<p style="color:var(--ink-faint); font-size:0.85rem;">Aggiungi almeno due squadre per poter creare partite.</p>`;

  return `
    <div class="pannello-testata"><h2>Calendario</h2></div>
    ${giornate.length > 0 ? `<div class="filtro-giornate">${chips}</div>` : ""}
    <div class="elenco-partite">
      ${righe || `<div class="stato-vuoto"><i class="fa-solid fa-calendar-days"></i><p>Nessuna partita in calendario ancora.</p></div>`}
    </div>
    ${formAggiungi}`;
}

function attachCalendarioHandlers(torneo){
  document.querySelectorAll(".chip-giornata").forEach(el => {
    el.addEventListener("click", () => {
      Stato.filtroGiornata = el.dataset.g === "tutte" ? null : Number(el.dataset.g);
      renderTorneo();
    });
  });

  document.querySelectorAll(".riga-partita").forEach(el => {
    el.addEventListener("click", () => apriModaleRisultato(torneo.id, el.dataset.id));
  });

  document.querySelectorAll(".elimina-partita").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      if(!confirm("Eliminare questa partita dal calendario?")) return;
      Tornei.eliminaPartita(torneo.id, el.dataset.id);
      renderTorneo();
      mostraToast("Partita eliminata.");
    });
  });

  const btnAggiungi = document.getElementById("cal-aggiungi-btn");
  if(btnAggiungi) btnAggiungi.addEventListener("click", () => {
    const giornata = document.getElementById("cal-giornata").value;
    const casaId = document.getElementById("cal-casa").value;
    const trasfertaId = document.getElementById("cal-trasferta").value;
    if(casaId === trasfertaId){ mostraToast("Le due squadre devono essere diverse.", "errore"); return; }
    Tornei.aggiungiPartitaManuale(torneo.id, { giornata, casaId, trasfertaId });
    renderTorneo();
    mostraToast("Partita aggiunta al calendario.");
  });
}

/* ---------------- Squadre ---------------- */

function renderSquadreHTML(torneo){
  const cards = torneo.squadre.map(s => `
    <div class="card-squadra">
      <div class="iniziale-squadra">${inizialiNome(s.nome)}</div>
      <div class="nome-e-azioni">
        <div class="nome-squadra-testo">${escapeHtml(s.nome)}</div>
        <div class="azioni-squadra">
          <button class="rinomina-squadra" data-id="${s.id}">Rinomina</button>
          <button class="elimina-squadra" data-id="${s.id}">Elimina</button>
        </div>
      </div>
    </div>`).join("");

  return `
    <div class="pannello-testata"><h2>Squadre</h2></div>
    <div class="form-aggiungi-squadra">
      <input type="text" id="nuova-squadra-nome" placeholder="Nome nuova squadra">
      <button class="btn btn-primario" id="btn-aggiungi-squadra-torneo"><i class="fa-solid fa-plus"></i></button>
    </div>
    <div class="griglia-squadre">
      ${cards || `<p style="color:var(--ink-faint); grid-column:1/-1;">Nessuna squadra ancora.</p>`}
    </div>`;
}

function attachSquadreHandlers(torneo){
  document.getElementById("btn-aggiungi-squadra-torneo").addEventListener("click", () => {
    const input = document.getElementById("nuova-squadra-nome");
    const nome = input.value.trim();
    if(!nome){ mostraToast("Inserisci un nome squadra.", "errore"); return; }
    Tornei.aggiungiSquadra(torneo.id, nome);
    renderTorneo();
    mostraToast("Squadra aggiunta.");
  });

  document.querySelectorAll(".rinomina-squadra").forEach(el => {
    el.addEventListener("click", () => {
      const squadra = torneo.squadre.find(s => s.id === el.dataset.id);
      const nuovoNome = prompt("Nuovo nome squadra:", squadra ? squadra.nome : "");
      if(nuovoNome && nuovoNome.trim()){
        Tornei.rinominaSquadra(torneo.id, el.dataset.id, nuovoNome.trim());
        renderTorneo();
      }
    });
  });

  document.querySelectorAll(".elimina-squadra").forEach(el => {
    el.addEventListener("click", () => {
      if(!confirm("Eliminare questa squadra? Verranno rimosse anche le partite collegate.")) return;
      Tornei.eliminaSquadra(torneo.id, el.dataset.id);
      renderTorneo();
      mostraToast("Squadra eliminata.");
    });
  });
}

/* ---------------- Statistiche ---------------- */

function renderStatisticheHTML(torneo){
  const marcatori = Tornei.calcolaMarcatori(torneo);
  const righe = marcatori.map(m => `
    <div class="stat-riga-app">
      <span><span class="nome">${escapeHtml(m.nome)}</span><span class="squadra">${escapeHtml(m.squadra)}</span></span>
      <span class="valore">${m.gol} gol</span>
    </div>`).join("");

  return `
    <div class="pannello-testata"><h2>Statistiche — Marcatori</h2></div>
    ${righe || `<div class="stato-vuoto"><i class="fa-solid fa-futbol"></i><p>Nessun marcatore registrato. Aggiungili quando inserisci i risultati delle partite.</p></div>`}`;
}

/* ---------------- Impostazioni ---------------- */

function renderImpostazioniHTML(torneo){
  return `
    <div class="pannello-testata"><h2>Impostazioni</h2></div>
    <div class="blocco-impostazioni">
      <h3>Nome torneo</h3>
      <p class="sottotitolo">Visibile in dashboard e nel pannello.</p>
      <div class="campo"><input type="text" id="imp-nome" value="${escapeHtml(torneo.nome)}"></div>
      <button class="btn btn-secondario" id="imp-salva-nome">Salva nome</button>
    </div>
    <div class="blocco-impostazioni">
      <h3>Punteggio</h3>
      <p class="sottotitolo">Applicato subito al ricalcolo della classifica.</p>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Vittoria</label><input type="number" id="imp-pv" value="${torneo.puntiVittoria}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Pareggio</label><input type="number" id="imp-pp" value="${torneo.puntiPareggio}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Sconfitta</label><input type="number" id="imp-ps" value="${torneo.puntiSconfitta}" min="0"></div>
      </div>
      <button class="btn btn-secondario" id="imp-salva-punti">Salva punteggio</button>
    </div>
    <div class="blocco-impostazioni zona-pericolo">
      <h3>Elimina torneo</h3>
      <p class="sottotitolo">Azione permanente: squadre, calendario e risultati andranno persi.</p>
      <button class="btn btn-pericolo" id="imp-elimina-torneo"><i class="fa-solid fa-trash"></i> Elimina questo torneo</button>
    </div>`;
}

function attachImpostazioniHandlers(torneo){
  document.getElementById("imp-salva-nome").addEventListener("click", () => {
    const nome = document.getElementById("imp-nome").value.trim();
    if(!nome){ mostraToast("Il nome non può essere vuoto.", "errore"); return; }
    torneo.nome = nome;
    Tornei.salva(torneo);
    renderTorneo();
    mostraToast("Nome aggiornato.");
  });

  document.getElementById("imp-salva-punti").addEventListener("click", () => {
    torneo.puntiVittoria = Number(document.getElementById("imp-pv").value) || 0;
    torneo.puntiPareggio = Number(document.getElementById("imp-pp").value) || 0;
    torneo.puntiSconfitta = Number(document.getElementById("imp-ps").value) || 0;
    Tornei.salva(torneo);
    mostraToast("Punteggio aggiornato: la classifica è stata ricalcolata.");
  });

  document.getElementById("imp-elimina-torneo").addEventListener("click", () => {
    if(!confirm(`Eliminare definitivamente "${torneo.nome}"?`)) return;
    Tornei.elimina(torneo.id);
    mostraSottoVista("dashboard");
    renderDashboard();
    mostraToast("Torneo eliminato.");
  });
}

/* ================================================================
   MODALE: inserisci risultato partita
   ================================================================ */

function apriModaleRisultato(torneoId, partitaId){
  const torneo = Tornei.ottieni(torneoId);
  const partita = torneo.partite.find(p => p.id === partitaId);
  if(!torneo || !partita) return;

  Stato.modaleTorneoId = torneoId;
  Stato.modalePartitaId = partitaId;
  Stato.modaleMarcatori = (partita.marcatori || []).map(m => ({ ...m }));

  renderModaleRisultato(torneo, partita);
  document.getElementById("modale-risultato").classList.add("mostra");
}

function chiudiModaleRisultato(){
  document.getElementById("modale-risultato").classList.remove("mostra");
}

function renderModaleRisultato(torneo, partita){
  const casa = torneo.squadre.find(s => s.id === partita.casaId);
  const trasferta = torneo.squadre.find(s => s.id === partita.trasfertaId);

  document.getElementById("modale-risultato-contenuto").innerHTML = `
    <h2>Giornata ${partita.giornata} — Risultato</h2>
    <div class="risultato-input-riga">
      <span class="nome-squadra-modale">${casa ? escapeHtml(casa.nome) : "—"}</span>
      <input type="number" id="mod-gol-casa" min="0" value="${partita.golCasa ?? 0}">
      <span style="color:var(--ink-faint);">–</span>
      <input type="number" id="mod-gol-trasferta" min="0" value="${partita.golTrasferta ?? 0}">
      <span class="nome-squadra-modale">${trasferta ? escapeHtml(trasferta.nome) : "—"}</span>
    </div>
    <div class="marcatori-modale">
      <h4>Marcatori (facoltativo)</h4>
      <div id="mod-marcatori-lista"></div>
      <button type="button" id="aggiungi-marcatore"><i class="fa-solid fa-plus"></i> Aggiungi marcatore</button>
    </div>
    <div class="modale-azioni">
      ${partita.giocata ? `<button class="btn btn-secondario" id="mod-annulla-risultato">Annulla risultato</button>` : ""}
      <button class="btn btn-primario btn-blocco" id="mod-salva-risultato">Salva risultato</button>
    </div>`;

  renderMarcatoriListaModale(torneo);

  document.getElementById("aggiungi-marcatore").addEventListener("click", () => {
    Stato.modaleMarcatori.push({ nome: "", squadraId: torneo.squadre[0]?.id || "", gol: 1 });
    renderMarcatoriListaModale(torneo);
  });

  const btnAnnulla = document.getElementById("mod-annulla-risultato");
  if(btnAnnulla) btnAnnulla.addEventListener("click", () => {
    if(!confirm("Annullare il risultato di questa partita?")) return;
    Tornei.annullaRisultato(torneo.id, partita.id);
    chiudiModaleRisultato();
    renderTorneo();
    mostraToast("Risultato annullato.");
  });

  document.getElementById("mod-salva-risultato").addEventListener("click", () => {
    const golCasa = document.getElementById("mod-gol-casa").value;
    const golTrasferta = document.getElementById("mod-gol-trasferta").value;
    if(golCasa === "" || golTrasferta === ""){
      mostraToast("Inserisci il risultato di entrambe le squadre.", "errore");
      return;
    }
    const marcatoriValidi = Stato.modaleMarcatori.filter(m => m.nome && m.nome.trim());
    Tornei.registraRisultato(torneo.id, partita.id, { golCasa, golTrasferta, marcatori: marcatoriValidi });
    chiudiModaleRisultato();
    renderTorneo();
    mostraToast("Risultato salvato: classifica e statistiche aggiornate.");
  });
}

function renderMarcatoriListaModale(torneo){
  const lista = document.getElementById("mod-marcatori-lista");
  lista.innerHTML = Stato.modaleMarcatori.map((m, i) => `
    <div class="riga-marcatore" data-i="${i}">
      <input type="text" class="mk-nome" data-i="${i}" placeholder="Nome giocatore" value="${escapeHtml(m.nome || "")}">
      <select class="mk-squadra" data-i="${i}">
        ${torneo.squadre.map(s => `<option value="${s.id}" ${s.id === m.squadraId ? "selected" : ""}>${escapeHtml(s.nome)}</option>`).join("")}
      </select>
      <input type="number" class="mk-gol" data-i="${i}" min="1" value="${m.gol || 1}">
      <button type="button" class="mk-rimuovi" data-i="${i}"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join("");

  lista.querySelectorAll(".mk-nome").forEach(el => {
    el.addEventListener("input", () => { Stato.modaleMarcatori[Number(el.dataset.i)].nome = el.value; });
  });
  lista.querySelectorAll(".mk-squadra").forEach(el => {
    el.addEventListener("change", () => { Stato.modaleMarcatori[Number(el.dataset.i)].squadraId = el.value; });
  });
  lista.querySelectorAll(".mk-gol").forEach(el => {
    el.addEventListener("input", () => { Stato.modaleMarcatori[Number(el.dataset.i)].gol = el.value; });
  });
  lista.querySelectorAll(".mk-rimuovi").forEach(el => {
    el.addEventListener("click", () => {
      Stato.modaleMarcatori.splice(Number(el.dataset.i), 1);
      renderMarcatoriListaModale(torneo);
    });
  });
}

/* ================================================================
   INIZIALIZZAZIONE
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("btn-ospite").addEventListener("click", () => {
    Auth.accediComeOspite();
    entraNellApp();
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
      Stato.filtroGiornata = null;
      renderTorneo();
    });
  });

  document.getElementById("btn-torna-dashboard").addEventListener("click", () => {
    mostraSottoVista("dashboard");
    renderDashboard();
  });

  document.getElementById("chiudi-modale-risultato").addEventListener("click", chiudiModaleRisultato);
  document.getElementById("modale-risultato").addEventListener("click", e => {
    if(e.target.id === "modale-risultato") chiudiModaleRisultato();
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape") chiudiModaleRisultato();
  });

  const utente = Auth.utenteCorrente();
  if(utente){
    entraNellApp();
  }else{
    mostraVista("auth");
    renderAuth();
  }
});
