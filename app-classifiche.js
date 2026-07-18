/* ============================================================
   APP-CLASSIFICHE.JS
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
  { chiave: "minuti", label: "Minuti giocati", campo: "minuti", suffisso: "min" }
];

function renderClassificheIndividualiHTML(torneo){
  const chips = CATEGORIE_CLASSIFICHE.map(c =>
    `<div class="chip-giornata ${Stato.tabClassificaIndividuale === c.chiave ? "attivo" : ""}" data-c="${c.chiave}">${c.label}</div>`
  ).join("");

  return `
    <div class="pannello-testata"><h2>Classifiche individuali</h2></div>
    <div class="filtro-giornate">${chips}</div>
    <div id="classifiche-individuali-lista">${renderListaClassificaIndividuale(torneo, Stato.tabClassificaIndividuale)}</div>`;
}

function renderListaClassificaIndividuale(torneo, chiave){
  const tutte = Statistiche.calcolaStatisticheGiocatori(torneo);
  let elenco;

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

function attachClassificheIndividualiHandlers(torneo){
  document.querySelectorAll(".filtro-giornate .chip-giornata").forEach(el => {
    el.addEventListener("click", () => { Stato.tabClassificaIndividuale = el.dataset.c; renderTorneo(); });
  });
}
