/* ============================================================
   APP-SQUADRE.JS
   Tab "Squadre" (logo, colore, allenatore) e tab "Giocatori"
   (anagrafica completa + scheda con statistiche calcolate).
   ============================================================ */

/* ---------------- Squadre ---------------- */

function renderSquadreHTML(torneo){
  const cards = torneo.squadre.map(s => `
    <div class="card-squadra-estesa" data-id="${s.id}" style="--colore-squadra:${s.colore}">
      <div class="riga-logo-nome">
        <label class="anteprima-logo-piccola">
          ${s.logo ? `<img src="${s.logo}">` : `<span>${inizialiNome(s.nome)}</span>`}
          <input type="file" accept="image/*" class="input-logo-squadra" data-id="${s.id}" hidden>
        </label>
        <input type="text" class="input-nome-squadra" data-id="${s.id}" value="${escapeHtml(s.nome)}">
      </div>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Colore</label><input type="color" class="input-colore-squadra" data-id="${s.id}" value="${s.colore}"></div>
        <div class="campo"><label style="font-weight:400;">Allenatore</label><input type="text" class="input-allenatore-squadra" data-id="${s.id}" value="${escapeHtml(s.allenatore)}" placeholder="Nome allenatore"></div>
      </div>
      <div class="riga-azioni-squadra">
        <span class="conteggio-rosa">${Tornei.giocatoriSquadra(torneo, s.id).length} giocatori in rosa</span>
        <button class="btn-testo elimina-squadra" data-id="${s.id}"><i class="fa-solid fa-trash"></i> Elimina</button>
      </div>
    </div>`).join("");

  return `
    <div class="pannello-testata"><h2>Squadre</h2></div>
    <div class="form-aggiungi-squadra">
      <input type="text" id="nuova-squadra-nome" placeholder="Nome nuova squadra">
      <button class="btn btn-primario" id="btn-aggiungi-squadra-torneo"><i class="fa-solid fa-plus"></i></button>
    </div>
    <div class="griglia-squadre-estesa">
      ${cards || `<p style="color:var(--ink-faint);">Nessuna squadra ancora.</p>`}
    </div>`;
}

function attachSquadreHandlers(torneo){
  document.getElementById("btn-aggiungi-squadra-torneo").addEventListener("click", () => {
    const input = document.getElementById("nuova-squadra-nome");
    const nome = input.value.trim();
    if(!nome){ mostraToast("Inserisci un nome squadra.", "errore"); return; }
    Tornei.aggiungiSquadra(torneo.id, { nome });
    renderTorneo();
    mostraToast("Squadra aggiunta.");
  });

  document.querySelectorAll(".input-logo-squadra").forEach(el => {
    el.addEventListener("change", async () => {
      if(!el.files[0]) return;
      try{
        const logo = await leggiImmagineCompressa(el.files[0], 200);
        Tornei.aggiornaSquadra(torneo.id, el.dataset.id, { logo });
        renderTorneo();
      }catch{ mostraToast("Impossibile caricare l'immagine.", "errore"); }
    });
  });
  document.querySelectorAll(".anteprima-logo-piccola").forEach(el => {
    el.addEventListener("click", e => { e.preventDefault(); el.querySelector("input[type=file]").click(); });
  });
  document.querySelectorAll(".input-nome-squadra").forEach(el => {
    el.addEventListener("blur", () => {
      if(el.value.trim()) Tornei.aggiornaSquadra(torneo.id, el.dataset.id, { nome: el.value.trim() });
    });
  });
  document.querySelectorAll(".input-colore-squadra").forEach(el => {
    el.addEventListener("input", () => Tornei.aggiornaSquadra(torneo.id, el.dataset.id, { colore: el.value }));
  });
  document.querySelectorAll(".input-allenatore-squadra").forEach(el => {
    el.addEventListener("blur", () => Tornei.aggiornaSquadra(torneo.id, el.dataset.id, { allenatore: el.value }));
  });
  document.querySelectorAll(".elimina-squadra").forEach(el => {
    el.addEventListener("click", () => {
      if(!confirm("Eliminare questa squadra? Verranno rimossi anche i suoi giocatori e le partite collegate.")) return;
      Tornei.eliminaSquadra(torneo.id, el.dataset.id);
      renderTorneo();
      mostraToast("Squadra eliminata.");
    });
  });
}

