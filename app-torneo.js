/* ============================================================
   APP-TORNEO.JS
   Vista principale del torneo: dispatcher dei tab, classifica
   (che cambia forma in base al formato) e calendario.
   ============================================================ */

function apriTorneo(id){
  Stato.torneoId = id;
  Stato.tab = "classifica";
  Stato.filtroFaseCalendario = "tutte";
  Stato.squadraGiocatori = null;
  mostraSottoVista("torneo");
  renderTorneo();
}

function renderTorneo(){
  const torneo = Tornei.ottieni(Stato.torneoId);
  if(!torneo){
    mostraToast("Torneo non trovato.", "errore");
    mostraSottoVista("dashboard"); renderDashboard();
    return;
  }
  document.getElementById("torneo-sidebar-titolo").innerHTML = `
    ${torneo.logo ? `<img src="${torneo.logo}" class="logo-sidebar-torneo">` : ""}
    <span>${escapeHtml(torneo.nome)}</span>`;
  document.querySelectorAll(".tab-torneo").forEach(b => b.classList.toggle("attivo", b.dataset.tab === Stato.tab));

  const cont = document.getElementById("torneo-contenuto");
  if(Stato.tab === "classifica"){ cont.innerHTML = renderClassificaHTML(torneo); attachClassificaHandlers(torneo); }
  else if(Stato.tab === "calendario"){ cont.innerHTML = renderCalendarioHTML(torneo); attachCalendarioHandlers(torneo); }
  else if(Stato.tab === "squadre"){ cont.innerHTML = renderSquadreHTML(torneo); attachSquadreHandlers(torneo); }
  else if(Stato.tab === "giocatori"){ cont.innerHTML = renderGiocatoriHTML(torneo); attachGiocatoriHandlers(torneo); }
  else if(Stato.tab === "classifiche"){ cont.innerHTML = renderClassificheIndividualiHTML(torneo); attachClassificheIndividualiHandlers(torneo); }
  else if(Stato.tab === "impostazioni"){ cont.innerHTML = renderImpostazioniHTML(torneo); attachImpostazioniHandlers(torneo); }
}

/* ================================================================
   CLASSIFICA (cambia in base al formato)
   ================================================================ */

function tabellaClassificaHTML(classifica){
  if(classifica.length === 0){
    return `<div class="stato-vuoto"><i class="fa-solid fa-ranking-star"></i><p>Nessuna squadra in questo gruppo.</p></div>`;
  }
  const righe = classifica.map((r, i) => `
    <tr>
      <td class="cella-nome"><span class="pos-medaglia ${i === 0 && r.punti > 0 ? "oro" : ""}">${i + 1}</span>${escapeHtml(r.nome)}</td>
      <td class="num">${r.giocate}</td><td class="num">${r.vinte}</td><td class="num">${r.pareggi}</td><td class="num">${r.perse}</td>
      <td class="num">${r.golFatti}</td><td class="num">${r.golSubiti}</td><td class="num">${r.dr > 0 ? "+" + r.dr : r.dr}</td>
      <td class="num" style="font-weight:700;">${r.punti}</td>
    </tr>`).join("");
  return `
    <div style="overflow-x:auto;">
      <table class="tabella-dati">
        <thead><tr><th>Squadra</th><th class="num">G</th><th class="num">V</th><th class="num">P</th><th class="num">S</th><th class="num">GF</th><th class="num">GS</th><th class="num">DR</th><th class="num">PT</th></tr></thead>
        <tbody>${righe}</tbody>
      </table>
    </div>`;
}

function bracketHTML(torneo, turni, campioneId){
  if(turni.length === 0){
    return `<div class="stato-vuoto"><i class="fa-solid fa-trophy"></i><p>Il tabellone comparirà qui appena ci saranno abbastanza squadre.</p></div>`;
  }
  const nome = id => id ? escapeHtml((torneo.squadre.find(s => s.id === id) || {}).nome || "—") : "Da definire";

  const colonne = turni.map(t => `
    <div class="bracket-colonna">
      <div class="bracket-titolo-turno">${t.etichetta}</div>
      ${t.partite.map(p => {
        const vincitore = p.giocata ? vincitorePartitaEliminazione(p) : null;
        const risultato = p.bye ? "bye" : (p.giocata ? `${p.golCasa} - ${p.golTrasferta}${p.rigoriCasa !== null ? ` (${p.rigoriCasa}-${p.rigoriTrasferta} dcr)` : ""}` : "vs");
        const cliccabile = !p.bye && p.casaId && p.trasfertaId;
        return `
          <div class="bracket-match ${cliccabile ? "cliccabile" : ""}" ${cliccabile ? `data-id="${p.id}"` : ""}>
            <div class="bracket-squadra ${vincitore && vincitore === p.casaId ? "vincitrice" : ""}">${nome(p.casaId)}</div>
            <div class="bracket-risultato">${risultato}</div>
            <div class="bracket-squadra ${vincitore && vincitore === p.trasfertaId ? "vincitrice" : ""}">${nome(p.trasfertaId)}</div>
          </div>`;
      }).join("")}
    </div>`).join("");

  const trofeo = campioneId ? `<div class="bracket-campione"><i class="fa-solid fa-trophy"></i> Campione: <strong>${nome(campioneId)}</strong></div>` : "";

  return `<div class="bracket-scroll">${colonne}</div>${trofeo}`;
}

