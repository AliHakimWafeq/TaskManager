# Task Manager

A self-hosted, single-user task manager in the spirit of Linear: projects with their own kanban workflow, rich task descriptions with inline images, labels, priorities, due dates, subtasks, a list view, a cross-project inbox, filters, and a command palette.

## Stack

- Next.js 16 (App Router, Server Actions, Route Handlers), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui
- SQLite via Drizzle ORM + better-sqlite3 (database file and uploaded images live in `data/`)
- dnd-kit for drag and drop, Tiptap for the description editor

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:3000. The `./data` folder on the host holds `app.db` and `uploads/`, so your data survives rebuilds. Migrations run automatically on startup.

## Local development

```bash
pnpm install
pnpm db:seed      # optional: demo project with a dozen tasks
pnpm dev
```

Other scripts:

| Script | What it does |
|---|---|
| `pnpm db:generate` | Generate a new SQL migration after editing `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `data/app.db` |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Type check, lint, unit tests |

Set `DATA_DIR` to change where the database and uploads are stored (default `./data`).

## Keyboard shortcuts

| Key | Action |
|---|---|
| `C` | New task |
| `⌘K` / `Ctrl+K` | Command palette: search tasks, jump to projects |
| `Esc` | Close the task panel |
| `⌘↵` | Submit the new-task dialog |

## Layout

```
app/                 routes (inbox, projects/[key] board|list|settings, issue/[id], @modal sheet, api/uploads)
components/          board/, task/, list/, projects/, layout/, ui/ (shadcn)
lib/db/              Drizzle schema, connection, migrations runner, seed
lib/actions/         Server Actions (projects, statuses, labels, tasks, search)
lib/queries/         read helpers used by server components
lib/filters.ts       URL search params <-> SQL predicates
drizzle/             generated migrations (committed)
```
