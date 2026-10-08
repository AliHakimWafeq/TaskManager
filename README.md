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

Open http://localhost:3001. The `./data` folder on the host holds `app.db` and `uploads/`, so your data survives rebuilds. Migrations run automatically on startup.

## Local development

```bash
pnpm install
pnpm dev
```

To experiment without touching your real tasks, use the sandbox. It keeps its own database in `.dev-data/` and runs on port 3100:

```bash
pnpm db:seed:sandbox
pnpm dev:sandbox
```

Other scripts:

| Script                                       | What it does                                                  |
| -------------------------------------------- | ------------------------------------------------------------- |
| `pnpm db:seed`                               | Demo project with a dozen tasks (only into an empty database) |
| `pnpm db:generate`                           | Generate a new SQL migration after editing `lib/db/schema.ts` |
| `pnpm db:migrate`                            | Apply migrations to `data/app.db`                             |
| `pnpm db:studio`                             | Open Drizzle Studio                                           |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Type check, lint, unit tests                                  |

Set `DATA_DIR` to change where the database and uploads are stored (default `./data`).

## Keyboard shortcuts

| Key                                        | Action                                          |
| ------------------------------------------ | ----------------------------------------------- |
| `C`                                        | New task                                        |
| `⌘K` (Mac) / `Ctrl+K` (Windows, Linux)     | Command palette: search tasks, jump to projects |
| `Esc`                                      | Close the task panel                            |
| `⌘↵` (Mac) / `Ctrl+Enter` (Windows, Linux) | Submit the new-task dialog                      |

Labels in the UI switch between `⌘` and `Ctrl` automatically based on your platform.

## Writing descriptions

The description editor works like Linear or Notion. There are four ways to format:

- **Toolbar** above the text, with tooltips that show each shortcut.
- **Selection menu**: select text to get a floating bar for marks, headings and lists.
- **Slash menu**: type `/` on any line for headings, lists, checklists, quotes, code, dividers and images.
- **Markdown**: type it as you go, or paste a whole Markdown document and it converts.

| Format | Shortcut | Markdown |
| --- | --- | --- |
| Heading 1 / 2 / 3 | `⌘⌥1` / `⌘⌥2` / `⌘⌥3` | `#`, `##`, `###` |
| Bold, italic | `⌘B`, `⌘I` | `**bold**`, `*italic*` |
| Underline | `⌘U` | `++underline++` |
| Strikethrough | `⌘⇧S` | `~~strike~~` |
| Highlight | `⌘⇧H` | `==highlight==` |
| Inline code | `⌘E` | `` `code` `` |
| Link | `⌘K` with text selected | `[text](https://…)` |
| Bulleted / numbered list | `⌘⇧8` / `⌘⇧7` | `- ` / `1. ` |
| Checklist | `⌘⇧9` | `[ ] ` |
| Quote, code block | `⌘⇧B`, `⌘⌥C` | `> `, ```` ``` ```` |
| Divider | | `---` |
| Image | paste, drop, or `/image` | |

On Windows and Linux use `Ctrl` for `⌘` and `Alt` for `⌥`.

## Subtasks

Any task can have subtasks, one level deep. Add them from a task's page, or use the **Parent** picker to turn an existing task into a subtask. The **Subtasks** toggle on the board, list and inbox shows them as their own tickets, with their parent next to the title. Every task, subtask or not, opens in the side panel and has a full page at `/issue/KEY-N`.

## JSON API

The API accepts and returns descriptions as Markdown. Writes from other websites are rejected, and there is no authentication, so keep the app on a trusted network.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects` | Projects with statuses and labels |
| GET | `/api/tasks?project=KEY` | List tasks. Supports the same filters as the UI, plus `subtasks=1` and `limit` |
| POST | `/api/tasks` | Create: `project`, `title`, and optional `description`, `status`, `priority`, `dueDate`, `labels`, `parent` |
| GET | `/api/tasks/KEY-N` | One task, with its description as Markdown |
| PATCH | `/api/tasks/KEY-N` | Update any field. `appendDescription` adds Markdown to the end |
| DELETE | `/api/tasks/KEY-N` | Delete a task |
| POST | `/api/uploads` | Upload an image (multipart `file`) and get back a URL for Markdown |

```bash
curl -X POST localhost:3001/api/tasks -H 'content-type: application/json' \
  -d '{"project":"WEB","title":"Add OAuth","description":"## Goal\n- [ ] Google login","priority":"high"}'
```

## AI skills

- `.claude/skills/task-manager/` teaches Claude to file and update tickets in this app through the API.
- `~/.claude/skills/tiptap-rich-text/` lives outside this repo, so every project can use it. It covers writing Markdown that converts cleanly into any Tiptap editor. It includes `scripts/convert.mjs` for Markdown to Tiptap JSON and back, using the target project's own Tiptap packages.

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
