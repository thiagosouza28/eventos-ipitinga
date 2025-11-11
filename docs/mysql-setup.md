# MySQL setup

Use this folder-level guidance to bootstrap a MySQL-only copy of the system that mirrors the Prisma schema.

The backend already expects `DATABASE_URL` to point at MySQL (`backend/.env` ships with a placeholder `mysql://root:password@127.0.0.1:3306/catre_ipitinga`), so replace that value with your actual credentials before starting the server.

## Prerequisites

1. Install MySQL 8+ (or compatible) and ensure a user can create databases/tables.
2. Point your `backend/.env` `DATABASE_URL` at the MySQL instance (`mysql://user:pass@host:3306/catre_ipitinga`).

## Apply the schema

```bash
mysql -u root -p < docs/mysql-schema.sql
```

This creates the `catre_ipitinga` database, every table, the indexes, and the FK constraints that match the Prisma schema. You only need to run it once; rerunning will recreate the tables via `CREATE TABLE` (MySQL will error if the database already exists, so drop it first if you must reapply).

## Prisma migrations

The repository now keeps a fresh MySQL migration in `backend/prisma/migrations/20251110120000_init`. Once your MySQL instance is available and pointed by `backend/.env`, run:

```bash
npm --workspace backend run prisma:generate
npm --workspace backend run prisma migrate deploy
```

This ensures Prisma can load the client and apply the tracked migration so the backend’s `ensureDatabaseSchema` logic finds all tables in place. You only need to run `migrate deploy` after the schema SQL has executed (or when you add new migrations in the future).

## Seed sample data

```bash
mysql -u root -p < docs/mysql-seed.sql
```

The seed script inserts the districts, churches, event, an `EventLot`, and the two users created by the existing Prisma seed (`Admin Geral` and `Usuario CATRE`). It stores the bcrypt hashes that match `Admin123!` and `281021`, so you can sign in with those passwords once the backend points at this MySQL instance.

If you prefer to keep using Prisma for seeding (e.g., to ensure the same logic runs when you switch environments), still run the SQL schema script first and then execute the regular Prisma seed command:

```bash
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:seed
```

Both the schema SQL and Prisma seed can coexist, and you can drop the MySQL objects before rerunning them when you want a clean slate.
