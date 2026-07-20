/* ============================================================
   APP-SQUADRE-GLOBALI.JS
   Pagina "Le mie squadre": squadre collegate tra più tornei, con
   statistiche complessive calcolate sommando i tornei collegati.
   ============================================================ */

function renderSquadreGlobali(){
  const utente = Auth.utenteCorrente();
  const squadre = SquadreGlobali.elencoUtente(utente.id);
  const contenitore = document.getElementById("lista-squadre-globali");

  if(squadre.length === 0){
    contenitore.innerHTML = `
      <div class="stato-vuoto" style="grid-column:1/-1;">
        <i class="fa-solid fa-people-roof"></i>
        <p>Non hai ancora nessuna squadra collegata tra più tornei.<br>
        Creane una qui, poi collegala dalla sezione "Squadre" di ogni torneo.</p>
      </div>`;
  }else{
    contenitore.innerHTML = squadre.map(sq => {
      const { totale, storico } = SquadreGlobali.statisticheAllTime(utente.id, sq.id);
      return `
        <div class="card-squadra-estesa card-squadra-globale" data-id="${sq.id}" style="--colore-squadra:${sq.colore}">
          <div class="riga-logo-nome">
            <div class="anteprima-logo-piccola">${sq.logo ? `<img src="${sq.logo}">` : `<span>${inizialiNome(sq.nome)}</span>`}</div>
            <h3 style="font-size:1rem;">${escapeHtml(sq.nome)}</h3>
          </div>
          <div class="card-torneo-stats">
            <div><b>${storico.length}</b>tornei</div>
            <div><b>${totale.vinte}V ${totale.pareggi}P ${totale.perse}S</b>bilancio</div>
            <div><b>${totale.punti}</b>punti totali</div>
          </div>
        </div>`;
    }).join("");
  }

  contenitore.querySelectorAll(".card-squadra-globale").forEach(el => {
    el.addEventListener("click", () => apriSchedaSquadraGlobale(el.dataset.id));
  });

  document.getElementById("btn-nuova-squadra-globale").onclick = () => apriModaleNuovaSquadraGlobale();
}

function apriModaleNuovaSquadraGlobale(){
  document.getElementById("modale-partita-contenuto").innerHTML = `
    <h2>Nuova squadra collegata</h2>
    <div class="campo"><label>Nome squadra</label><input type="text" id="sg-nome" placeholder="Es. Real Classe 3B"></div>
    <div class="campo">
      <label>Colore</label>
      <input type="color" id="sg-colore" value="#1F6F50">
    </div>
    <div class="modale-azioni">
      <button class="btn btn-primario btn-blocco" id="sg-crea">Crea squadra</button>
    </div>`;
  document.getElementById("sg-crea").addEventListener("click", () => {
    const nome = document.getElementById("sg-nome").value.trim();
    if(!nome){ mostraToast("Inserisci un nome.", "errore"); return; }
    const utente = Auth.utenteCorrente();
    SquadreGlobali.crea(utente.id, { nome, colore: document.getElementById("sg-colore").value });
    chiudiModalePartita();
    renderSquadreGlobali();
    mostraToast("Squadra creata. Ora puoi collegarla da un torneo, nella sezione Squadre.");
  });
  document.getElementById("modale-partita").classList.add("mostra");
}

function apriSchedaSquadraGlobale(id){
  const utente = Auth.utenteCorrente();
  const sq = SquadreGlobali.ottieni(id);
  if(!sq) return;
  const { totale, storico } = SquadreGlobali.statisticheAllTime(utente.id, id);

  const righeStorico = storico.length === 0
    ? `<p style="color:var(--ink-faint); font-size:0.85rem;">Non ancora collegata a nessun torneo.</p>`
    : storico.map(s => `
        <div class="riepilogo-riga">
          <span>${escapeHtml(s.torneoNome)}</span>
          <span>${s.vinte}V ${s.pareggi}P ${s.perse}S · ${s.punti} pt</span>
        </div>`).join("");

  document.getElementById("modale-partita-contenuto").innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:20px;">
      <div class="foto-giocatore grande">${sq.logo ? `<img src="${sq.logo}">` : `<span>${inizialiNome(sq.nome)}</span>`}</div>
      <h2 style="margin:0;">${escapeHtml(sq.nome)}</h2>
      <span class="pillola">${storico.length} tornei collegati</span>
    </div>

    <div id="bacheca-trofei" style="margin-bottom:20px;">
      <div class="trofeo"><span class="trofeo-numero">${totale.giocate}</span><span class="trofeo-nome">Giocate</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.vinte}</span><span class="trofeo-nome">Vinte</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.pareggi}</span><span class="trofeo-nome">Pareggi</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.perse}</span><span class="trofeo-nome">Perse</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.golFatti}</span><span class="trofeo-nome">Gol fatti</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.golSubiti}</span><span class="trofeo-nome">Gol subiti</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.dr > 0 ? "+" + totale.dr : totale.dr}</span><span class="trofeo-nome">Diff. reti</span></div>
      <div class="trofeo"><span class="trofeo-numero">${totale.punti}</span><span class="trofeo-nome">Punti totali</span></div>
    </div>

    <h4 style="font-size:0.78rem; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">Storico tornei</h4>
    <div class="riepilogo-lista" style="margin-bottom:20px;">${righeStorico}</div>

    <div class="modale-azioni">
      <button class="btn btn-pericolo" id="sg-elimina">Elimina squadra</button>
    </div>`;

  document.getElementById("sg-elimina").addEventListener("click", () => {
    if(!confirm(`Eliminare "${sq.nome}"? Le squadre nei singoli tornei resteranno, ma perderanno il collegamento e lo storico condiviso.`)) return;
    SquadreGlobali.elimina(id);
    chiudiModalePartita();
    renderSquadreGlobali();
    mostraToast("Squadra eliminata.");
  });

  document.getElementById("modale-partita").classList.add("mostra");
}
