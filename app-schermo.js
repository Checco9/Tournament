/* ============================================================
   APP-SCHERMO.JS
   Modalità "maxi-schermo": pensata per essere proiettata durante
   una giornata di tornei (TV in palestra, proiettore, ecc). Ruota
   automaticamente tra alcune schermate leggibili da lontano.
   Nessuna interazione richiesta: parte e si aggiorna da sola.
   ============================================================ */

let timerSchermo = null;
let indiceSlideSchermo = 0;

function apriModalitaSchermo(torneoId){
  Stato.schermoTorneoId = torneoId;
  document.getElementById("vista-schermo").classList.add("attiva");
  indiceSlideSchermo = 0;
  renderSlideSchermo();

  const el = document.getElementById("vista-schermo");
  if(el.requestFullscreen) el.requestFullscreen().catch(() => {});

  clearInterval(timerSchermo);
  timerSchermo = setInterval(() => {
    indiceSlideSchermo++;
    renderSlideSchermo();
  }, 9000);
}

function chiudiModalitaSchermo(){
  clearInterval(timerSchermo);
  document.getElementById("vista-schermo").classList.remove("attiva");
  if(document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function generaSlideSchermo(torneo){
  const slide = [];
  const nomeSquadra = id => id ? (torneo.squadre.find(s => s.id === id) || {}).nome || "—" : "Da definire";

  // ---- Slide classifica / tabellone (dipende dal formato) ----
  const vista = Formati.get(torneo.formato).calcolaVista(torneo);
  if(vista.tipo === "classifica_singola" && vista.classifica.length > 0){
    slide.push({ titolo: "Classifica", tipo: "classifica", righe: vista.classifica.slice(0, 8) });
  }else if(vista.tipo === "classifiche_multiple"){
    vista.gruppi.forEach(g => slide.push({ titolo: `Girone ${g.nome}`, tipo: "classifica", righe: g.classifica.slice(0, 8) }));
  }else if(vista.tipo === "bracket" && vista.turni.length > 0){
    slide.push({ titolo: "Tabellone", tipo: "bracket", turni: vista.turni, campioneId: vista.campioneId });
  }else if(vista.tipo === "mista"){
    vista.gironi.gruppi.forEach(g => slide.push({ titolo: `Girone ${g.nome}`, tipo: "classifica", righe: g.classifica.slice(0, 8) }));
    if(vista.eliminazione) slide.push({ titolo: "Tabellone", tipo: "bracket", turni: vista.eliminazione.turni, campioneId: vista.eliminazione.campioneId });
  }

  // ---- Prossime partite ----
  const prossime = torneo.partite.filter(p => !p.giocata && !p.bye && p.casaId && p.trasfertaId)
    .sort((a, b) => a.turno - b.turno).slice(0, 6);
  if(prossime.length > 0){
    slide.push({
      titolo: "Prossime partite", tipo: "partite",
      righe: prossime.map(p => ({
        etichetta: p.etichettaTurno || `Giornata ${p.turno}`,
        casa: nomeSquadra(p.casaId), trasferta: nomeSquadra(p.trasfertaId),
        extra: [p.dataOra ? formattaDataOra(p.dataOra) : null, p.campo || null].filter(Boolean).join(" · ")
      }))
    });
  }

  // ---- Ultimi risultati ----
  const ultimi = torneo.partite.filter(p => p.giocata && !p.bye)
    .sort((a, b) => b.turno - a.turno).slice(0, 6);
  if(ultimi.length > 0){
    slide.push({
      titolo: "Ultimi risultati", tipo: "risultati",
      righe: ultimi.map(p => ({
        etichetta: p.etichettaTurno || `Giornata ${p.turno}`,
        casa: nomeSquadra(p.casaId), trasferta: nomeSquadra(p.trasfertaId),
        risultato: `${p.golCasa} - ${p.golTrasferta}`
      }))
    });
  }

  // ---- Marcatori ----
  const marcatori = Statistiche.calcolaStatisticheGiocatori(torneo).filter(s => s.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 8);
  if(marcatori.length > 0){
    slide.push({ titolo: "Marcatori", tipo: "persone", righe: marcatori.map(m => ({ nome: m.nome, squadra: m.squadraNome, valore: m.gol + " gol" })) });
  }

  // ---- Sponsor ----
  if(torneo.sponsor && torneo.sponsor.nome){
    slide.push({ titolo: "Sponsor", tipo: "sponsor", sponsor: torneo.sponsor });
  }

  return slide;
}

function renderSlideSchermo(){
  const torneo = Tornei.ottieni(Stato.schermoTorneoId);
  if(!torneo){ chiudiModalitaSchermo(); return; }

  const slide = generaSlideSchermo(torneo);
  if(slide.length === 0){
    document.getElementById("schermo-contenuto").innerHTML = `<div class="schermo-vuoto"><i class="fa-solid fa-trophy"></i><p>Non c'è ancora nulla da mostrare per questo torneo.</p></div>`;
    return;
  }
  const s = slide[indiceSlideSchermo % slide.length];

  document.getElementById("schermo-intestazione").innerHTML = `
    ${torneo.logo ? `<img src="${torneo.logo}" class="schermo-logo-torneo">` : ""}
    <span>${escapeHtml(torneo.nome)}</span>`;

  let corpo = "";
  if(s.tipo === "classifica"){
    corpo = `<table class="schermo-tabella">
      <thead><tr><th>Squadra</th><th>PT</th><th>G</th><th>V</th><th>P</th><th>S</th><th>DR</th></tr></thead>
      <tbody>${s.righe.map((r, i) => `
        <tr><td class="schermo-pos">${i + 1}. ${escapeHtml(r.nome)}</td><td class="schermo-pt">${r.punti}</td><td>${r.giocate}</td><td>${r.vinte}</td><td>${r.pareggi}</td><td>${r.perse}</td><td>${r.dr > 0 ? "+" + r.dr : r.dr}</td></tr>`).join("")}</tbody>
    </table>`;
  }else if(s.tipo === "bracket"){
    corpo = `<div class="schermo-bracket">${s.turni.map(t => `
      <div class="schermo-bracket-colonna">
        <div class="schermo-bracket-titolo">${t.etichetta}</div>
        ${t.partite.map(p => {
          const nome = id => id ? escapeHtml((Tornei.ottieni(Stato.schermoTorneoId).squadre.find(x => x.id === id) || {}).nome || "—") : "Da definire";
          const vinc = p.giocata ? vincitorePartitaEliminazione(p) : null;
          return `<div class="schermo-bracket-match">
            <div class="${vinc === p.casaId ? "vincitrice" : ""}">${nome(p.casaId)}</div>
            <div class="${vinc === p.trasfertaId ? "vincitrice" : ""}">${nome(p.trasfertaId)}</div>
          </div>`;
        }).join("")}
      </div>`).join("")}</div>
      ${s.campioneId ? `<div class="schermo-campione"><i class="fa-solid fa-trophy"></i> ${escapeHtml((Tornei.ottieni(Stato.schermoTorneoId).squadre.find(x => x.id === s.campioneId) || {}).nome || "")}</div>` : ""}`;
  }else if(s.tipo === "partite"){
    corpo = `<div class="schermo-lista">${s.righe.map(r => `
      <div class="schermo-riga-partita">
        <span class="schermo-etichetta">${escapeHtml(r.etichetta)}</span>
        <span class="schermo-match">${escapeHtml(r.casa)} <em>vs</em> ${escapeHtml(r.trasferta)}</span>
        <span class="schermo-extra">${escapeHtml(r.extra)}</span>
      </div>`).join("")}</div>`;
  }else if(s.tipo === "risultati"){
    corpo = `<div class="schermo-lista">${s.righe.map(r => `
      <div class="schermo-riga-partita">
        <span class="schermo-etichetta">${escapeHtml(r.etichetta)}</span>
        <span class="schermo-match">${escapeHtml(r.casa)} <strong class="schermo-ris">${r.risultato}</strong> ${escapeHtml(r.trasferta)}</span>
      </div>`).join("")}</div>`;
  }else if(s.tipo === "persone"){
    corpo = `<div class="schermo-lista">${s.righe.map((r, i) => `
      <div class="schermo-riga-partita">
        <span class="schermo-etichetta">${i + 1}.</span>
        <span class="schermo-match">${escapeHtml(r.nome)} <em>${escapeHtml(r.squadra)}</em></span>
        <span class="schermo-extra">${escapeHtml(r.valore)}</span>
      </div>`).join("")}</div>`;
  }else if(s.tipo === "sponsor"){
    corpo = `<div class="schermo-sponsor">
      ${s.sponsor.logo ? `<img src="${s.sponsor.logo}">` : `<i class="fa-solid fa-shop"></i>`}
      <span>${escapeHtml(s.sponsor.nome)}</span>
    </div>`;
  }

  document.getElementById("schermo-contenuto").innerHTML = `
    <h2 class="schermo-titolo-slide">${s.titolo}</h2>
    <div class="schermo-corpo">${corpo}</div>
    <div class="schermo-puntini">${slide.map((_, i) => `<span class="${i === indiceSlideSchermo % slide.length ? "attivo" : ""}"></span>`).join("")}</div>`;
}
