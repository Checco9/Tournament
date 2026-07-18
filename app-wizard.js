/* ============================================================
   APP-WIZARD.JS
   ============================================================ */

const SPORT_SUGGERITI = ["Calcio", "Calcio a 5", "Pallavolo", "Basket", "Altro"];

function apriWizard(){
  Stato.wizard = {
    passo: 1,
    nome: "", sport: "Calcio", sportAltro: "", logo: null,
    coloreprimario: "#1F6F50", coloreSecondario: "#12161C",
    formato: "campionato",
    opzioni: { andataRitorno: false, numeroGironi: 2, qualificatiPerGirone: 2, spareggio: "rigori" },
    puntiVittoria: 3, puntiPareggio: 1, puntiSconfitta: 0,
    numeroTitolari: 11, durataPartitaMinuti: 90, criterioSpareggio: "differenza_reti",
    squadre: ["", ""]
  };
  mostraSottoVista("wizard");
  renderWizard();
}

function renderWizard(){
  const w = Stato.wizard;
  const totalePassi = 5;
  const passiHTML = Array.from({ length: totalePassi }, (_, i) => i + 1).map(n =>
    `<div class="wizard-passo ${n < w.passo ? "fatto" : (n === w.passo ? "attivo" : "")}"></div>`
  ).join("");

  const corpi = { 1: wizardPasso1, 2: wizardPasso2, 3: wizardPasso3, 4: wizardPasso4, 5: wizardPasso5 };
  document.getElementById("wizard-contenuto").innerHTML = `
    <div class="wizard-passi">${passiHTML}</div>
    <div class="wizard-card">${corpi[w.passo](w)}</div>`;

  attachWizardHandlers();
}