/* ---------------- Giocatori ---------------- */

function renderGiocatoriHTML(torneo){
  if(torneo.squadre.length === 0){
    return `<div class="pannello-testata"><h2>Giocatori</h2></div><div class="stato-vuoto"><i class="fa-solid fa-people-group"></i><p>Aggiungi prima una squadra nella sezione "Squadre".</p></div>`;
  }
  if(!Stato.squadraGiocatori || !torneo.squadre.some(s => s.id === Stato.squadraGiocatori)){
    Stato.squadraGiocatori = torneo.squadre[0].id;
  }

  const chips = torneo.squadre.map(s =>
    `<div class="chip-giornata ${Stato.squadraGiocatori === s.id ? "attivo" : ""}" data-id="${s.id}">${escapeHtml(s.nome)}</div>`
  ).join("");

  const rosa = Tornei.giocatoriSquadra(torneo, Stato.squadraGiocatori);
  const cards = rosa.map(g => {
    const eta = calcolaEta(g.dataNascita);
    return `
      <div class="card-giocatore" data-id="${g.id}">
        <div class="foto-giocatore">${g.foto ? `<img src="${g.foto}">` : `<span>${inizialiNome(g.nome)}</span>`}</div>
        <div class="info-giocatore">
          <div class="nome-giocatore">${g.numeroMaglia ? `<span class="numero-maglia">${escapeHtml(g.numeroMaglia)}</span>` : ""}${escapeHtml(g.nome)}</div>
          <div class="dettagli-giocatore">${[g.ruolo, eta !== null ? eta + " anni" : null, g.nazionalita].filter(Boolean).map(escapeHtml).join(" · ")}</div>
        </div>
        <button class="btn-testo elimina-giocatore" data-id="${g.id}" title="Elimina"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }).join("");

  return `
    <div class="pannello-testata"><h2>Giocatori</h2></div>
    <div class="filtro-giornate">${chips}</div>

    <div class="blocco-impostazioni" style="max-width:640px;">
      <h3>Aggiungi giocatore</h3>
      <div class="campo-riga">
        <div class="campo" style="flex:2;"><label style="font-weight:400;">Nome e cognome</label><input type="text" id="g-nome" placeholder="Nome giocatore"></div>
        <div class="campo"><label style="font-weight:400;">N° maglia</label><input type="text" id="g-numero" placeholder="es. 10"></div>
      </div>
      <div class="campo-riga">
        <div class="campo">
          <label style="font-weight:400;">Ruolo</label>
          <input type="text" id="g-ruolo" list="ruoli-suggeriti" placeholder="es. Attaccante">
          <datalist id="ruoli-suggeriti">${RUOLI_SUGGERITI.map(r => `<option value="${r}">`).join("")}</datalist>
        </div>
        <div class="campo"><label style="font-weight:400;">Nazionalità</label><input type="text" id="g-nazionalita" placeholder="es. Italia"></div>
      </div>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Data di nascita</label><input type="date" id="g-data-nascita"></div>
        <div class="campo"><label style="font-weight:400;">Altezza (cm)</label><input type="number" id="g-altezza" placeholder="es. 175"></div>
        <div class="campo"><label style="font-weight:400;">Peso (kg)</label><input type="number" id="g-peso" placeholder="es. 68"></div>
      </div>
      <div class="campo">
        <label style="font-weight:400;">Foto (facoltativa)</label>
        <input type="file" id="g-foto" accept="image/*">
      </div>
      <button class="btn btn-primario" id="btn-aggiungi-giocatore"><i class="fa-solid fa-plus"></i> Aggiungi alla rosa</button>
    </div>

    <div class="griglia-giocatori">
      ${cards || `<p style="color:var(--ink-faint);">Nessun giocatore in questa rosa ancora.</p>`}
    </div>`;
}

function attachGiocatoriHandlers(torneo){
  document.querySelectorAll(".filtro-giornate .chip-giornata").forEach(el => {
    el.addEventListener("click", () => { Stato.squadraGiocatori = el.dataset.id; renderTorneo(); });
  });

  document.getElementById("btn-aggiungi-giocatore").addEventListener("click", async () => {
    const nome = document.getElementById("g-nome").value.trim();
    if(!nome){ mostraToast("Inserisci il nome del giocatore.", "errore"); return; }

    let foto = null;
    const fileInput = document.getElementById("g-foto");
    if(fileInput.files[0]){
      try{ foto = await leggiImmagineCompressa(fileInput.files[0], 260); }
      catch{ mostraToast("Impossibile caricare la foto.", "errore"); }
    }

    Tornei.aggiungiGiocatore(torneo.id, {
      squadraId: Stato.squadraGiocatori, nome, foto,
      numeroMaglia: document.getElementById("g-numero").value.trim(),
      ruolo: document.getElementById("g-ruolo").value.trim(),
      dataNascita: document.getElementById("g-data-nascita").value,
      altezza: document.getElementById("g-altezza").value,
      peso: document.getElementById("g-peso").value,
      nazionalita: document.getElementById("g-nazionalita").value.trim()
    });
    renderTorneo();
    mostraToast("Giocatore aggiunto alla rosa.");
  });

  document.querySelectorAll(".card-giocatore").forEach(el => {
    el.addEventListener("click", e => {
      if(e.target.closest(".elimina-giocatore")) return;
      apriSchedaGiocatore(torneo.id, el.dataset.id);
    });
  });
  document.querySelectorAll(".elimina-giocatore").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      if(!confirm("Rimuovere questo giocatore dalla rosa?")) return;
      Tornei.eliminaGiocatore(torneo.id, el.dataset.id);
      renderTorneo();
      mostraToast("Giocatore rimosso.");
    });
  });
}

/* ---------------- Scheda giocatore (statistiche) ---------------- */

function apriSchedaGiocatore(torneoId, giocatoreId){
  const torneo = Tornei.ottieni(torneoId);
  const giocatore = torneo.giocatori.find(g => g.id === giocatoreId);
  if(!giocatore) return;
  const stat = Statistiche.statisticheGiocatore(torneo, giocatoreId);
  const eta = calcolaEta(giocatore.dataNascita);

  const righeAnagrafica = [
    ["Ruolo", giocatore.ruolo || "—"],
    ["Età", eta !== null ? eta + " anni" : "—"],
    ["Altezza", giocatore.altezza ? giocatore.altezza + " cm" : "—"],
    ["Peso", giocatore.peso ? giocatore.peso + " kg" : "—"],
    ["Nazionalità", giocatore.nazionalita || "—"]
  ].map(([k, v]) => `<div class="riepilogo-riga"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>`).join("");

  const statBlocchi = [
    ["Presenze", stat.presenze], ["Minuti", stat.minuti], ["Gol", stat.gol], ["Assist", stat.assist],
    ["Gialli", stat.gialli], ["Rossi", stat.rossi], ["MVP", stat.mvp], ["Clean sheet", stat.cleanSheet]
  ].map(([k, v]) => `<div class="trofeo"><span class="trofeo-numero">${v}</span><span class="trofeo-nome">${k}</span></div>`).join("");

  document.getElementById("modale-partita-contenuto").innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:20px;">
      <div class="foto-giocatore grande">${giocatore.foto ? `<img src="${giocatore.foto}">` : `<span>${inizialiNome(giocatore.nome)}</span>`}</div>
      <h2 style="margin:0;">${giocatore.numeroMaglia ? `#${escapeHtml(giocatore.numeroMaglia)} ` : ""}${escapeHtml(giocatore.nome)}</h2>
      <span class="pillola">${escapeHtml(stat.squadraNome)}</span>
    </div>
    <div class="riepilogo-lista" style="margin-bottom:20px;">${righeAnagrafica}</div>
    <h4 style="font-size:0.78rem; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">Statistiche nel torneo</h4>
    <div id="bacheca-trofei">${statBlocchi}</div>`;

  document.getElementById("modale-partita").classList.add("mostra");
}
