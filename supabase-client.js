/* ============================================================
   SUPABASE-CLIENT.JS
   Punto unico di configurazione della connessione a Supabase.
   L'URL e la chiave "anon" qui sotto sono FATTI APPOSTA per stare
   nel codice pubblico del sito: senza le policy di sicurezza (RLS)
   configurate nel database sarebbero un problema, ma con RLS attivo
   sono sicuri by design — è così che Supabase è pensato.

   Non inserire MAI qui la "service_role key": quella bypassa tutte
   le regole di sicurezza e deve restare privata.
   ============================================================ */

const SUPABASE_URL = "https://kvndxyyncwueglbmbedp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1i_T1tFbNcOAfA7zEPYZOg_eDbcun-r";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
