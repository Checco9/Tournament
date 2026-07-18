/* ============================================================
   APP-PARTITA.JS
   Il modale più "denso" dell'app: qui l'organizzatore inserisce
   tutto quello che riguarda una partita. Il risultato NON si scrive
   a mano se ci sono eventi gol/autogol: si calcola da soli (vedi
   dati-statistiche.js). Senza eventi resta disponibile un risultato
   "rapido" per chi non vuole tracciare ogni dettaglio.
   ============================================================ */

const TIPI_EVENTO = {
  gol: "Gol", autogol: "Autogol",
  cartellinoGiallo: "Cartellino giallo", cartellinoRosso: "Cartellino rosso / Espulsione",
  sostituzione: "Sostituzione"
};

function apriModalePartita(torneoId, partitaId){
  const torneo = Tornei.ottieni(torneoId);
  const partita = Tornei.ottieniPartita(torneo, partitaId);
  if(!partita) return;

  Stato.modale = {
    torneoId, partitaId,
    formazioni: JSON.parse(JSON.stringify(partita.formazioni || {})),
    eventi: JSON.parse(JSON.stringify(partita.eventi || [])),
    mvpGiocatoreId: partita.mvpGiocatoreId || ""
  };
  [partita.casaId, partita.trasfertaId].forEach(sid => {
    if(sid && !Stato.modale.formazioni[sid]) Stato.modale.formazioni[sid] = { titolari: [], panchina: [] };
  });

  renderModalePartita();
  document.getElementById("modale-partita").classList.add("mostra");
}

function chiudiModalePartita(){
  document.getElementById("modale-partita").classList.remove("mostra");
}

function giocatoriSchierati(torneo, squadraId){
  const f = Stato.modale.formazioni[squadraId] || { titolari: [], panchina: [] };
  const ids = [...(f.titolari || []), ...(f.panchina || [])];
  return torneo.giocatori.filter(g => ids.includes(g.id));
}

