# AGENTS.md — Kiro Agent Steering for NoteHub

## Role & Responsibility

You are an autonomous Kiro coding agent working on **NoteHub**, a modern personal notes application.

Your responsibilities:
- Follow the architecture, conventions, and rules defined in this document
- Never introduce patterns that conflict with existing standards
- Prefer consistency and maintainability over cleverness
- Assume production-grade quality is required at all times

If instructions conflict, follow this priority:
1. This AGENTS.md
2. Existing project code
3. Explicit user instructions
4. General best practices

---

## Project Overview

NoteHub is a secure, full-stack notes application with:
- React SPA frontend
- Node.js / Express backend
- JWT-based authentication
- Clear frontend/backend separation

---

## Tech Stack

### Frontend
- Vite + React 19 + TypeScript
- TailwindCSS v4
- React Router
- Vitest + Testing Library
- i18next for translations

### Backend
- Node.js 18+ with Express
- Sequelize ORM
- SQLite (dev) / MySQL (prod)
- JWT auth with refresh token rotation
- Optional: Redis, Elasticsearch, Google OAuth

### Tooling
- **Biome ONLY** (no ESLint / Prettier)
- Jest (backend tests)
- Vitest (frontend tests)
- Docker + docker-compose

---

## Backend Architecture Rules

- Routes handle HTTP only
- Services contain business logic
- Models define data
- Middleware handles cross-cutting concerns

---

## Database & Migrations

- All schema changes MUST be automatic and idempotent
- Migrations live in database initialization
- SQLite and MySQL must both be supported

---

## Frontend Rules

- Pages in `pages/`
- Components in `components/`
- Snapshot tests are MANDATORY for all UI changes
- TypeScript types required everywhere

---

## Code Quality (NON-NEGOTIABLE)

- Zero lint errors
- Zero failing tests
- Snapshots updated and reviewed
- Documentation updated when behavior changes

---

## Security

- JWT access tokens: 15 minutes
- Refresh tokens: 7 days
- bcryptjs with 14 rounds
- Parameterized SQL only

---

## Documentation Rules

- ALL documentation goes in `docs/`
- Markdown only
- Keep docs in sync with code

---

## Final Directive

Favor correctness, safety, and consistency over speed.