function renderClassificaHTML(torneo){
  const formatoModulo = Formati.get(torneo.formato);
  const vista = formatoModulo.calcolaVista(torneo);
  const titolo = { classifica_singola: "Classifica", classifiche_multiple: "Gironi", bracket: "Tabellone", mista: "Gironi e tabellone" }[vista.tipo];

  let corpo = "";
  if(vista.tipo === "classifica_singola"){
    corpo = tabellaClassificaHTML(vista.classifica);
  }else if(vista.tipo === "classifiche_multiple"){
    corpo = `<div class="griglia-gironi">${vista.gruppi.map(g => `
      <div><h3 class="titolo-girone">Girone ${g.nome}</h3>${tabellaClassificaHTML(g.classifica)}</div>`).join("")}</div>`;
  }else if(vista.tipo === "bracket"){
    corpo = bracketHTML(torneo, vista.turni, vista.campioneId);
  }else if(vista.tipo === "mista"){
    const bottoneGenera = (!vista.eliminazione && vista.faseGironiCompleta) ? `
      <button class="btn btn-primario" id="btn-genera-eliminazione" style="margin-bottom:20px;">
        <i class="fa-solid fa-shuffle"></i> Genera fase a eliminazione diretta
      </button>` : "";
    const avviso = (!vista.eliminazione && !vista.faseGironiCompleta) ? `
      <p style="color:var(--ink-faint); font-size:0.85rem; margin-bottom:20px;">
        <i class="fa-solid fa-circle-info"></i> Completa tutte le partite dei gironi per generare la fase a eliminazione diretta.
      </p>` : "";
    corpo = `
      <div class="griglia-gironi">${vista.gironi.gruppi.map(g => `
        <div><h3 class="titolo-girone">Girone ${g.nome}</h3>${tabellaClassificaHTML(g.classifica)}</div>`).join("")}</div>
      <div style="margin-top:28px;">
        <h3 class="titolo-girone">Fase a eliminazione diretta</h3>
        ${bottoneGenera}${avviso}
        ${vista.eliminazione ? bracketHTML(torneo, vista.eliminazione.turni, vista.eliminazione.campioneId) : ""}
      </div>`;
  }

  return `<div class="pannello-testata"><h2>${titolo}</h2></div>${corpo}`;
}

function attachClassificaHandlers(torneo){
  document.querySelectorAll(".bracket-match.cliccabile").forEach(el => {
    el.addEventListener("click", () => apriModalePartita(torneo.id, el.dataset.id));
  });
  const btnGenera = document.getElementById("btn-genera-eliminazione");
  if(btnGenera) btnGenera.addEventListener("click", () => {
    if(!confirm("Generare ora il tabellone a eliminazione diretta con i qualificati? Non potrai modificare i gironi dopo.")) return;
    Formati.get("formula_mista").generaFaseEliminazione(torneo);
    renderTorneo();
    mostraToast("Fase a eliminazione diretta generata.");
  });
}

/* ================================================================
   CALENDARIO
   ================================================================ */

function chiaveFiltroPartita(p){
  if(p.girone) return `G:${p.girone}`;
  if(p.faseTipo === "eliminazione") return `T:${p.etichettaTurno}`;
  return `N:${p.turno}`;
}

