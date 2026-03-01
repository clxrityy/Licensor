# Plan: Tauri Template-Based Document Generator

> **TL;DR** — Build a Tauri v2 desktop app that stores document templates (Markdown + YAML frontmatter), renders them with variable substitution, and exports as `.txt` or `.md` files. SQLite (with FTS5 for search and migration versioning) tracks all documents, templates, folders, and relations. The frontend is a minimal React sidebar-nav app. The Rust backend handles markdown parsing (comrak), template rendering (minijinja), and exposes Tauri commands for all CRUD operations. File attachments and metadata are stored alongside documents via the filesystem plugin.

**Target platforms**: macOS + Linux (primary). Windows best-effort — nothing platform-specific is used, so it should just work.

---

## 1. Add dependencies

**Rust (`Cargo.toml`)**:

| Crate | Purpose |
| :-- | :-- |
| `tauri-plugin-sql` with `sqlite` feature | SQLite for metadata |
| `tauri-plugin-fs` | Read/write template files and attachments |
| `tauri-plugin-dialog` | Save-file dialogs for export |
| `comrak` | Markdown + frontmatter → HTML for in-app preview |
| `minijinja` | `{{ variable }}` substitution with conditional support |
| `uuid` with `v4` feature | Document/template IDs |
| `chrono` with `serde` feature | Timestamps |
| `serde_yaml` | Parse frontmatter variable definitions into typed structs |

**JS (`package.json`)**:

| Package | Purpose |
| :-- | :-- |
| `@tauri-apps/plugin-sql` | Frontend DB queries |
| `@tauri-apps/plugin-fs` | File operations from frontend |
| `@tauri-apps/plugin-dialog` | Save-file dialogs for export location |
| `react-router-dom` | Sidebar navigation |

---

## 2. Configure Tauri capabilities

Update `default.json`:

- `sql:default` — database access
- `fs:default`, `fs:allow-read`, `fs:allow-write`, `fs:scope-app-data` — filesystem for templates/attachments
- `dialog:default` — save-file dialogs for export (add tauri-plugin-dialog if needed)

Register all plugins in `lib.rs`.

---

## 3. Design SQLite schema

Migration infrastructure:

```sql
CREATE TABLE _migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

Each migration is a numbered SQL block. On startup, run any where `version > MAX(version)` from `_migrations`. This is pure SQL — no external migration tool.

Core tables:

- **`folders`** — `id` (UUID), `parent_id` (nullable, self-ref for nesting), `name`, `created_at`, `updated_at`
- **`templates`** — `id` (UUID), `folder_id` (FK → folders), `name`, `content` (raw markdown+frontmatter), `variables` (JSON array of expected placeholders), `created_at`, `updated_at`
- **`documents`** — `id` (UUID), `template_id` (FK → templates), `folder_id` (FK → folders), `title`, `rendered_content`, `variable_values` (JSON object of filled-in values), `created_at`, `updated_at`
- **`attachments`** — `id` (UUID), `document_id` (FK → documents), `filename`, `file_path` (relative to app data dir), `mime_type`, `size_bytes`, `created_at`
- **`document_metadata`** — `id`, `document_id` (FK), `key`, `value` — free-form key/value annotations, tags, notes

Full-text search (FTS5):

```sql
CREATE VIRTUAL TABLE document_fts USING fts5(
  title,
  rendered_content,
  content=documents,
  content_rowid=rowid
)
```

With **INSERT**/**UPDATE**/**DELETE** triggers on `documents` to keep the FTS index synced. Must be in migration v1 — retrofitting FTS onto existing data is painful.

---

## 4. Build Rust backend commands

Split into modules:
`app/src/commands/{templates,documents,folders,attachments,export}.rs`

Template commands:

- `create_template` - parses frontmatter (comrak) to extract variable names, stores in DB
- `update_template`
- `delete_template`
- `list_templates`
- `get_template`
- `clone_template` - copy template raw with new UUID, append "(Copy)" to name. User modifies from there.

Document commands:

- `create_document_from_template` - takes template ID + variable values map → minijinja substituion → store rendered content
- `update_document`
- `delete_document`
- `list_documents`
- `get_document`
- `search_documents` - queries `documents_fts` with user input, returns ranked results

Folder commands:

- `create_folder`, `rename_folder`, `delete_folder`, `list_folder_contents`

Attachment commands:

- `add_attachment`, `delete_attachment`, `list_attachments`
- Files saved to `$APPDATA/attachments/{document_id}/{uuid}.{ext}`

Metadata commands:

- `set_metadata`, `get_metadata`, `delete_metadata`

Export commands:

- `export_document` - takes document ID + format (`"md"` or `"txt"`) → returns rendered string. Frontend handles save dialog + writing to disk.

---

## 5. Build frontend layout

```yaml
www/
  main.tsx              — React root + router setup
  App.tsx               — Layout shell (sidebar + content area)
  components/
    Sidebar.tsx         — Folder tree + nav links + search bar
    FolderTree.tsx      — Recursive nested folder display
    TemplateEditor.tsx  — Markdown textarea + frontmatter fields + live preview
    TemplateList.tsx    — Table/list of templates in a folder
    DocumentForm.tsx    — Fill in template variables → generate document
    DocumentList.tsx    — Table of documents with search/sort by date/title
    DocumentView.tsx    — Rendered markdown preview + download button
    AttachmentPanel.tsx — Upload/list/delete attachments for a document
    MetadataPanel.tsx   — Key-value editor for document annotations
    SearchResults.tsx   — (new) FTS5 search results display
  hooks/
    useDatabase.ts      — Thin wrapper around @tauri-apps/plugin-sql
    useDocuments.ts     — CRUD hooks for documents
    useTemplates.ts     — CRUD hooks for templates
    useFolders.ts       — CRUD hooks for folders
    useSearch.ts        — (new) Debounced FTS5 search hook
  lib/
    db.ts               — DB singleton, migration runner
    types.ts            — TypeScript interfaces matching the schema
  styles/
    global.css          — Base styles, layout grid
