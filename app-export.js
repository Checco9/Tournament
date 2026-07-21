/* ============================================================
   APP-EXPORT.JS
   Esportazione PDF di classifica e calendario, generata nel
   browser con jsPDF (nessun server coinvolto).
   ============================================================ */

function nomeFilePDF(torneo, tipo){
  const slug = torneo.nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${tipo}-${slug || "torneo"}.pdf`;
}

function intestazionePDF(doc, torneo, sottotitolo){
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(torneo.nome, 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${sottotitolo} — generato il ${new Date().toLocaleDateString("it-IT")}`, 14, 27);
  doc.setTextColor(0);
  doc.setDrawColor(210);
  doc.line(14, 31, 196, 31);
  return 42; // coordinata y di partenza per il contenuto
}

function disegnaTabellaClassificaPDF(doc, y, titolo, righe){
  if(y > 265){ doc.addPage(); y = 20; }
  if(titolo){
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(31, 111, 80);
    doc.text(titolo, 14, y); y += 8;
    doc.setTextColor(0);
  }
  const colonne = [["Squadra", 14], ["PT", 124], ["G", 138], ["V", 150], ["P", 161], ["S", 172], ["DR", 183]];
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(130);
  colonne.forEach(([label, x]) => doc.text(label, x, y));
  doc.setTextColor(0);
  y += 4;
  doc.setDrawColor(220); doc.line(14, y, 196, y); y += 6;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  righe.forEach((r, i) => {
    if(y > 280){ doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}.`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(r.nome), 22, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(r.punti), 124, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(r.giocate), 139, y);
    doc.text(String(r.vinte), 150, y);
    doc.text(String(r.pareggi), 162, y);
    doc.text(String(r.perse), 173, y);
    doc.text(r.dr > 0 ? "+" + r.dr : String(r.dr), 183, y);
    y += 7;
  });
  return y + 8;
}

function esportaClassificaPDF(torneo){
  if(!window.jspdf){ mostraToast("Libreria PDF non disponibile: verifica la connessione.", "errore"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = intestazionePDF(doc, torneo, "Classifica");

  const vista = Formati.get(torneo.formato).calcolaVista(torneo);
  if(vista.tipo === "classifica_singola"){
    if(vista.classifica.length === 0){ doc.setFontSize(11); doc.text("Nessuna squadra ancora.", 14, y); }
    else y = disegnaTabellaClassificaPDF(doc, y, null, vista.classifica);
  }else if(vista.tipo === "classifiche_multiple"){
    vista.gruppi.forEach(g => { y = disegnaTabellaClassificaPDF(doc, y, `Girone ${g.nome}`, g.classifica); });
  }else if(vista.tipo === "mista"){
    vista.gironi.gruppi.forEach(g => { y = disegnaTabellaClassificaPDF(doc, y, `Girone ${g.nome}`, g.classifica); });
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(120);
    doc.text("Il tabellone a eliminazione diretta non è incluso in questo PDF: consultalo nell'app.", 14, y);
    doc.setTextColor(0);
  }else if(vista.tipo === "bracket"){
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text("Questo torneo è a eliminazione diretta: il tabellone si consulta nell'app", 14, y);
    doc.text("(la modalità maxi-schermo è pensata apposta per mostrarlo su un proiettore).", 14, y + 6);
  }

  doc.save(nomeFilePDF(torneo, "classifica"));
}

function esportaCalendarioPDF(torneo){
  if(!window.jspdf){ mostraToast("Libreria PDF non disponibile: verifica la connessione.", "errore"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = intestazionePDF(doc, torneo, "Calendario");

  const nome = id => id ? ((torneo.squadre.find(s => s.id === id) || {}).nome || "—") : "Da definire";
  const partite = [...torneo.partite].sort((a, b) => a.turno - b.turno);

  if(partite.length === 0){
    doc.setFontSize(11);
    doc.text("Nessuna partita in calendario ancora.", 14, y);
  }

  let giornataCorrente = null;
  partite.forEach(p => {
    if(y > 278){ doc.addPage(); y = 20; }
    const etichetta = p.etichettaTurno || `Giornata ${p.turno}`;
    if(etichetta !== giornataCorrente){
      giornataCorrente = etichetta;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(31, 111, 80);
      doc.text(etichetta, 14, y);
      doc.setTextColor(0);
      y += 7;
    }
    const risultato = p.bye ? "bye" : p.giocata ? `${p.golCasa} - ${p.golTrasferta}` : "vs";
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`${nome(p.casaId)}   ${risultato}   ${nome(p.trasfertaId)}`, 18, y);
    y += 5;
    const dettagli = [p.dataOra ? formattaDataOra(p.dataOra) : null, p.campo || null, p.stato === "rinviata" ? "RINVIATA" : null].filter(Boolean).join("  ·  ");
    if(dettagli){
      doc.setFontSize(8.5); doc.setTextColor(130);
      doc.text(dettagli, 18, y);
      doc.setTextColor(0);
      y += 5;
    }
    y += 3;
  });

  doc.save(nomeFilePDF(torneo, "calendario"));
}