function renderCalendarioHTML(torneo){
  const nome = id => id ? escapeHtml((torneo.squadre.find(s => s.id === id) || {}).nome || "—") : "Da definire";

  const chiaviUniche = [...new Map(torneo.partite.map(p => [chiaveFiltroPartita(p), p.etichettaTurno || `Giornata ${p.turno}`])).entries()];
  const chips = `<div class="chip-giornata ${Stato.filtroFaseCalendario === "tutte" ? "attivo" : ""}" data-f="tutte">Tutte</div>` +
    chiaviUniche.map(([chiave, label]) => `<div class="chip-giornata ${Stato.filtroFaseCalendario === chiave ? "attivo" : ""}" data-f="${chiave}">${label}</div>`).join("");

  const partite = [...torneo.partite]
    .filter(p => Stato.filtroFaseCalendario === "tutte" || chiaveFiltroPartita(p) === Stato.filtroFaseCalendario)
    .sort((a, b) => a.turno - b.turno);

  const righe = partite.map(p => {
    const risultato = p.bye ? `<span class="risultato">bye</span>`
      : p.giocata ? `<span class="risultato">${p.golCasa} - ${p.golTrasferta}</span>`
      : `<span class="risultato da-giocare">vs</span>`;
    const dettagli = [
      p.dataOra ? formattaDataOra(p.dataOra) : null,
      p.campo || null,
      p.arbitro ? `Arbitro: ${escapeHtml(p.arbitro)}` : null
    ].filter(Boolean).join(" · ");

    return `
      <div class="riga-partita ${p.bye ? "non-cliccabile" : ""}" ${p.bye ? "" : `data-id="${p.id}"`}>
        <span class="giornata-tag">${p.etichettaTurno || `Giornata ${p.turno}`}</span>
        <div class="squadre">
          <span class="nome-squadra">${nome(p.casaId)}</span>
          ${risultato}
          <span class="nome-squadra trasferta">${nome(p.trasfertaId)}</span>
        </div>
        <div class="info-partita-mini">
          ${dettagli ? `<span>${dettagli}</span>` : ""}
          ${p.stato === "rinviata" ? `<span class="badge-rinviata">Rinviata</span>` : ""}
        </div>
        ${p.faseTipo === "libera" ? `<button class="elimina-partita" data-id="${p.id}" title="Elimina"><i class="fa-solid fa-trash"></i></button>` : ""}
      </div>`;
  }).join("");

  const opzioniSquadre = torneo.squadre.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join("");
  const formAggiungi = torneo.squadre.length >= 2 ? `
    <div class="aggiungi-partita-manuale">
      <label>Aggiungi partita extra al calendario</label>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Giornata</label><input type="number" id="cal-giornata" min="1" value="1"></div>
        <div class="campo"><label style="font-weight:400;">Casa</label><select id="cal-casa">${opzioniSquadre}</select></div>
        <div class="campo"><label style="font-weight:400;">Trasferta</label><select id="cal-trasferta">${opzioniSquadre}</select></div>
      </div>
      <button class="btn btn-secondario" id="cal-aggiungi-btn"><i class="fa-solid fa-plus"></i> Aggiungi</button>
    </div>` : "";

  return `
    <div class="pannello-testata"><h2>Calendario</h2></div>
    ${chiaviUniche.length > 0 ? `<div class="filtro-giornate">${chips}</div>` : ""}
    <div class="elenco-partite">
      ${righe || `<div class="stato-vuoto"><i class="fa-solid fa-calendar-days"></i><p>Nessuna partita in calendario ancora.</p></div>`}
    </div>
    ${formAggiungi}`;
}

function attachCalendarioHandlers(torneo){
  document.querySelectorAll(".chip-giornata").forEach(el => {
    el.addEventListener("click", () => { Stato.filtroFaseCalendario = el.dataset.f; renderTorneo(); });
  });
  document.querySelectorAll(".riga-partita[data-id]").forEach(el => {
    el.addEventListener("click", e => {
      if(e.target.closest(".elimina-partita")) return;
      apriModalePartita(torneo.id, el.dataset.id);
    });
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
    Tornei.aggiungiPartitaManuale(torneo.id, { turno: giornata, etichettaTurno: `Giornata ${giornata}`, casaId, trasfertaId });
    renderTorneo();
    mostraToast("Partita aggiunta al calendario.");
  });
}

/* ================================================================
   IMPOSTAZIONI
   ================================================================ */

