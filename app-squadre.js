/* ============================================================
   APP-SQUADRE.JS
   Tab "Squadre" (logo, colore, allenatore) e tab "Giocatori"
   (anagrafica completa + scheda con statistiche calcolate).
   ============================================================ */

/* ---------------- Squadre ---------------- */

function renderSquadreHTML(torneo){
  const utente = Auth.utenteCorrente();
  const squadreGlobali = SquadreGlobali.elencoUtente(utente.id);

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
      <div class="campo">
        <label style="font-weight:400;">
          <i class="fa-solid fa-link" style="font-size:0.7em;"></i> Collega a squadra cross-torneo
        </label>
        <select class="input-globale-squadra" data-id="${s.id}">
          <option value="">Nessun collegamento</option>
          ${squadreGlobali.map(g => `<option value="${g.id}" ${s.squadraGlobaleId === g.id ? "selected" : ""}>${escapeHtml(g.nome)}</option>`).join("")}
        </select>
      </div>
      <div class="riga-azioni-squadra">
        <button class="btn-testo dettagli-squadra" data-id="${s.id}"><i class="fa-solid fa-chart-simple"></i> Dettagli</button>
        <span class="conteggio-rosa">${Tornei.giocatoriSquadra(torneo, s.id).length} giocatori</span>
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
  document.querySelectorAll(".input-globale-squadra").forEach(el => {
    el.addEventListener("change", () => {
      SquadreGlobali.collega(torneo.id, el.dataset.id, el.value || null);
      mostraToast(el.value ? "Squadra collegata: le statistiche all-time si aggiornano da sole." : "Collegamento rimosso.");
    });
  });
  document.querySelectorAll(".dettagli-squadra").forEach(el => {
    el.addEventListener("click", e => { e.stopPropagation(); apriSchedaSquadra(torneo.id, el.dataset.id); });
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

/* ---------------- Scheda squadra (dettagli e statistiche) ---------------- */

function apriSchedaSquadra(torneoId, squadraId){
  const torneo = Tornei.ottieni(torneoId);
  const squadra = torneo.squadre.find(s => s.id === squadraId);
  if(!squadra) return;

  Tornei.tracciaVisualizzazioneSquadra(torneoId, squadraId);
  const visualizzazioni = (torneo.analytics?.visualizzazioniSquadre?.[squadraId] || 0) + 1;

  const record = Statistiche.calcolaClassifica(torneo, torneo.squadre.map(s => s.id), torneo.partite).find(r => r.id === squadraId);
  const marcatoriSquadra = Statistiche.calcolaStatisticheGiocatori(torneo)
    .filter(s => s.squadraId === squadraId && s.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 3);
  const rosa = Tornei.giocatoriSquadra(torneo, squadraId);
  const nomeAvversario = p => {
    const avvId = p.casaId === squadraId ? p.trasfertaId : p.casaId;
    return avvId ? escapeHtml((torneo.squadre.find(s => s.id === avvId) || {}).nome || "—") : "Da definire";
  };
  const partite = torneo.partite.filter(p => p.casaId === squadraId || p.trasfertaId === squadraId).sort((a, b) => a.turno - b.turno);

  const righeRosa = rosa.length === 0 ? `<p style="color:var(--ink-faint); font-size:0.85rem;">Nessun giocatore in rosa.</p>` :
    rosa.map(g => `
      <div class="card-giocatore mini" data-id="${g.id}">
        <div class="foto-giocatore">${g.foto ? `<img src="${g.foto}">` : `<span>${inizialiNome(g.nome)}</span>`}</div>
        <div class="info-giocatore">
          <div class="nome-giocatore">${g.numeroMaglia ? `<span class="numero-maglia">${escapeHtml(g.numeroMaglia)}</span>` : ""}${escapeHtml(g.nome)}</div>
          <div class="dettagli-giocatore">${escapeHtml(g.ruolo || "—")}</div>
        </div>
      </div>`).join("");

  const righePartite = partite.length === 0 ? `<p style="color:var(--ink-faint); font-size:0.85rem;">Nessuna partita in calendario.</p>` :
    partite.map(p => {
      const risultato = p.bye ? "bye" : p.giocata ? `${p.golCasa} - ${p.golTrasferta}` : "vs";
      return `
        <div class="riga-evento partita-squadra" data-id="${p.bye ? "" : p.id}">
          <span class="minuto-evento" style="width:auto;">${escapeHtml(p.etichettaTurno || "Giornata " + p.turno)}</span>
          <span class="testo-evento">vs ${nomeAvversario(p)}</span>
          <span class="tipo-evento">${risultato}</span>
        </div>`;
    }).join("");

  document.getElementById("modale-partita-contenuto").innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:20px;">
      <div class="foto-giocatore grande">${squadra.logo ? `<img src="${squadra.logo}">` : `<span>${inizialiNome(squadra.nome)}</span>`}</div>
      <h2 style="margin:0;">${escapeHtml(squadra.nome)}</h2>
      <span class="pillola">${squadra.allenatore ? "Allenatore: " + escapeHtml(squadra.allenatore) : "Nessun allenatore indicato"}</span>
      <span class="contatore-visualizzazioni"><i class="fa-solid fa-eye"></i> ${visualizzazioni} visualizzazioni</span>
    </div>

    <div id="bacheca-trofei" style="margin-bottom:20px;">
      <div class="trofeo"><span class="trofeo-numero">${record.giocate}</span><span class="trofeo-nome">Giocate</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.vinte}</span><span class="trofeo-nome">Vinte</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.pareggi}</span><span class="trofeo-nome">Pareggi</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.perse}</span><span class="trofeo-nome">Perse</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.golFatti}</span><span class="trofeo-nome">Gol fatti</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.golSubiti}</span><span class="trofeo-nome">Gol subiti</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.dr > 0 ? "+" + record.dr : record.dr}</span><span class="trofeo-nome">Diff. reti</span></div>
      <div class="trofeo"><span class="trofeo-numero">${record.punti}</span><span class="trofeo-nome">Punti</span></div>
    </div>

    ${marcatoriSquadra.length > 0 ? `
      <h4 style="font-size:0.78rem; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">Marcatori della squadra</h4>
      <div class="riepilogo-lista" style="margin-bottom:20px;">
        ${marcatoriSquadra.map(m => `<div class="riepilogo-riga"><span>${escapeHtml(m.nome)}</span><span>${m.gol} gol</span></div>`).join("")}
      </div>` : ""}

    <h4 style="font-size:0.78rem; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">Rosa (${rosa.length})</h4>
    <div class="griglia-giocatori" style="margin-bottom:20px; margin-top:0;">${righeRosa}</div>

    <h4 style="font-size:0.78rem; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">Partite</h4>
    <div class="lista-eventi">${righePartite}</div>`;

  document.querySelectorAll(".card-giocatore.mini").forEach(el => {
    el.addEventListener("click", () => apriSchedaGiocatore(torneoId, el.dataset.id));
  });
  document.querySelectorAll(".partita-squadra[data-id]").forEach(el => {
    if(!el.dataset.id) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", () => apriModalePartita(torneoId, el.dataset.id));
  });

  document.getElementById("modale-partita").classList.add("mostra");
}

/* ---------------- Giocatori ---------------- */

function renderGiocatoriHTML(torneo){
  const toggle = `
    <div class="toggle-vista-giocatori">
      <button class="toggle-opzione ${Stato.vistaGiocatoriTab === "rose" ? "attivo" : ""}" data-vista="rose"><i class="fa-solid fa-person-running"></i> Rose squadre</button>
      <button class="toggle-opzione ${Stato.vistaGiocatoriTab === "staff" ? "attivo" : ""}" data-vista="staff"><i class="fa-solid fa-id-badge"></i> Arbitri e staff</button>
    </div>`;

  const corpo = Stato.vistaGiocatoriTab === "staff" ? renderStaffHTML(torneo) : renderRoseHTML(torneo);
  return `<div class="pannello-testata"><h2>Giocatori</h2></div>${toggle}${corpo}`;
}

function attachGiocatoriHandlers(torneo){
  document.querySelectorAll(".toggle-opzione").forEach(el => {
    el.addEventListener("click", () => { Stato.vistaGiocatoriTab = el.dataset.vista; renderTorneo(); });
  });
  if(Stato.vistaGiocatoriTab === "staff") attachStaffHandlers(torneo);
  else attachRoseHandlers(torneo);
}

/* ---------------- Rose squadre ---------------- */

function renderRoseHTML(torneo){
  if(torneo.squadre.length === 0){
    return `<div class="stato-vuoto"><i class="fa-solid fa-people-group"></i><p>Aggiungi prima una squadra nella sezione "Squadre".</p></div>`;
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

function attachRoseHandlers(torneo){
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

/* ---------------- Arbitri e staff ---------------- */

const RUOLI_STAFF_SUGGERITI = ["Arbitro", "Assistente arbitro", "Team manager", "Dirigente", "Segnapunti", "Fisioterapista"];

function renderStaffHTML(torneo){
  const staff = torneo.staff || [];
  const cards = staff.map(m => `
    <div class="card-giocatore" data-id="${m.id}">
      <div class="foto-giocatore">${m.foto ? `<img src="${m.foto}">` : `<span>${inizialiNome(m.nome)}</span>`}</div>
      <div class="info-giocatore">
        <div class="nome-giocatore">${escapeHtml(m.nome)}</div>
        <div class="dettagli-giocatore">${[m.ruolo, m.telefono, m.email].filter(Boolean).map(escapeHtml).join(" · ")}</div>
      </div>
      <button class="btn-testo elimina-staff" data-id="${m.id}" title="Elimina"><i class="fa-solid fa-trash"></i></button>
    </div>`).join("");

  return `
    <div class="blocco-impostazioni" style="max-width:640px;">
      <h3>Aggiungi persona dello staff</h3>
      <div class="campo-riga">
        <div class="campo" style="flex:2;"><label style="font-weight:400;">Nome e cognome</label><input type="text" id="st-nome" placeholder="Nome persona"></div>
        <div class="campo">
          <label style="font-weight:400;">Ruolo</label>
          <input type="text" id="st-ruolo" list="ruoli-staff-suggeriti" placeholder="es. Arbitro">
          <datalist id="ruoli-staff-suggeriti">${RUOLI_STAFF_SUGGERITI.map(r => `<option value="${r}">`).join("")}</datalist>
        </div>
      </div>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Telefono</label><input type="text" id="st-telefono" placeholder="Facoltativo"></div>
        <div class="campo"><label style="font-weight:400;">Email</label><input type="email" id="st-email" placeholder="Facoltativo"></div>
      </div>
      <div class="campo">
        <label style="font-weight:400;">Foto (facoltativa)</label>
        <input type="file" id="st-foto" accept="image/*">
      </div>
      <button class="btn btn-primario" id="btn-aggiungi-staff"><i class="fa-solid fa-plus"></i> Aggiungi</button>
    </div>

    <div class="griglia-giocatori">
      ${cards || `<p style="color:var(--ink-faint);">Nessun arbitro o membro dello staff ancora. Una volta aggiunti, li potrai scegliere velocemente come arbitro nel modale di ogni partita.</p>`}
    </div>`;
}

function attachStaffHandlers(torneo){
  document.getElementById("btn-aggiungi-staff").addEventListener("click", async () => {
    const nome = document.getElementById("st-nome").value.trim();
    if(!nome){ mostraToast("Inserisci un nome.", "errore"); return; }

    let foto = null;
    const fileInput = document.getElementById("st-foto");
    if(fileInput.files[0]){
      try{ foto = await leggiImmagineCompressa(fileInput.files[0], 260); }
      catch{ mostraToast("Impossibile caricare la foto.", "errore"); }
    }

    Tornei.aggiungiStaff(torneo.id, {
      nome, foto,
      ruolo: document.getElementById("st-ruolo").value.trim(),
      telefono: document.getElementById("st-telefono").value.trim(),
      email: document.getElementById("st-email").value.trim()
    });
    renderTorneo();
    mostraToast("Aggiunto allo staff del torneo.");
  });

  document.querySelectorAll(".elimina-staff").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      if(!confirm("Rimuovere questa persona dallo staff?")) return;
      Tornei.eliminaStaff(torneo.id, el.dataset.id);
      renderTorneo();
      mostraToast("Rimosso dallo staff.");
    });
  });
}

/* ---------------- Scheda giocatore (statistiche) ---------------- */

function apriSchedaGiocatore(torneoId, giocatoreId){
  const torneo = Tornei.ottieni(torneoId);
  const giocatore = torneo.giocatori.find(g => g.id === giocatoreId);
  if(!giocatore) return;

  Tornei.tracciaVisualizzazioneGiocatore(torneoId, giocatoreId);
  const visualizzazioni = (torneo.analytics?.visualizzazioniGiocatori?.[giocatoreId] || 0) + 1;

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
      <span class="contatore-visualizzazioni"><i class="fa-solid fa-eye"></i> ${visualizzazioni} visualizzazioni</span>
    </div>
    <div class="riepilogo-lista" style="margin-bottom:20px;">${righeAnagrafica}</div>
    <h4 style="font-size:0.78rem; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">Statistiche nel torneo</h4>
    <div id="bacheca-trofei">${statBlocchi}</div>`;

  document.getElementById("modale-partita").classList.add("mostra");
}
