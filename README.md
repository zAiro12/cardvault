# CardVault

Webapp multi-TCG per gestire il magazzino di carte collezionabili: catalogo, copie fisiche, posizioni, prenotazioni e prezzi CardTrader.

## Stack
- Frontend: Vue 3, TypeScript, Vite, Pinia, Vue Router
- UI: PrimeVue, PrimeIcons
- Backend: Node.js, Express, TypeScript, Zod
- Database: PostgreSQL, Prisma
- Hosting: GitHub Pages (frontend), Vercel Functions (API)

> GitHub Pages ospita solo frontend statico. Le API e le credenziali CardTrader devono stare sul backend Vercel. PostgreSQL si collega tramite un provider supportato dal Vercel Marketplace (es. Neon).

## Avvio locale
1. Installa Node.js LTS e npm.
2. Copia `.env.example` in `.env` e valorizza `DATABASE_URL` e `JWT_SECRET`.
3. `npm install`
4. `npm run dev` per Vue.
5. In un secondo terminale: `npm run dev:api`.
6. Per Prisma: `npm run db:generate --workspace backend`, quindi `npm run db:migrate --workspace backend`.

Frontend: http://localhost:5173
API locale: http://localhost:3000/api/health

## Deploy
### GitHub Pages
- Impostare GitHub repository > Settings > Pages > Build and deployment: GitHub Actions.
- Il workflow `frontend-deploy.yml` builda il frontend e pubblica `frontend/dist`.
- Il path base Vite è configurato per repository `cardvault`.

### Vercel
- Importare il repository in Vercel e impostare Root Directory `backend`.
- Configurare `DATABASE_URL`, `CARDTRADER_API_TOKEN`, `JWT_SECRET` e `CARDTRADER_API_URL`.
- `backend/api/index.ts` espone Express come Vercel Function.
- Vercel Cron per sync prezzi va configurato dopo aver implementato e protetto il job; non attivare sync ad alta frequenza prima di controllare rate limits CardTrader.

## Integrazione CardTrader
Il servizio iniziale usa Bearer token e una route placeholder protetta da configurazione. Prima di attivare i prezzi, verificare gli endpoint/permessi del proprio account nella documentazione ufficiale: https://www.cardtrader.com/en-US/docs/api/full/reference
Non committare mai token o secrets.

## Stato
Starter scaffold: dashboard e API health implementate; CRUD, autenticazione, scanner ottico, sincronizzazione CardTrader e prenotazioni sono milestones successive.
