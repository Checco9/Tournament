/* ============================================================
   APP-STATISTICHE.JS
   Classifiche individuali, sempre ricalcolate da zero a partire
   dagli eventi delle partite (nessun numero salvato a mano).
   ============================================================ */

const CATEGORIE_CLASSIFICHE = [
  { chiave: "marcatori", label: "Marcatori", campo: "gol", suffisso: "gol" },
  { chiave: "assist", label: "Assist", campo: "assist", suffisso: "assist" },
  { chiave: "mvp", label: "MVP", campo: "mvp", suffisso: "mvp" },
  { chiave: "cleansheet", label: "Clean Sheet", campo: "cleanSheet", suffisso: "clean sheet" },
  { chiave: "cartellini", label: "Cartellini", campo: null, suffisso: "" },
  { chiave: "presenze", label: "Presenze", campo: "presenze", suffisso: "presenze" },
  { chiave: "minuti", label: "Minuti giocati", campo: "minuti", suffisso: "min" },
  { chiave: "visualizzazioni", label: "Più visti", campo: null, suffisso: "" }
];

function renderStatisticheHTML(torneo){
  const chips = CATEGORIE_CLASSIFICHE.map(c =>
    `<div class="chip-giornata ${Stato.tabStatistiche === c.chiave ? "attivo" : ""}" data-c="${c.chiave}">${c.label}</div>`
  ).join("");

  const notaAnalytics = Stato.tabStatistiche === "visualizzazioni"
    ? `<p class="hint-formazioni" style="display:block; margin-bottom:14px;"><i class="fa-solid fa-circle-info"></i> Per ora il conteggio riflette solo le visite fatte da questo dispositivo/browser: con un vero hosting diventerà un dato reale su tutti i visitatori.</p>`
    : "";

  return `
    <div class="pannello-testata"><h2>Statistiche giocatori</h2></div>
    <div class="filtro-giornate">${chips}</div>
    ${notaAnalytics}
    <div id="statistiche-lista">${renderListaStatistica(torneo, Stato.tabStatistiche)}</div>`;
}

function renderListaStatistica(torneo, chiave){
  const tutte = Statistiche.calcolaStatisticheGiocatori(torneo);
  let elenco;

  if(chiave === "visualizzazioni"){
    const viste = torneo.analytics?.visualizzazioniGiocatori || {};
    elenco = tutte.filter(s => viste[s.id] > 0)
      .map(s => ({ ...s, viste: viste[s.id] || 0 }))
      .sort((a, b) => b.viste - a.viste);
    if(elenco.length === 0){
      return `<div class="stato-vuoto"><i class="fa-solid fa-eye"></i><p>Nessuna scheda giocatore ancora consultata.<br>Il conteggio si aggiorna ogni volta che apri la scheda di un giocatore.</p></div>`;
    }
    return elenco.map((s, i) => `
      <div class="stat-riga-app">
        <span><span class="nome">${i + 1}. ${escapeHtml(s.nome)}</span><span class="squadra">${escapeHtml(s.squadraNome)}</span></span>
        <span class="valore"><i class="fa-solid fa-eye"></i> ${s.viste}</span>
      </div>`).join("");
  }

  if(chiave === "cleansheet"){
    elenco = tutte.filter(s => /portier/i.test(s.ruolo || "") && s.cleanSheet > 0).sort((a, b) => b.cleanSheet - a.cleanSheet);
  }else if(chiave === "cartellini"){
    elenco = tutte.filter(s => s.gialli > 0 || s.rossi > 0).sort((a, b) => (b.gialli + b.rossi * 2) - (a.gialli + a.rossi * 2));
  }else if(chiave === "presenze" || chiave === "minuti"){
    elenco = [...tutte].filter(s => s.presenze > 0).sort((a, b) => b[chiave === "presenze" ? "presenze" : "minuti"] - a[chiave === "presenze" ? "presenze" : "minuti"]);
  }else{
    const campo = { marcatori: "gol", assist: "assist", mvp: "mvp" }[chiave];
    elenco = tutte.filter(s => s[campo] > 0).sort((a, b) => b[campo] - a[campo]);
  }

  if(elenco.length === 0){
    return `<div class="stato-vuoto"><i class="fa-solid fa-chart-simple"></i><p>Nessun dato ancora in questa classifica.</p></div>`;
  }

  return elenco.map((s, i) => {
    const valore = chiave === "cartellini"
      ? `<span class="valore">🟨 ${s.gialli} &nbsp; 🟥 ${s.rossi}</span>`
      : `<span class="valore">${s[{ marcatori: "gol", assist: "assist", mvp: "mvp", cleansheet: "cleanSheet", presenze: "presenze", minuti: "minuti" }[chiave]]} ${{ marcatori: "gol", assist: "assist", mvp: "mvp", cleansheet: "clean sheet", presenze: "presenze", minuti: "min" }[chiave]}</span>`;
    return `
      <div class="stat-riga-app">
        <span><span class="nome">${i + 1}. ${escapeHtml(s.nome)}</span><span class="squadra">${escapeHtml(s.squadraNome)}</span></span>
        ${valore}
      </div>`;
  }).join("");
}

function attachStatisticheHandlers(torneo){
  document.querySelectorAll(".filtro-giornate .chip-giornata").forEach(el => {
    el.addEventListener("click", () => { Stato.tabStatistiche = el.dataset.c; renderTorneo(); });
  });
}
