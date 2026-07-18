/* ============================================================
   CORE-UTILS.JS
   Funzioni generiche usate da più moduli. Nessuna logica di
   dominio qui dentro, solo utility riusabili.
   ============================================================ */

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function inizialiNome(nome){
  return (nome || "?").trim().split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function formattaData(iso){
  if(!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function formattaDataOra(iso){
  if(!iso) return "Data da definire";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) + " · " +
         d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function calcolaEta(dataNascitaIso){
  if(!dataNascitaIso) return null;
  const oggi = new Date();
  const nascita = new Date(dataNascitaIso);
  let eta = oggi.getFullYear() - nascita.getFullYear();
  const mese = oggi.getMonth() - nascita.getMonth();
  if(mese < 0 || (mese === 0 && oggi.getDate() < nascita.getDate())) eta--;
  return eta;
}

/**
 * Legge un file immagine caricato dall'utente e lo restituisce come
 * data URL ridimensionato/compresso, per non riempire troppo lo
 * spazio disponibile in localStorage (limite tipico ~5-10MB totali).
 */
function leggiImmagineCompressa(file, latoMassimo = 300, qualita = 0.82){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossibile leggere il file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File immagine non valido."));
      img.onload = () => {
        let { width, height } = img;
        if(width > height && width > latoMassimo){
          height = Math.round(height * (latoMassimo / width));
          width = latoMassimo;
        }else if(height > latoMassimo){
          width = Math.round(width * (latoMassimo / height));
          height = latoMassimo;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", qualita));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function mostraToast(msg, tipo = "successo"){
  const el = document.createElement("div");
  el.className = "toast" + (tipo === "errore" ? " errore" : "");
  el.textContent = msg;
  document.getElementById("toast-contenitore").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
