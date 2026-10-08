---
name: task-manager
description: Create, read, update and organize tickets in this repo's Task Manager app (Linear-style projects, statuses, labels, subtasks) through its JSON API, with descriptions written as Markdown. Use when asked to file tickets, break work into tasks or subtasks, update a ticket's status, priority, due date or labels, append notes to a ticket, or list and search existing tasks.
---

# Task Manager API

The app exposes a small JSON API. Descriptions go in and come out as **Markdown**; the server converts to and from the editor's rich-text format. For the Markdown dialect (underline `++x++`, highlight `==x==`, checklists, what is unsupported), follow the `tiptap-rich-text` skill.

## Find the running app

```bash
for p in 3001 3000 3100; do curl -sf "http://localhost:$p/api/projects" >/dev/null && echo "http://localhost:$p" && break; done
```

- `3001`: the Docker container (the user's real data in `./data`).
- `3100`: `pnpm dev:sandbox`, a throwaway database in `.dev-data`. Use it when testing.

Write to the user's real instance only when they asked for real tickets.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | Projects with statuses (board order, type) and labels |
| GET | `/api/tasks?project=KEY` | List tasks. Filters: `q`, `priority=high,urgent`, `type=started`, `label=<label id>`, `due=overdue\|today\|week\|none\|any`, `sort=priority\|dueDate\|updatedAt\|createdAt\|title`, `subtasks=1`, `limit` |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/KEY-12` | One task, `description` as Markdown, subtasks |
| PATCH | `/api/tasks/KEY-12` | Partial update |
| DELETE | `/api/tasks/KEY-12` | Delete. Subtasks become top-level. Confirm with the user first. |
| POST | `/api/uploads` | Multipart `file=@img.png` (PNG, JPEG, GIF, WebP, SVG; 10 MB). Returns `{ "url": "/api/uploads/…" }` |

### Create body

```json
{
  "project": "WEB",
  "title": "Add OAuth login",
  "description": "## Goal\nLet users sign in with **Google**.\n\n## Acceptance criteria\n- [ ] Google button on login page\n- [ ] Session survives reload",
  "status": "Todo",
  "priority": "high",
  "dueDate": "2026-10-20",
  "labels": ["Feature", "Auth"],
  "parent": "WEB-11"
}
```

- Only `project` and `title` are required.
- `status` matches a status name case-insensitively, or a type: `backlog`, `unstarted`, `started`, `completed`, `cancelled`. Default: the first column.
- `priority`: `none`, `low`, `medium`, `high`, `urgent`.
- `labels` are names. Missing labels are **created** in the project, so reuse existing names from `/api/projects` to avoid near-duplicates.
- `parent` is an identifier. Subtasks are one level deep: the parent must be a top-level task in the same project.

### Update body (all optional)

`title`, `description` (replaces; `null` clears), `appendDescription` (adds Markdown at the end; don't combine with `description`), `status`, `priority`, `dueDate` (`null` clears), `labels` (replaces the set), `parent` (identifier or `null`).

Errors come back as `{ "error": "…" }` with status 400, 403 or 404, naming the valid options where useful.

## Recipes

Create a ticket from a Markdown file:

```bash
BASE=http://localhost:3001
jq -n --rawfile d plan.md '{project:"WEB", title:"Ship OAuth", description:$d, priority:"high"}' \
  | curl -s -X POST "$BASE/api/tasks" -H 'content-type: application/json' -d @-
```

Break work into subtasks: create the parent first, then POST each child with `"parent": "WEB-13"`.

Log progress without rewriting the body:

```bash
curl -s -X PATCH "$BASE/api/tasks/WEB-13" -H 'content-type: application/json' \
  -d '{"appendDescription":"### 2026-10-08\n- Callback route merged\n- Next: token refresh","status":"In Progress"}'
```

Attach a screenshot: upload, then reference the returned URL. The upload links the file to the task once the description references it.

```bash
URL=$(curl -sf -F "file=@shot.png;type=image/png" "$BASE/api/uploads" | jq -r '.url // empty')
test -n "$URL" || { echo "upload failed"; exit 1; }
curl -s -X PATCH "$BASE/api/tasks/WEB-13" -H 'content-type: application/json' \
  -d "{\"appendDescription\":\"![Login screen]($URL)\"}"
```

## Good tickets

- Title: imperative and specific ("Add OAuth login", not "OAuth").
- Description: one-line outcome, then `## Context`, `## Plan` or `## Acceptance criteria` as checklists, `## Notes`.
- Pick priority honestly; leave `none` if unknown. Set `dueDate` only when there is a real date.
- After creating or editing, read the task back with GET and report its identifier and `url` to the user.
