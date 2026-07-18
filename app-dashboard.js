/* ============================================================
   APP-DASHBOARD.JS
   ============================================================ */

function renderDashboard(){
  const utente = Auth.utenteCorrente();
  const contenitore = document.getElementById("lista-tornei");
  const testata = document.getElementById("dashboard-ricerca-contenitore");

  let tornei = Tornei.torneiUtente(utente.id);
  const totale = tornei.length;

  testata.innerHTML = totale === 0 ? "" : `
    <div class="campo-ricerca">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="input-ricerca-tornei" placeholder="Cerca un torneo per nome..." value="${escapeHtml(Stato.ricercaDashboard)}">
    </div>`;

  if(totale > 0){
    document.getElementById("input-ricerca-tornei").addEventListener("input", e => {
      Stato.ricercaDashboard = e.target.value;
      renderListaTornei(tornei, utente.id);
    });
  }

  renderListaTornei(tornei, utente.id);
}

function renderListaTornei(tornei, utenteId){
  const contenitore = document.getElementById("lista-tornei");
  const query = Stato.ricercaDashboard.trim().toLowerCase();

  let filtrati = query ? tornei.filter(t => t.nome.toLowerCase().includes(query)) : tornei;

  const preferiti = Tornei.preferitiUtente(utenteId);
  filtrati = [...filtrati].sort((a, b) => {
    const prefA = preferiti.includes(a.id), prefB = preferiti.includes(b.id);
    if(prefA !== prefB) return prefA ? -1 : 1;
    return new Date(b.creatoIl) - new Date(a.creatoIl);
  });

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
  }else if(filtrati.length === 0){
    contenitore.innerHTML = `<div class="stato-vuoto" style="grid-column:1/-1;"><i class="fa-solid fa-magnifying-glass"></i><p>Nessun torneo trovato per "${escapeHtml(query)}".</p></div>`;
  }else{
    contenitore.innerHTML = filtrati.map(t => cardTorneoHTML(t, preferiti.includes(t.id))).join("") + cardNuovo;
  }

  contenitore.querySelectorAll(".card-torneo[data-id]").forEach(el => {
    el.addEventListener("click", e => {
      if(e.target.closest(".stella-preferito")) return;
      apriTorneo(el.dataset.id);
    });
  });
  contenitore.querySelectorAll(".stella-preferito").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      Tornei.toggleFavorito(utenteId, el.dataset.id);
      renderListaTornei(Tornei.torneiUtente(utenteId), utenteId);
    });
  });
  const nuovo = document.getElementById("card-nuovo-torneo");
  if(nuovo) nuovo.addEventListener("click", apriWizard);
}

function cardTorneoHTML(t, preferito){
  const classifica = Statistiche.calcolaClassifica(t, t.squadre.map(s => s.id), t.partite.filter(p => p.faseTipo !== "eliminazione"));
  const capolista = classifica[0];
  const daGiocare = Tornei.partiteDaGiocare(t);
  const formatoLabel = Formati.get(t.formato)?.label || t.formato;

  return `
    <div class="card-torneo" data-id="${t.id}" style="--colore-torneo:${t.coloreprimario}">
      <div class="card-torneo-testata">
        <div class="card-torneo-logo">${t.logo ? `<img src="${t.logo}" alt="">` : `<i class="fa-solid fa-trophy"></i>`}</div>
        <div class="card-torneo-titoli">
          <h3>${escapeHtml(t.nome)}</h3>
          <span class="pillola">${formatoLabel}</span>
        </div>
        <i class="fa-${preferito ? "solid" : "regular"} fa-star stella-preferito ${preferito ? "attiva" : ""}" data-id="${t.id}" title="Preferito"></i>
      </div>
      <div class="card-torneo-stats">
        <div><b>${t.squadre.length}</b>squadre</div>
        <div><b>${daGiocare}</b>da giocare</div>
        <div><b>${capolista && capolista.punti > 0 ? escapeHtml(capolista.nome) : "—"}</b>in testa</div>
      </div>
    </div>`;
}
