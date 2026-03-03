// www/hooks/useDocuments.ts
import { useCallback } from "react";
import { useQuery, useExecute } from "./useDatabase";
import type { Document } from "../lib/types";

/**
 * CRUD hook for documents.
 * Optionally filter by folder or template.
 */
export function useDocuments(filters?: { folderId?: string; templateId?: string }) {
	let query = "SELECT * FROM documents";
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (filters?.folderId) {
		conditions.push("folder_id = ?");
		params.push(filters.folderId);
	}
	if (filters?.templateId) {
		conditions.push("template_id = ?");
		params.push(filters.templateId);
	}

	if (conditions.length > 0) {
		query += " WHERE " + conditions.join(" AND ");
	}
	query += " ORDER BY updated_at DESC";

	const { data: raw, loading, error, refetch } = useQuery<Document>(query, params);
	const execute = useExecute();

	// Parse variable_values from JSON string
	const documents: Document[] = raw.map((d) => ({
		...d,
		variable_values:
			typeof d.variable_values === "string"
				? JSON.parse(d.variable_values)
				: d.variable_values,
	}));

	const createDocument = useCallback(
		async (
			templateId: string,
			folderId: string | null,
			title: string,
			renderedContent: string,
			variableValues: Record<string, string>
		) => {
			const id = crypto.randomUUID();
			await execute(
				`INSERT INTO documents (id, template_id, folder_id, title, rendered_content, variable_values)
         VALUES (?, ?, ?, ?, ?, ?)`,
				[id, templateId, folderId, title, renderedContent, JSON.stringify(variableValues)]
			);
			await refetch();
			return id;
		},
		[execute, refetch]
	);

	const updateDocument = useCallback(
		async (
			id: string,
			updates: {
				title?: string;
				renderedContent?: string;
				variableValues?: Record<string, string>;
				folderId?: string | null;
			}
		) => {
			const setClauses: string[] = [];
			const values: unknown[] = [];

			if (updates.title !== undefined) {
				setClauses.push("title = ?");
				values.push(updates.title);
			}
			if (updates.renderedContent !== undefined) {
				setClauses.push("rendered_content = ?");
				values.push(updates.renderedContent);
			}
			if (updates.variableValues !== undefined) {
				setClauses.push("variable_values = ?");
				values.push(JSON.stringify(updates.variableValues));
			}
			if (updates.folderId !== undefined) {
				setClauses.push("folder_id = ?");
				values.push(updates.folderId);
			}

			if (setClauses.length === 0) return;

			setClauses.push("updated_at = datetime('now')");
			values.push(id);

			await execute(
				`UPDATE documents SET ${setClauses.join(", ")} WHERE id = ?`,
				values
			);
			await refetch();
		},
		[execute, refetch]
	);

	const deleteDocument = useCallback(
		async (id: string) => {
			await execute("DELETE FROM documents WHERE id = ?", [id]);
			await refetch();
		},
		[execute, refetch]
	);

	return { documents, loading, error, refetch, createDocument, updateDocument, deleteDocument };
}