function renderImpostazioniHTML(torneo){
  return `
    <div class="pannello-testata"><h2>Impostazioni</h2></div>
    <div class="blocco-impostazioni">
      <h3>Informazioni torneo</h3>
      <div class="campo"><label style="font-weight:400;">Nome</label><input type="text" id="imp-nome" value="${escapeHtml(torneo.nome)}"></div>
      <div class="campo">
        <label style="font-weight:400;">Logo</label>
        <div class="riga-upload-logo">
          <div class="anteprima-logo">${torneo.logo ? `<img src="${torneo.logo}">` : `<i class="fa-solid fa-image"></i>`}</div>
          <input type="file" id="imp-logo" accept="image/*">
        </div>
      </div>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Colore primario</label><input type="color" id="imp-colore1" value="${torneo.coloreprimario}"></div>
        <div class="campo"><label style="font-weight:400;">Colore secondario</label><input type="color" id="imp-colore2" value="${torneo.coloreSecondario}"></div>
      </div>
      <button class="btn btn-secondario" id="imp-salva-info">Salva informazioni</button>
    </div>
    <div class="blocco-impostazioni">
      <h3>Regole</h3>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Vittoria</label><input type="number" id="imp-pv" value="${torneo.puntiVittoria}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Pareggio</label><input type="number" id="imp-pp" value="${torneo.puntiPareggio}" min="0"></div>
        <div class="campo"><label style="font-weight:400;">Sconfitta</label><input type="number" id="imp-ps" value="${torneo.puntiSconfitta}" min="0"></div>
      </div>
      <div class="campo-riga">
        <div class="campo"><label style="font-weight:400;">Titolari per squadra</label><input type="number" id="imp-titolari" min="1" value="${torneo.numeroTitolari}"></div>
        <div class="campo"><label style="font-weight:400;">Durata partita (min)</label><input type="number" id="imp-durata" min="1" value="${torneo.durataPartitaMinuti}"></div>
      </div>
      <div class="campo">
        <label style="font-weight:400;">Criterio di spareggio in classifica</label>
        <select id="imp-criterio">
          <option value="differenza_reti" ${torneo.criterioSpareggio === "differenza_reti" ? "selected" : ""}>Differenza reti</option>
          <option value="gol_fatti" ${torneo.criterioSpareggio === "gol_fatti" ? "selected" : ""}>Gol fatti</option>
          <option value="scontri_diretti" ${torneo.criterioSpareggio === "scontri_diretti" ? "selected" : ""}>Scontri diretti</option>
        </select>
      </div>
      <button class="btn btn-secondario" id="imp-salva-regole">Salva regole</button>
    </div>
    <div class="blocco-impostazioni zona-pericolo">
      <h3>Elimina torneo</h3>
      <p class="sottotitolo">Azione permanente: squadre, giocatori, calendario e risultati andranno persi.</p>
      <button class="btn btn-pericolo" id="imp-elimina-torneo"><i class="fa-solid fa-trash"></i> Elimina questo torneo</button>
    </div>`;
}

function attachImpostazioniHandlers(torneo){
  const logoInput = document.getElementById("imp-logo");
  logoInput.addEventListener("change", async () => {
    if(!logoInput.files[0]) return;
    try{
      torneo.logo = await leggiImmagineCompressa(logoInput.files[0], 240);
      Tornei.salva(torneo);
      renderTorneo();
      mostraToast("Logo aggiornato.");
    }catch{ mostraToast("Impossibile caricare l'immagine.", "errore"); }
  });

  document.getElementById("imp-salva-info").addEventListener("click", () => {
    const nome = document.getElementById("imp-nome").value.trim();
    if(!nome){ mostraToast("Il nome non può essere vuoto.", "errore"); return; }
    torneo.nome = nome;
    torneo.coloreprimario = document.getElementById("imp-colore1").value;
    torneo.coloreSecondario = document.getElementById("imp-colore2").value;
    Tornei.salva(torneo);
    renderTorneo();
    mostraToast("Informazioni aggiornate.");
  });

  document.getElementById("imp-salva-regole").addEventListener("click", () => {
    torneo.puntiVittoria = Number(document.getElementById("imp-pv").value) || 0;
    torneo.puntiPareggio = Number(document.getElementById("imp-pp").value) || 0;
    torneo.puntiSconfitta = Number(document.getElementById("imp-ps").value) || 0;
    torneo.numeroTitolari = Math.max(1, Number(document.getElementById("imp-titolari").value) || 11);
    torneo.durataPartitaMinuti = Math.max(1, Number(document.getElementById("imp-durata").value) || 90);
    torneo.criterioSpareggio = document.getElementById("imp-criterio").value;
    Tornei.salva(torneo);
    mostraToast("Regole aggiornate: la classifica è stata ricalcolata.");
  });

  document.getElementById("imp-elimina-torneo").addEventListener("click", () => {
    if(!confirm(`Eliminare definitivamente "${torneo.nome}"?`)) return;
    Tornei.elimina(torneo.id);
    mostraSottoVista("dashboard"); renderDashboard();
    mostraToast("Torneo eliminato.");
  });
}
