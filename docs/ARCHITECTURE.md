# Architettura

- SPA Vue 3 su GitHub Pages.
- API Express in Vercel Functions.
- PostgreSQL managed database, con Prisma ORM.
- CardTrader API chiamata solo dal server.
- Frontend route history uses hash history to avoid Pages rewrite requirements.

## Principi
- Segreti solo nel backend/hosting.
- API validate input with Zod.
- Inventario e copie fisiche distinti dal catalogo.
- Le prenotazioni active/reserved/confirmed must be checked transactionally against available stock.
- Cron price sync needs retry, rate limiting, audit and price history.
