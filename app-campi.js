/* ============================================================
   APP-CAMPI.JS
   Elenco dei campi di gioco del torneo, con mappa incorporata a
   partire dall'indirizzo (embed Google Maps, nessuna chiave API
   richiesta). Il nome del campo diventa anche un suggerimento nel
   campo "Campo" del modale partita (vedi app-partita.js).
   ============================================================ */

function renderCampiHTML(torneo){
  const campi = torneo.campi || [];
  const cards = campi.map(c => `
    <div class="card-campo" data-id="${c.id}">
      <div class="card-campo-info">
        <h3>${escapeHtml(c.nome)}</h3>
        ${c.indirizzo ? `<p class="indirizzo-campo"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.indirizzo)}</p>` : ""}
        ${c.note ? `<p class="note-campo">${escapeHtml(c.note)}</p>` : ""}
        <button class="btn-testo elimina-campo" data-id="${c.id}"><i class="fa-solid fa-trash"></i> Elimina</button>
      </div>
      ${c.indirizzo ? `
        <div class="mappa-campo">
          <iframe src="https://www.google.com/maps?q=${encodeURIComponent(c.indirizzo)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>` : `<div class="mappa-campo mappa-vuota"><i class="fa-solid fa-map"></i><span>Aggiungi un indirizzo per vedere la mappa</span></div>`}
    </div>`).join("");

  return `
    <div class="pannello-testata"><h2>Campi</h2></div>
    <div class="blocco-impostazioni" style="max-width:640px;">
      <h3>Aggiungi campo</h3>
      <div class="campo"><label style="font-weight:400;">Nome campo</label><input type="text" id="cp-nome" placeholder="Es. Palestra Comunale"></div>
      <div class="campo"><label style="font-weight:400;">Indirizzo</label><input type="text" id="cp-indirizzo" placeholder="Via, città (usato per la mappa)"></div>
      <div class="campo"><label style="font-weight:400;">Note (facoltative)</label><input type="text" id="cp-note" placeholder="Es. Ingresso da via laterale"></div>
      <button class="btn btn-primario" id="btn-aggiungi-campo"><i class="fa-solid fa-plus"></i> Aggiungi campo</button>
    </div>
    <div class="griglia-campi">
      ${cards || `<p style="color:var(--ink-faint);">Nessun campo ancora. Aggiungine uno per poterlo assegnare alle partite.</p>`}
    </div>`;
}

function attachCampiHandlers(torneo){
  document.getElementById("btn-aggiungi-campo").addEventListener("click", () => {
    const nome = document.getElementById("cp-nome").value.trim();
    if(!nome){ mostraToast("Inserisci un nome per il campo.", "errore"); return; }
    Tornei.aggiungiCampo(torneo.id, {
      nome,
      indirizzo: document.getElementById("cp-indirizzo").value.trim(),
      note: document.getElementById("cp-note").value.trim()
    });
    renderTorneo();
    mostraToast("Campo aggiunto.");
  });

  document.querySelectorAll(".elimina-campo").forEach(el => {
    el.addEventListener("click", () => {
      if(!confirm("Eliminare questo campo?")) return;
      Tornei.eliminaCampo(torneo.id, el.dataset.id);
      renderTorneo();
      mostraToast("Campo eliminato.");
    });
  });
}
