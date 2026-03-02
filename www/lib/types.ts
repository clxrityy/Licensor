// www/lib/types.ts
// Mirrors the SQLite schema 1:1. Keep this in sync with db.ts migrations.

// ─── Folders ──────────────────────────────────────────────────
export interface Folder {
	id: string;             // UUID v4
	parent_id: string | null; // null = root-level folder
	name: string;
	created_at: string;     // ISO 8601 datetime string (SQLite stores as TEXT)
	updated_at: string;
}

// ─── Templates ──────────────────────────────────────────────────

// A single variable definition embedded in the template's YAML frontmatter.
// Drives the auto-generated form UI in DocumentForm.tsx.
export interface TemplateVariable {
	name: string;           // Jinja2 variable name: {{ name }}
	label: string;          // Human-readable form label
	type: "text" | "number" | "date" | "textarea";
	default?: string;       // Optional prefill value
	required?: boolean;
}

export interface Template {
	id: string;
	folder_id: string | null;
	name: string;
	content: string;        // Full raw markdown including YAML frontmatter
	variables: TemplateVariable[]; // Parsed from frontmatter, stored as JSON in DB
	created_at: string;
	updated_at: string;
}

// ─── Documents ──────────────────────────────────────────────────
export interface Document {
	id: string;
	template_id: string;
	folder_id: string | null;
	title: string;
	rendered_content: string;  // Minijinja-substituted markdown (no frontmatter)
	variable_values: Record<string, string>; // { year: "2026", holder: "Acme" }
	created_at: string;
	updated_at: string;
}

// FTS5 search result — a lightweight projection of Document
export interface SearchResult {
	id: string;
	title: string;
	rendered_content: string;
	rank: number; // BM25 relevance score from FTS5 (lower = more relevant)
}

// ─── Attachments ──────────────────────────────────────────────────
export interface Attachment {
	id: string;
	document_id: string;
	filename: string;
	file_path: string;  // Relative to $APPDATA — resolves at runtime
	mime_type: string;
	size_bytes: number;
	created_at: string;
}

// ─── Document Metadata ──────────────────────────────────────────────────
// Free-form key/value annotations: tags, notes, custom fields, etc.
export interface DocumentMetadata {
	id: string;
	document_id: string;
	key: string;
	value: string;
}