function renderModalePartita(){
  const torneo = Tornei.ottieni(Stato.modale.torneoId);
  const partita = Tornei.ottieniPartita(torneo, Stato.modale.partitaId);
  const casa = torneo.squadre.find(s => s.id === partita.casaId);
  const trasferta = torneo.squadre.find(s => s.id === partita.trasfertaId);

  const golCalcolati = Statistiche.calcolaGolDaEventi({ ...partita, eventi: Stato.modale.eventi });
  const inParita = golCalcolati.haEventiGol ? golCalcolati.golCasa === golCalcolati.golTrasferta
    : (partita.golCasa !== null && partita.golCasa === partita.golTrasferta);
  const mostraRigori = partita.faseTipo === "eliminazione";

  document.getElementById("modale-partita-contenuto").innerHTML = `
    <h2>${escapeHtml(partita.etichettaTurno || "Partita")}<br><span style="font-weight:400; font-size:0.85rem; color:var(--ink-soft);">${escapeHtml(casa?.nome || "—")} vs ${escapeHtml(trasferta?.nome || "—")}</span></h2>

    <div class="sezione-modale">
      <h4>Informazioni</h4>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Campo</label><input type="text" id="mp-campo" value="${escapeHtml(partita.campo || "")}" placeholder="es. Campo 1"></div>
        <div class="campo"><label style="font-weight:400;">Arbitro</label><input type="text" id="mp-arbitro" value="${escapeHtml(partita.arbitro || "")}" placeholder="Nome arbitro"></div>
      </div>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Data e ora</label><input type="datetime-local" id="mp-data" value="${partita.dataOra ? partita.dataOra.slice(0, 16) : ""}"></div>
        <div class="campo" style="display:flex; align-items:flex-end;">
          <button type="button" class="btn btn-secondario btn-blocco" id="mp-rinvia">
            <i class="fa-solid fa-clock-rotate-left"></i> ${partita.stato === "rinviata" ? "Segna come programmata" : "Rinvia partita"}
          </button>
        </div>
      </div>
      ${partita.stato === "rinviata" ? `<p class="avviso-rinviata"><i class="fa-solid fa-triangle-exclamation"></i> Questa partita è segnata come rinviata.</p>` : ""}
    </div>

    <div class="sezione-modale">
      <h4>Formazioni <span class="hint-formazioni">(titolari: ${torneo.numeroTitolari})</span></h4>
      <div class="colonne-formazioni">
        ${[["casa", partita.casaId, casa], ["trasferta", partita.trasfertaId, trasferta]].map(([lato, squadraId, squadra]) =>
          squadraId ? formazioneSquadraHTML(torneo, squadraId, squadra) : `<div class="colonna-formazione"><p style="color:var(--ink-faint);">Squadra da definire</p></div>`
        ).join("")}
      </div>
    </div>

    <div class="sezione-modale">
      <h4>Eventi partita</h4>
      <div class="risultato-live">Risultato attuale: <strong>${golCalcolati.haEventiGol ? `${golCalcolati.golCasa} - ${golCalcolati.golTrasferta}` : "—"}</strong>${golCalcolati.haEventiGol ? "" : `<span class="hint-formazioni">(nessun evento gol: usa il risultato rapido qui sotto)</span>`}</div>

      <div class="form-evento" id="form-evento">
        <select id="ev-tipo">${Object.entries(TIPI_EVENTO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <input type="number" id="ev-minuto" placeholder="Min." min="0" style="width:70px;">
        <select id="ev-squadra">
          ${partita.casaId ? `<option value="${partita.casaId}">${escapeHtml(casa.nome)}</option>` : ""}
          ${partita.trasfertaId ? `<option value="${partita.trasfertaId}">${escapeHtml(trasferta.nome)}</option>` : ""}
        </select>
        <select id="ev-giocatore"></select>
        <span id="ev-extra"></span>
        <button type="button" class="btn btn-secondario" id="ev-aggiungi"><i class="fa-solid fa-plus"></i></button>
      </div>

      <div class="lista-eventi" id="lista-eventi">${renderListaEventiHTML(torneo, Stato.modale.eventi)}</div>

      ${!golCalcolati.haEventiGol ? `
        <div class="risultato-input-riga" style="margin-top:14px;">
          <span class="nome-squadra-modale">${escapeHtml(casa?.nome || "—")}</span>
          <input type="number" id="mp-gol-casa-manuale" min="0" value="${partita.golCasa ?? ""}" placeholder="–">
          <span style="color:var(--ink-faint);">–</span>
          <input type="number" id="mp-gol-trasferta-manuale" min="0" value="${partita.golTrasferta ?? ""}" placeholder="–">
          <span class="nome-squadra-modale">${escapeHtml(trasferta?.nome || "—")}</span>
        </div>` : ""}

      ${mostraRigori ? `
        <div class="campo-riga" style="margin-top:14px;">
          <div class="campo"><label style="font-weight:400;">Rigori ${escapeHtml(casa?.nome || "")}${inParita ? " (obbligatorio, c'è parità)" : ""}</label><input type="number" id="mp-rigori-casa" min="0" value="${partita.rigoriCasa ?? ""}"></div>
          <div class="campo"><label style="font-weight:400;">Rigori ${escapeHtml(trasferta?.nome || "")}</label><input type="number" id="mp-rigori-trasferta" min="0" value="${partita.rigoriTrasferta ?? ""}"></div>
        </div>` : ""}
    </div>

    <div class="sezione-modale">
      <h4>MVP della partita</h4>
      <select id="mp-mvp">
        <option value="">Nessuno</option>
        ${[...giocatoriSchierati(torneo, partita.casaId), ...giocatoriSchierati(torneo, partita.trasfertaId)]
          .map(g => `<option value="${g.id}" ${Stato.modale.mvpGiocatoreId === g.id ? "selected" : ""}>${escapeHtml(g.nome)}</option>`).join("")}
      </select>
    </div>

    <div class="modale-azioni">
      ${partita.giocata ? `<button class="btn btn-secondario" id="mp-annulla-risultato">Annulla risultato</button>` : ""}
      <button class="btn btn-primario btn-blocco" id="mp-salva">Salva partita</button>
    </div>`;

  aggiornaFormEvento(torneo, partita);
  attachModalePartitaHandlers(torneo, partita);
}

