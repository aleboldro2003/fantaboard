# FantaBoard 2026/27

Dashboard web per preparare e seguire l'asta del Fantacalcio Serie A 2026/27.

## Funzioni

- listone ufficiale con ruoli Classic e Mantra, quotazioni, FVM e statistiche;
- filtri, shortlist, target crediti e alternative per fascia;
- dossier delle 20 squadre e gerarchie di rigori, punizioni e corner;
- registrazione e login con Supabase Auth;
- dashboard privata per creare la squadra e registrare acquisti e prezzi durante l'asta;
- riepilogo automatico di crediti residui, slot e spesa per reparto;
- 20 loghi Serie A 2026/27 in SVG trasparente.

## Avvio locale

Richiede Node.js 22.13 o successivo.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Le variabili richieste sono:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Usare soltanto la chiave **publishable** di Supabase. Non inserire mai una service-role key nel frontend.

## Database

La migrazione versionata si trova in `supabase/migrations`. Le tabelle `auction_teams` e `auction_purchases` hanno Row Level Security: ogni account può leggere e modificare soltanto i propri dati.

## Deploy su Vercel

1. Importare questo repository in Vercel.
2. Aggiungere le due variabili Supabase in **Project Settings → Environment Variables** per Production, Preview e Development.
3. Eseguire il deploy. `vercel.json` usa la build Next.js dedicata.
4. In Supabase, aggiungere il dominio Vercel tra gli URL consentiti in **Authentication → URL Configuration** per il redirect delle email di registrazione.

## Fonti dati

Listone e statistiche sono sincronizzati da Fantacalcio.it. Le gerarchie sui piazzati sono editoriali e possono cambiare. I loghi trasparenti provengono da FootyLogos e restano proprietà dei rispettivi club.
