// www/lib/db.ts
import Database from "@tauri-apps/plugin-sql";

// ─── Singleton ───────────────────────────────────────────────────────────────
// One DB connection for the lifetime of the app.
let _db: Database | null = null;

export async function getDb(): Promise<Database> {
	if (!_db) {
		// "sqlite:licensor.db" is relative to the Tauri app data directory.
		// Tauri resolves this to: $APPDATA/com.mjanglin.com.licensor/licensor.db
		_db = await Database.load("sqlite:licensor.db");
		await runMigrations(_db);
	}
	return _db;
}

// ─── Migrations ──────────────────────────────────────────────────────────────
// Each entry is a { version, statements[] } pair.
// Each statement is a complete SQL string — no splitting needed.
// This avoids the semicolon-inside-trigger problem that breaks naive .split(";").
const MIGRATIONS: { version: number; statements: string[] }[] = [
	{
		version: 1,
		statements: [
			// Track which migrations have been applied.
			// This is the bootstrap table — must exist before any other migration runs.
			`CREATE TABLE IF NOT EXISTS _migrations (
                version    INTEGER PRIMARY KEY,
                applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )`,

			// Folders: supports arbitrary nesting via self-referential parent_id.
			`CREATE TABLE IF NOT EXISTS folders (
                id         TEXT PRIMARY KEY,
                parent_id  TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name       TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )`,

			// Templates: raw markdown + frontmatter content.
			// variables is a JSON array of TemplateVariable objects (parsed from frontmatter).
			`CREATE TABLE IF NOT EXISTS templates (
                id         TEXT PRIMARY KEY,
                folder_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
                name       TEXT NOT NULL,
                content    TEXT NOT NULL,
                variables  TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )`,

			// Documents: the rendered output from a template + filled variables.
			// variable_values is a JSON object: { "year": "2026", "holder": "Acme" }
			`CREATE TABLE IF NOT EXISTS documents (
                id               TEXT PRIMARY KEY,
                template_id      TEXT NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
                folder_id        TEXT REFERENCES folders(id) ON DELETE SET NULL,
                title            TEXT NOT NULL,
                rendered_content TEXT NOT NULL,
                variable_values  TEXT NOT NULL DEFAULT '{}',
                created_at       TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
            )`,

			// FTS5 virtual table: indexes title + rendered_content from documents.
			// content= tells FTS5 this is a "content table" (no data duplication).
			// content_rowid= maps FTS rowid to documents.rowid for joins.
			`CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(
                title,
                rendered_content,
                content=documents,
                content_rowid=rowid
            )`,

			// Triggers keep the FTS index in sync with documents table mutations.
			// Without these, searches return stale or missing results after writes.
			`CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
                INSERT INTO document_fts(rowid, title, rendered_content)
                VALUES (new.rowid, new.title, new.rendered_content);
            END`,

			`CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
                INSERT INTO document_fts(document_fts, rowid, title, rendered_content)
                VALUES ('delete', old.rowid, old.title, old.rendered_content);
            END`,

			// Update trigger: remove old FTS entry, insert new one.
			`CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
                INSERT INTO document_fts(document_fts, rowid, title, rendered_content)
                VALUES ('delete', old.rowid, old.title, old.rendered_content);
                INSERT INTO document_fts(rowid, title, rendered_content)
                VALUES (new.rowid, new.title, new.rendered_content);
            END`,

			// File attachments stored on disk; DB tracks metadata only.
			// file_path is relative to $APPDATA so it stays portable across machines.
			`CREATE TABLE IF NOT EXISTS attachments (
                id          TEXT PRIMARY KEY,
                document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                filename    TEXT NOT NULL,
                file_path   TEXT NOT NULL,
                mime_type   TEXT NOT NULL DEFAULT 'application/octet-stream',
                size_bytes  INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            )`,

			// Free-form key/value metadata per document.
			// Use for tags, custom annotations, etc. Intentionally schema-less.
			`CREATE TABLE IF NOT EXISTS document_metadata (
                id          TEXT PRIMARY KEY,
                document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                key         TEXT NOT NULL,
                value       TEXT NOT NULL
            )`,
		],
	},
	// Future migrations go here. Example:
	// {
	//   version: 2,
	//   statements: [
	//     `ALTER TABLE templates ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
	//   ],
	// },
];

async function runMigrations(db: Database): Promise<void> {
	// Ensure the migrations tracker exists before we query it.
	// IF NOT EXISTS makes this idempotent on every startup.
	await db.execute(`
        CREATE TABLE IF NOT EXISTS _migrations (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);

	// Find the highest migration version already applied.
	const rows = await db.select<{ max_version: number | null }[]>(
		`SELECT MAX(version) AS max_version FROM _migrations`
	);
	const currentVersion = rows[0]?.max_version ?? 0;

	// Run only migrations newer than what's already applied, in order.
	for (const migration of MIGRATIONS) {
		if (migration.version <= currentVersion) continue;

		console.log(`[db] Running migration v${migration.version}`);

		// Transaction wrapper: if any statement fails, all changes roll back
		// and the version is never recorded. Prevents half-applied migrations
		// (critical for future non-idempotent ALTERs).
		await db.execute("BEGIN TRANSACTION");
		try {
			for (const statement of migration.statements) {
				await db.execute(statement);
			}

			// Record that this migration was applied successfully.
			await db.execute(
				`INSERT INTO _migrations (version) VALUES (?)`,
				[migration.version]
			);

			await db.execute("COMMIT");
			console.log(`[db] Migration v${migration.version} applied`);
		} catch (e) {
			await db.execute("ROLLBACK");
			console.error(`[db] Migration v${migration.version} failed, rolled back:`, e);
			throw e; // Re-throw — app should not start with a broken schema
		}
	}
}