function wizardPasso1(w){
  return `
    <h2>Informazioni di base</h2>
    <p class="sottotitolo">Passo 1 di 5</p>
    <div class="campo">
      <label>Nome del torneo</label>
      <input type="text" id="w-nome" value="${escapeHtml(w.nome)}" placeholder="Es. Campionato di classe 2026">
    </div>
    <div class="campo-riga">
      <div class="campo">
        <label>Sport</label>
        <select id="w-sport">
          ${SPORT_SUGGERITI.map(s => `<option value="${s}" ${w.sport === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      ${w.sport === "Altro" ? `<div class="campo"><label>Specifica sport</label><input type="text" id="w-sport-altro" value="${escapeHtml(w.sportAltro)}"></div>` : ""}
    </div>
    <div class="campo">
      <label>Logo del torneo (facoltativo)</label>
      <div class="riga-upload-logo">
        <div class="anteprima-logo">${w.logo ? `<img src="${w.logo}">` : `<i class="fa-solid fa-image"></i>`}</div>
        <input type="file" id="w-logo" accept="image/*">
      </div>
    </div>
    <div class="campo-riga">
      <div class="campo">
        <label>Colore primario</label>
        <input type="color" id="w-colore1" value="${w.coloreprimario}">
      </div>
      <div class="campo">
        <label>Colore secondario</label>
        <input type="color" id="w-colore2" value="${w.coloreSecondario}">
      </div>
    </div>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-annulla">Annulla</button>
      <button class="btn btn-primario" id="w-avanti1">Continua</button>
    </div>`;
}

function wizardPasso2(w){
  const opzioni = Formati.elenco();
  const opzioniSpecifiche = () => {
    if(w.formato === "campionato") return `
      <label class="opzione-inline">
        <input type="checkbox" id="w-andata-ritorno" ${w.opzioni.andataRitorno ? "checked" : ""}>
        <span>Andata e ritorno (ogni squadra incontra le altre due volte)</span>
      </label>`;
    if(w.formato === "gironi" || w.formato === "formula_mista") return `
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Numero gironi</label><input type="number" id="w-numero-gironi" min="2" value="${w.opzioni.numeroGironi}"></div>
        ${w.formato === "formula_mista" ? `<div class="campo"><label style="font-weight:400;">Qualificati per girone</label><input type="number" id="w-qualificati" min="1" value="${w.opzioni.qualificatiPerGirone}"></div>` : ""}
      </div>
      <label class="opzione-inline">
        <input type="checkbox" id="w-andata-ritorno" ${w.opzioni.andataRitorno ? "checked" : ""}>
        <span>Andata e ritorno dentro ogni girone</span>
      </label>
      ${w.formato === "formula_mista" ? spareggioSelectHTML(w) : ""}`;
    if(w.formato === "eliminazione_diretta") return spareggioSelectHTML(w);
    return "";
  };

  return `
    <h2>Formato del torneo</h2>
    <p class="sottotitolo">Passo 2 di 5</p>
    <div class="scelta-formato">
      ${opzioni.map(o => `
        <label class="opzione ${w.formato === o.chiave ? "selezionata" : ""}">
          <input type="radio" name="w-formato" value="${o.chiave}" ${w.formato === o.chiave ? "checked" : ""}>
          <span><strong>${o.label}</strong><br><span>${o.descrizione}</span></span>
        </label>`).join("")}
    </div>
    <div class="campo" id="w-opzioni-formato">${opzioniSpecifiche()}</div>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-indietro2">Indietro</button>
      <button class="btn btn-primario" id="w-avanti2">Continua</button>
    </div>`;
}

function spareggioSelectHTML(w){
  return `
    <div class="campo">
      <label style="font-weight:400;">In caso di pareggio (fase a eliminazione)</label>
      <select id="w-spareggio">
        <option value="rigori" ${w.opzioni.spareggio === "rigori" ? "selected" : ""}>Si tirano i rigori</option>
        <option value="supplementari" ${w.opzioni.spareggio === "supplementari" ? "selected" : ""}>Tempi supplementari, poi rigori</option>
      </select>
    </div>`;
}

function wizardPasso3(w){
  return `
    <h2>Regole del torneo</h2>
    <p class="sottotitolo">Passo 3 di 5</p>
    <div class="campo">
      <label>Punteggio in classifica</label>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Vittoria</label><input type="number" id="w-pv" value="${w.puntiVittoria}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Pareggio</label><input type="number" id="w-pp" value="${w.puntiPareggio}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Sconfitta</label><input type="number" id="w-ps" value="${w.puntiSconfitta}" min="0"></div>
      </div>
    </div>
    <div class="campo-riga">
      <div class="campo"><label>Giocatori titolari per squadra</label><input type="number" id="w-titolari" min="1" value="${w.numeroTitolari}"></div>
      <div class="campo"><label>Durata partita (minuti)</label><input type="number" id="w-durata" min="1" value="${w.durataPartitaMinuti}"></div>
    </div>
    <div class="campo">
      <label>Criterio di spareggio in classifica (a parità di punti)</label>
      <select id="w-criterio-spareggio">
        <option value="differenza_reti" ${w.criterioSpareggio === "differenza_reti" ? "selected" : ""}>Differenza reti</option>
        <option value="gol_fatti" ${w.criterioSpareggio === "gol_fatti" ? "selected" : ""}>Gol fatti</option>
        <option value="scontri_diretti" ${w.criterioSpareggio === "scontri_diretti" ? "selected" : ""}>Scontri diretti</option>
      </select>
    </div>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-indietro3">Indietro</button>
      <button class="btn btn-primario" id="w-avanti3">Continua</button>
    </div>`;
}

function wizardPasso4(w){
  return `
    <h2>Squadre partecipanti</h2>
    <p class="sottotitolo">Passo 4 di 5 — aggiungi almeno due squadre (potrai aggiungerne altre dopo)</p>
    <div class="elenco-squadre-wizard" id="w-elenco-squadre">
      ${w.squadre.map((nome, i) => `
        <div class="riga-squadra-wizard">
          <input type="text" class="w-squadra-input" data-i="${i}" value="${escapeHtml(nome)}" placeholder="Nome squadra ${i + 1}">
          <button type="button" class="w-rimuovi-squadra" data-i="${i}" ${w.squadre.length <= 2 ? "disabled" : ""}><i class="fa-solid fa-xmark"></i></button>
        </div>`).join("")}
    </div>
    <button type="button" class="btn btn-secondario" id="w-aggiungi-squadra"><i class="fa-solid fa-plus"></i> Aggiungi squadra</button>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-indietro4">Indietro</button>
      <button class="btn btn-primario" id="w-avanti4">Continua</button>
    </div>`;
}

function wizardPasso5(w){
  const squadreValide = w.squadre.map(s => s.trim()).filter(Boolean);
  const formatoLabel = Formati.get(w.formato)?.label || w.formato;
  return `
    <h2>Rivedi e crea</h2>
    <p class="sottotitolo">Passo 5 di 5</p>
    <div class="riepilogo-lista">
      <div class="riepilogo-riga"><span>Nome</span><span>${escapeHtml(w.nome) || "—"}</span></div>
      <div class="riepilogo-riga"><span>Sport</span><span>${w.sport === "Altro" ? escapeHtml(w.sportAltro) || "—" : w.sport}</span></div>
      <div class="riepilogo-riga"><span>Formato</span><span>${formatoLabel}</span></div>
      <div class="riepilogo-riga"><span>Squadre</span><span>${squadreValide.length}</span></div>
      <div class="riepilogo-riga"><span>Punti V / P / S</span><span>${w.puntiVittoria} / ${w.puntiPareggio} / ${w.puntiSconfitta}</span></div>
      <div class="riepilogo-riga"><span>Titolari per squadra</span><span>${w.numeroTitolari}</span></div>
    </div>
    <div class="wizard-azioni">
      <button class="btn btn-secondario" id="w-indietro5">Indietro</button>
      <button class="btn btn-primario" id="w-crea">Crea torneo</button>
    </div>`;
}

function attachWizardHandlers(){
  const w = Stato.wizard;

  const annulla = document.getElementById("w-annulla");
  if(annulla) annulla.addEventListener("click", () => { mostraSottoVista("dashboard"); renderDashboard(); });

  // ---- passo 1 ----
  const sportSelect = document.getElementById("w-sport");
  if(sportSelect) sportSelect.addEventListener("change", () => {
    w.nome = document.getElementById("w-nome").value;
    w.sport = sportSelect.value;
    renderWizard();
  });
  const logoInput = document.getElementById("w-logo");
  if(logoInput) logoInput.addEventListener("change", async () => {
    if(!logoInput.files[0]) return;
    w.nome = document.getElementById("w-nome").value;
    try{ w.logo = await leggiImmagineCompressa(logoInput.files[0], 240); }
    catch{ mostraToast("Impossibile caricare l'immagine.", "errore"); }
    renderWizard();
  });
  const avanti1 = document.getElementById("w-avanti1");
  if(avanti1) avanti1.addEventListener("click", () => {
    const nome = document.getElementById("w-nome").value.trim();
    if(!nome){ mostraToast("Dai un nome al torneo prima di continuare.", "errore"); return; }
    w.nome = nome;
    w.sport = document.getElementById("w-sport").value;
    if(w.sport === "Altro") w.sportAltro = document.getElementById("w-sport-altro")?.value || "";
    w.coloreprimario = document.getElementById("w-colore1").value;
    w.coloreSecondario = document.getElementById("w-colore2").value;
    w.passo = 2;
    renderWizard();
  });

  // ---- passo 2 ----
  document.querySelectorAll('input[name="w-formato"]').forEach(el => {
    el.addEventListener("change", () => { w.formato = el.value; renderWizard(); });
  });
  const avanti2 = document.getElementById("w-avanti2");
  if(avanti2) avanti2.addEventListener("click", () => {
    const ar = document.getElementById("w-andata-ritorno");
    if(ar) w.opzioni.andataRitorno = ar.checked;
    const ng = document.getElementById("w-numero-gironi");
    if(ng) w.opzioni.numeroGironi = Math.max(2, Number(ng.value) || 2);
    const q = document.getElementById("w-qualificati");
    if(q) w.opzioni.qualificatiPerGirone = Math.max(1, Number(q.value) || 1);
    const sp = document.getElementById("w-spareggio");
    if(sp) w.opzioni.spareggio = sp.value;
    w.passo = 3;
    renderWizard();
  });
  const indietro2 = document.getElementById("w-indietro2");
  if(indietro2) indietro2.addEventListener("click", () => { w.passo = 1; renderWizard(); });

  // ---- passo 3 ----
  const avanti3 = document.getElementById("w-avanti3");
  if(avanti3) avanti3.addEventListener("click", () => {
    w.puntiVittoria = Number(document.getElementById("w-pv").value) || 0;
    w.puntiPareggio = Number(document.getElementById("w-pp").value) || 0;
    w.puntiSconfitta = Number(document.getElementById("w-ps").value) || 0;
    w.numeroTitolari = Math.max(1, Number(document.getElementById("w-titolari").value) || 11);
    w.durataPartitaMinuti = Math.max(1, Number(document.getElementById("w-durata").value) || 90);
    w.criterioSpareggio = document.getElementById("w-criterio-spareggio").value;
    w.passo = 4;
    renderWizard();
  });
  const indietro3 = document.getElementById("w-indietro3");
  if(indietro3) indietro3.addEventListener("click", () => { w.passo = 2; renderWizard(); });

  // ---- passo 4 ----
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
  const avanti4 = document.getElementById("w-avanti4");
  if(avanti4) avanti4.addEventListener("click", () => {
    const valide = w.squadre.map(s => s.trim()).filter(Boolean);
    if(valide.length < 2){ mostraToast("Servono almeno due squadre.", "errore"); return; }
    w.passo = 5;
    renderWizard();
  });
  const indietro4 = document.getElementById("w-indietro4");
  if(indietro4) indietro4.addEventListener("click", () => { w.passo = 3; renderWizard(); });

  // ---- passo 5 ----
  const indietro5 = document.getElementById("w-indietro5");
  if(indietro5) indietro5.addEventListener("click", () => { w.passo = 4; renderWizard(); });
  const crea = document.getElementById("w-crea");
  if(crea) crea.addEventListener("click", () => {
    const utente = Auth.utenteCorrente();
    const squadreValide = w.squadre.map(s => s.trim()).filter(Boolean);
    const nuovoTorneo = Tornei.crea({
      proprietarioId: utente.id,
      nome: w.nome,
      sport: w.sport === "Altro" ? (w.sportAltro || "Altro") : w.sport,
      logo: w.logo,
      coloreprimario: w.coloreprimario,
      coloreSecondario: w.coloreSecondario,
      formato: w.formato,
      opzioniFormato: { ...Formati.get(w.formato).opzioniDefault(), ...w.opzioni },
      squadreNomi: squadreValide,
      puntiVittoria: w.puntiVittoria, puntiPareggio: w.puntiPareggio, puntiSconfitta: w.puntiSconfitta,
      numeroTitolari: w.numeroTitolari, durataPartitaMinuti: w.durataPartitaMinuti,
      criterioSpareggio: w.criterioSpareggio
    });
    mostraToast("Torneo creato.");
    apriTorneo(nuovoTorneo.id);
  });
}
