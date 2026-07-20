/* ============================================================
   APP-NEWS.JS
   Bacheca aggiornamenti in stile feed. L'organizzatore pubblica,
   chi consulta il torneo può commentare e votare il proprio MVP
   della partita: è un voto "dei tifosi", indicativo — il MVP
   ufficiale resta sempre quello scelto dall'organizzatore nel
   modale della partita.
   ============================================================ */

function estraiIdYouTube(url){
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function renderVideoEmbedHTML(url){
  if(!url) return "";
  const ytId = estraiIdYouTube(url);
  if(ytId){
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${ytId}" loading="lazy" allowfullscreen title="Video highlight"></iframe></div>`;
  }
  if(/tiktok\.com/i.test(url)){
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="link-video-esterno"><i class="fa-brands fa-tiktok"></i> Guarda su TikTok</a>`;
  }
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="link-video-esterno"><i class="fa-solid fa-video"></i> Guarda il video</a>`;
}

function giocatoriPartitaPerVoto(torneo, partita){
  const idsCasa = partita.formazioni?.[partita.casaId];
  const idsTrasferta = partita.formazioni?.[partita.trasfertaId];
  const idsUnione = [
    ...(idsCasa ? [...(idsCasa.titolari || []), ...(idsCasa.panchina || [])] : Tornei.giocatoriSquadra(torneo, partita.casaId).map(g => g.id)),
    ...(idsTrasferta ? [...(idsTrasferta.titolari || []), ...(idsTrasferta.panchina || [])] : Tornei.giocatoriSquadra(torneo, partita.trasfertaId).map(g => g.id))
  ];
  return torneo.giocatori.filter(g => idsUnione.includes(g.id));
}

function renderNewsHTML(torneo){
  const partiteGiocate = torneo.partite.filter(p => p.giocata && !p.bye);
  const opzioniPartite = partiteGiocate.map(p => {
    const casa = torneo.squadre.find(s => s.id === p.casaId)?.nome || "—";
    const trasferta = torneo.squadre.find(s => s.id === p.trasfertaId)?.nome || "—";
    return `<option value="${p.id}">${escapeHtml(p.etichettaTurno || "")} — ${escapeHtml(casa)} vs ${escapeHtml(trasferta)}</option>`;
  }).join("");

  const feed = (torneo.news || []).map(post => renderPostHTML(torneo, post)).join("");

  return `
    <div class="pannello-testata"><h2>News</h2></div>
    <div class="blocco-impostazioni" style="max-width:640px;">
      <h3>Nuovo aggiornamento</h3>
      <div class="campo"><label style="font-weight:400;">Testo</label><textarea id="nw-testo" rows="3" placeholder="Scrivi un aggiornamento per chi segue il torneo..."></textarea></div>
      <div class="campo"><label style="font-weight:400;">Immagine (facoltativa)</label><input type="file" id="nw-immagine" accept="image/*"></div>
      <div class="campo"><label style="font-weight:400;">Link video YouTube o TikTok (facoltativo)</label><input type="text" id="nw-video" placeholder="https://youtube.com/... oppure https://tiktok.com/..."></div>
      ${partiteGiocate.length > 0 ? `
        <div class="campo">
          <label style="font-weight:400;">Collega a una partita (attiva il voto MVP dei tifosi)</label>
          <select id="nw-partita"><option value="">Nessuna</option>${opzioniPartite}</select>
        </div>` : ""}
      <button class="btn btn-primario" id="btn-pubblica-news"><i class="fa-solid fa-paper-plane"></i> Pubblica</button>
    </div>

    <div class="feed-news">
      ${feed || `<p style="color:var(--ink-faint);">Nessun aggiornamento pubblicato ancora.</p>`}
    </div>`;
}

function renderPostHTML(torneo, post){
  const partita = post.partitaId ? Tornei.ottieniPartita(torneo, post.partitaId) : null;

  const commentiHTML = post.commenti.map(c => `
    <div class="commento">
      <span class="commento-nome">${escapeHtml(c.nome)}</span>
      <span class="commento-testo">${escapeHtml(c.testo)}</span>
    </div>`).join("");

  let sezioneMvp = "";
  if(partita){
    const giocatori = giocatoriPartitaPerVoto(torneo, partita);
    const voti = partita.votiMvpTifosi || {};
    const totaleVoti = Object.values(voti).reduce((a, b) => a + b, 0);
    const giaVotato = localStorage.getItem(`votoMvp_${partita.id}`) === "1";
    const mvpUfficiale = partita.mvpGiocatoreId ? torneo.giocatori.find(g => g.id === partita.mvpGiocatoreId) : null;

    sezioneMvp = `
      <div class="riquadro-mvp-tifosi">
        <h4><i class="fa-solid fa-star"></i> MVP dei tifosi ${giaVotato ? "" : "— vota il tuo preferito"}</h4>
        ${mvpUfficiale ? `<p class="mvp-ufficiale-badge">MVP ufficiale scelto dall'organizzatore: <strong>${escapeHtml(mvpUfficiale.nome)}</strong></p>` : ""}
        <div class="lista-voti-mvp">
          ${giocatori.map(g => {
            const v = voti[g.id] || 0;
            const perc = totaleVoti > 0 ? Math.round((v / totaleVoti) * 100) : 0;
            return `
              <div class="riga-voto-mvp">
                <button class="btn-voto-mvp" data-partita="${partita.id}" data-giocatore="${g.id}" ${giaVotato ? "disabled" : ""}>
                  <span class="nome-voto">${escapeHtml(g.nome)}</span>
                  <span class="barra-voto"><span class="barra-voto-riempimento" style="width:${perc}%"></span></span>
                  <span class="conteggio-voto">${v}</span>
                </button>
              </div>`;
          }).join("") || `<p style="color:var(--ink-faint); font-size:0.8rem;">Nessun giocatore schierato per questa partita.</p>`}
        </div>
        ${giaVotato ? `<p class="hint-formazioni">Hai già votato per questa partita da questo dispositivo.</p>` : ""}
      </div>`;
  }

  return `
    <article class="post-news" data-id="${post.id}">
      <div class="post-news-header">
        <span class="post-news-data">${formattaDataOra(post.dataCreazione)}</span>
        <button class="btn-testo elimina-news" data-id="${post.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
      <p class="post-news-testo">${escapeHtml(post.testo)}</p>
      ${post.immagine ? `<img class="post-news-immagine" src="${post.immagine}" alt="">` : ""}
      ${renderVideoEmbedHTML(post.linkVideo)}
      ${sezioneMvp}
      <div class="post-news-commenti">
        ${commentiHTML}
        <div class="form-commento">
          <input type="text" class="commento-nome-input" placeholder="Il tuo nome" data-post="${post.id}">
          <input type="text" class="commento-testo-input" placeholder="Scrivi un commento..." data-post="${post.id}">
          <button class="btn-invia-commento" data-post="${post.id}"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </article>`;
}

function attachNewsHandlers(torneo){
  document.getElementById("btn-pubblica-news").addEventListener("click", async () => {
    const testo = document.getElementById("nw-testo").value.trim();
    if(!testo){ mostraToast("Scrivi qualcosa da pubblicare.", "errore"); return; }

    let immagine = null;
    const fileInput = document.getElementById("nw-immagine");
    if(fileInput.files[0]){
      try{ immagine = await leggiImmagineCompressa(fileInput.files[0], 640, 0.78); }
      catch{ mostraToast("Impossibile caricare l'immagine.", "errore"); }
    }

    Tornei.aggiungiNews(torneo.id, {
      testo, immagine,
      linkVideo: document.getElementById("nw-video").value.trim(),
      partitaId: document.getElementById("nw-partita")?.value || null
    });
    renderTorneo();
    mostraToast("Aggiornamento pubblicato.");
  });

  document.querySelectorAll(".elimina-news").forEach(el => {
    el.addEventListener("click", () => {
      if(!confirm("Eliminare questo aggiornamento?")) return;
      Tornei.eliminaNews(torneo.id, el.dataset.id);
      renderTorneo();
    });
  });

  document.querySelectorAll(".btn-invia-commento").forEach(el => {
    el.addEventListener("click", () => {
      const postId = el.dataset.post;
      const nomeInput = document.querySelector(`.commento-nome-input[data-post="${postId}"]`);
      const testoInput = document.querySelector(`.commento-testo-input[data-post="${postId}"]`);
      if(!testoInput.value.trim()){ mostraToast("Scrivi un commento prima di inviare.", "errore"); return; }
      Tornei.aggiungiCommento(torneo.id, postId, { nome: nomeInput.value, testo: testoInput.value });
      renderTorneo();
    });
  });

  document.querySelectorAll(".btn-voto-mvp").forEach(el => {
    el.addEventListener("click", () => {
      const partitaId = el.dataset.partita;
      Tornei.votaMvpTifosi(torneo.id, partitaId, el.dataset.giocatore);
      localStorage.setItem(`votoMvp_${partitaId}`, "1");
      renderTorneo();
      mostraToast("Voto registrato, grazie!");
    });
  });
}