```

---

## 6. Core Flow: Template → Document → Export

1. User creates or selects a template (Markdown + fromatter defining `{{ variables }}`).
2. User clicks "New Document from Template" - form auto-generates input fields based on frontmatter `variables` array.
3. User fills variables, clicks "Generate" → Rust command runs minijinja substitution → stores rendered markdown in DB.
4. Document view shows rendered content (comrak → HTML for in-app preview only).
5. **"Download" button** → `tauri-plugin-dialog` save dialog (user picks location + filename) → write `.txt` or `.md` file to disk.

---

## 7. Template format convention

Templates are Markdown files with YAML frontmatter:

```yaml
---
name: "MIT License"
description: "Standard MIT License"
variables:
  - name: year
    label: "Year"
    type: text
    default: "2026"
  - name: holder
    label: "Copyright Holder"
    type: text
---

MIT License

Copyright (c) {{ year }} {{ holder }}

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

The frontmatter `variables` array drives form UI - labels, types, defaults defined in the template itself.

---

## 8. Pre-defined templates

Bundle 3-5 starter templates via Tauri's resource system (`tauri.conf.json` → `bundle.resources`). On first launch, insert into SQLite if not present.

Potential starter templates:

- *MIT License*
- *Apache 2.0 License*
- *GPLv3 License*
- ***Custom** Commercial License*
- ***Custom** NDA template*

---

### Verification

- **Schema**: Run app, verify SQLite DB exists at `$APPDATA/com.mjanglin.com.licensor/` with correct tables + FTS5 virtual table.
- **Migrations**: Verify `_migrations` table tracks applied versions.
- **Template CRUD**: Create, edit, clone, delete a template — persists across restart.
- **Document generation**: Create document from template with filled variables — markdown renders correctly.
- **Search**: Type a query in the search bar — FTS5 returns matching documents ranked by relevance.
- **Folder nesting**: Create folders 3 levels deep, move templates/documents between them.
- **Attachments**: Upload files to a document, verify stored on disk and listed in UI.
- **Export**: Click "Download" on a document, save dialog, valid `.md`/`.txt` file at chosen location.
- **Prebuilt templates**: Fresh instal loads starter templates.

---

### Decisions

| **Decision** | **Rationale** |
| :-- | :-- |
| comrak for preview only | Renders markdown → HTML for in-app display. Not used for export. |
| minijinja over `str::replace` | Templates may need `{% if %}` conditionals for optional clauses. ~100KB overhead, future proofs. |
| **.txt/.md export over PDF** | Licenses are text. No browser/binary dependency. Trivial implementation. PDF can be revisited later if needed. |
| SQLite + FTS5 from day 1 | Documents need querying  by date/template/folder + full-text search. Retrofitting FTS is painful - bake it in |
| Migration versioning | `_migrations` table tracks schema versions. No user data loss on updates. |
| Template cloning | Users can customize by cloning + editing, not by modifying originals. Preserves template integrity. |
| Module split | Rust commands in `app/src/{templates,documents,folders,attachments,export}.rs` - not one monolithic file. Easier maintenance. |
| No version pins on crates | Specify major versions for semver safety. Let minor/patch float. |
