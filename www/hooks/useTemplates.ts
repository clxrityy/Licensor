// www/hooks/useTemplates.ts
import { useCallback, useMemo } from "react";
import { useQuery, useExecute } from "./useDatabase";
import type { Template, TemplateVariable } from "../lib/types";

/**
 * CRUD hook for templates.
 * Optionally filter by folder — pass folderId to scope the query.
 */
export function useTemplates(folderId?: string | null) {
	const query = folderId
		? "SELECT * FROM templates WHERE folder_id = ? ORDER BY name ASC"
		: "SELECT * FROM templates ORDER BY name ASC";
	const params = folderId ? [folderId] : [];

	const { data: raw, loading, error, refetch } = useQuery<Template>(query, params);
	const execute = useExecute();

	// Templates come from SQLite with `variables` as a JSON string — parse it
	const templates = useMemo(
		() => raw.map((t) => ({
			...t,
			variables: typeof t.variables === "string" ? JSON.parse(t.variables) : t.variables,
		})),
		[raw]
	);

	const createTemplate = useCallback(
		async (
			name: string,
			content: string,
			variables: TemplateVariable[],
			folderId: string | null = null
		) => {
			const id = crypto.randomUUID();
			await execute(
				`INSERT INTO templates (id, folder_id, name, content, variables)
         VALUES (?, ?, ?, ?, ?)`,
				[id, folderId, name, content, JSON.stringify(variables)]
			);
			await refetch();
			return id;
		},
		[execute, refetch]
	);

	const updateTemplate = useCallback(
		async (
			id: string,
			updates: { name?: string; content?: string; variables?: TemplateVariable[]; folderId?: string | null }
		) => {
			// Build SET clause dynamically — only touch columns that were provided
			const setClauses: string[] = [];
			const values: unknown[] = [];

			if (updates.name !== undefined) {
				setClauses.push("name = ?");
				values.push(updates.name);
			}
			if (updates.content !== undefined) {
				setClauses.push("content = ?");
				values.push(updates.content);
			}
			if (updates.variables !== undefined) {
				setClauses.push("variables = ?");
				values.push(JSON.stringify(updates.variables));
			}
			if (updates.folderId !== undefined) {
				setClauses.push("folder_id = ?");
				values.push(updates.folderId);
			}

			if (setClauses.length === 0) return;

			setClauses.push("updated_at = datetime('now')");
			values.push(id);

			await execute(
				`UPDATE templates SET ${setClauses.join(", ")} WHERE id = ?`,
				values
			);
			await refetch();
		},
		[execute, refetch]
	);

	const deleteTemplate = useCallback(
		async (id: string) => {
			await execute("DELETE FROM templates WHERE id = ?", [id]);
			await refetch();
		},
		[execute, refetch]
	);

	const cloneTemplate = useCallback(
		async (id: string) => {
			// Fetch the original, copy with new ID and "(Copy)" suffix
			const original = templates.find((t) => t.id === id);
			if (!original) throw new Error(`Template ${id} not found`);

			const newId = crypto.randomUUID();
			await execute(
				`INSERT INTO templates (id, folder_id, name, content, variables)
         VALUES (?, ?, ?, ?, ?)`,
				[
					newId,
					original.folder_id,
					`${original.name} (Copy)`,
					original.content,
					JSON.stringify(original.variables),
				]
			);
			await refetch();
			return newId;
		},
		[execute, refetch, templates]
	);

	return {
		templates,
		loading,
		error,
		refetch,
		createTemplate,
		updateTemplate,
		deleteTemplate,
		cloneTemplate,
	};
}