function formazioneSquadraHTML(torneo, squadraId, squadra){
  const rosa = Tornei.giocatoriSquadra(torneo, squadraId);
  const f = Stato.modale.formazioni[squadraId] || { titolari: [], panchina: [] };
  if(rosa.length === 0){
    return `<div class="colonna-formazione"><h5>${escapeHtml(squadra.nome)}</h5><p style="color:var(--ink-faint); font-size:0.82rem;">Nessun giocatore in rosa. Aggiungili nella sezione Giocatori.</p></div>`;
  }
  return `
    <div class="colonna-formazione">
      <h5>${escapeHtml(squadra.nome)} <span class="hint-formazioni">(${(f.titolari || []).length} titolari)</span></h5>
      ${rosa.map(g => {
        const stato = (f.titolari || []).includes(g.id) ? "titolare" : (f.panchina || []).includes(g.id) ? "panchina" : "fuori";
        return `
          <div class="riga-formazione">
            <span>${g.numeroMaglia ? `#${escapeHtml(g.numeroMaglia)} ` : ""}${escapeHtml(g.nome)}</span>
            <select class="select-stato-formazione" data-squadra="${squadraId}" data-giocatore="${g.id}">
              <option value="fuori" ${stato === "fuori" ? "selected" : ""}>Non convocato</option>
              <option value="panchina" ${stato === "panchina" ? "selected" : ""}>Panchina</option>
              <option value="titolare" ${stato === "titolare" ? "selected" : ""}>Titolare</option>
            </select>
          </div>`;
      }).join("")}
    </div>`;
}

