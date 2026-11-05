# Database

Schema Prisma iniziale in `backend/prisma/schema.prisma`.

Modelli principali: User, Card, Location (tree), InventoryItem, Reservation, InventoryMovement, PriceHistory, SyncJob, Setting, AuditLog.

Prima della produzione: implementare autenticazione, tenant/user filtering, transazioni per riservazioni e movimentazioni, indici e policy backup.