function renderListaEventiHTML(torneo, eventi){
  if(eventi.length === 0) return `<p style="color:var(--ink-faint); font-size:0.82rem;">Nessun evento inserito ancora.</p>`;
  const nomeGiocatore = id => { const g = torneo.giocatori.find(x => x.id === id); return g ? escapeHtml(g.nome) : "—"; };

  return [...eventi].sort((a, b) => (Number(a.minuto) || 0) - (Number(b.minuto) || 0)).map(e => {
    let testo;
    if(e.tipo === "sostituzione") testo = `${nomeGiocatore(e.giocatoreEntrataId)} entra, ${nomeGiocatore(e.giocatoreUscitaId)} esce`;
    else if(e.tipo === "gol") testo = `Gol di ${nomeGiocatore(e.giocatoreId)}${e.assistId ? ` (assist ${nomeGiocatore(e.assistId)})` : ""}`;
    else testo = `${TIPI_EVENTO[e.tipo]}: ${nomeGiocatore(e.giocatoreId)}`;

    return `<div class="riga-evento" data-id="${e.id}">
      <span class="minuto-evento">${e.minuto || "?"}'</span>
      <span class="tipo-evento tipo-${e.tipo}">${TIPI_EVENTO[e.tipo]}</span>
      <span class="testo-evento">${testo}</span>
      <button type="button" class="rimuovi-evento" data-id="${e.id}"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
  }).join("");
}

function aggiornaFormEvento(torneo, partita){
  const tipo = document.getElementById("ev-tipo").value;
  const squadraId = document.getElementById("ev-squadra").value;
  const schierati = giocatoriSchierati(torneo, squadraId);
  const selectGiocatore = document.getElementById("ev-giocatore");
  const extra = document.getElementById("ev-extra");

  if(tipo === "sostituzione"){
    const f = Stato.modale.formazioni[squadraId] || { titolari: [], panchina: [] };
    const titolari = torneo.giocatori.filter(g => (f.titolari || []).includes(g.id));
    const panchinari = torneo.giocatori.filter(g => (f.panchina || []).includes(g.id));
    selectGiocatore.innerHTML = titolari.map(g => `<option value="${g.id}">${escapeHtml(g.nome)} (esce)</option>`).join("") || `<option value="">Nessun titolare</option>`;
    extra.innerHTML = `<select id="ev-entra">${panchinari.map(g => `<option value="${g.id}">${escapeHtml(g.nome)} (entra)</option>`).join("") || `<option value="">Nessuno in panchina</option>`}</select>`;
  }else{
    selectGiocatore.innerHTML = schierati.map(g => `<option value="${g.id}">${escapeHtml(g.nome)}</option>`).join("") || `<option value="">Nessuno schierato</option>`;
    if(tipo === "gol"){
      extra.innerHTML = `<select id="ev-assist"><option value="">Nessun assist</option>${schierati.map(g => `<option value="${g.id}">${escapeHtml(g.nome)}</option>`).join("")}</select>`;
    }else{
      extra.innerHTML = "";
    }
  }
}

function attachModalePartitaHandlers(torneo, partita){
  document.querySelectorAll(".select-stato-formazione").forEach(el => {
    el.addEventListener("change", () => {
      const squadraId = el.dataset.squadra, giocatoreId = el.dataset.giocatore, valore = el.value;
      const f = Stato.modale.formazioni[squadraId] || (Stato.modale.formazioni[squadraId] = { titolari: [], panchina: [] });
      f.titolari = (f.titolari || []).filter(id => id !== giocatoreId);
      f.panchina = (f.panchina || []).filter(id => id !== giocatoreId);
      if(valore === "titolare") f.titolari.push(giocatoreId);
      if(valore === "panchina") f.panchina.push(giocatoreId);
      renderModalePartita();
    });
  });

  document.getElementById("ev-tipo").addEventListener("change", () => aggiornaFormEvento(torneo, partita));
  document.getElementById("ev-squadra").addEventListener("change", () => aggiornaFormEvento(torneo, partita));

  document.getElementById("ev-aggiungi").addEventListener("click", () => {
    const tipo = document.getElementById("ev-tipo").value;
    const minuto = document.getElementById("ev-minuto").value;
    const squadraId = document.getElementById("ev-squadra").value;
    const giocatoreId = document.getElementById("ev-giocatore").value;

    if(!giocatoreId){ mostraToast("Seleziona un giocatore (deve essere schierato in formazione).", "errore"); return; }

    const evento = { id: DB.generaId("evento"), tipo, minuto: minuto || 0, squadraId };
    if(tipo === "sostituzione"){
      const entraId = document.getElementById("ev-entra")?.value;
      if(!entraId){ mostraToast("Seleziona anche il giocatore che entra.", "errore"); return; }
      evento.giocatoreUscitaId = giocatoreId;
      evento.giocatoreEntrataId = entraId;
    }else{
      evento.giocatoreId = giocatoreId;
      if(tipo === "gol"){
        const assistId = document.getElementById("ev-assist")?.value;
        if(assistId) evento.assistId = assistId;
      }
    }
    Stato.modale.eventi.push(evento);
    renderModalePartita();
  });

  document.querySelectorAll(".rimuovi-evento").forEach(el => {
    el.addEventListener("click", () => {
      Stato.modale.eventi = Stato.modale.eventi.filter(e => e.id !== el.dataset.id);
      renderModalePartita();
    });
  });

  document.getElementById("mp-rinvia").addEventListener("click", () => {
    if(partita.stato === "rinviata") Tornei.ripristinaProgrammata(torneo.id, partita.id);
    else Tornei.rinviaPartita(torneo.id, partita.id);
    renderModalePartita();
    renderTorneo();
  });

  const annullaBtn = document.getElementById("mp-annulla-risultato");
  if(annullaBtn) annullaBtn.addEventListener("click", () => {
    if(!confirm("Annullare il risultato di questa partita? Formazioni ed eventi verranno azzerati.")) return;
    Tornei.annullaRisultato(torneo.id, partita.id);
    chiudiModalePartita();
    renderTorneo();
    mostraToast("Risultato annullato.");
  });

  document.getElementById("mp-salva").addEventListener("click", () => {
    Tornei.aggiornaInfoPartita(torneo.id, partita.id, {
      campo: document.getElementById("mp-campo").value.trim(),
      arbitro: document.getElementById("mp-arbitro").value.trim(),
      dataOra: document.getElementById("mp-data").value ? new Date(document.getElementById("mp-data").value).toISOString() : null
    });
    Tornei.salvaFormazioni(torneo.id, partita.id, Stato.modale.formazioni);

    const golManualeCasa = document.getElementById("mp-gol-casa-manuale")?.value;
    const golManualeTrasferta = document.getElementById("mp-gol-trasferta-manuale")?.value;
    const rigoriCasa = document.getElementById("mp-rigori-casa")?.value ?? "";
    const rigoriTrasferta = document.getElementById("mp-rigori-trasferta")?.value ?? "";

    const golCalcolati = Statistiche.calcolaGolDaEventi({ ...partita, eventi: Stato.modale.eventi });
    if(!golCalcolati.haEventiGol && (golManualeCasa === "" || golManualeTrasferta === "")){
      mostraToast("Inserisci il risultato (o aggiungi eventi gol).", "errore");
      return;
    }

    Tornei.salvaEventiERisultato(torneo.id, partita.id, {
      eventi: Stato.modale.eventi,
      golCasaManuale: golManualeCasa, golTrasfertaManuale: golManualeTrasferta,
      rigoriCasa, rigoriTrasferta,
      mvpGiocatoreId: document.getElementById("mp-mvp").value
    });

    chiudiModalePartita();
    renderTorneo();
    mostraToast("Partita salvata: classifica e statistiche aggiornate.");
  });
}
