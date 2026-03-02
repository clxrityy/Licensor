// www/hooks/useFolders.ts
import { useCallback } from "react";
import { useQuery, useExecute } from "./useDatabase";
import type { Folder } from "../lib/types";

/**
 * CRUD hook for folders.
 * Returns flat list — FolderTree handles the recursive nesting.
 */
export function useFolders() {
	const { data: folders, loading, error, refetch } = useQuery<Folder>(
		"SELECT * FROM folders ORDER BY name ASC"
	);
	const execute = useExecute();

	const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
		// crypto.randomUUID() is available in all modern browsers + Tauri's webview
		const id = crypto.randomUUID();
		await execute(
			"INSERT INTO folders (id, parent_id, name) VALUES (?, ?, ?)",
			[id, parentId, name]
		);
		await refetch();
		return id;
	}, [execute, refetch]);

	const renameFolder = useCallback(async (id: string, name: string) => {
		await execute(
			"UPDATE folders SET name = ?, updated_at = datetime('now') WHERE id = ?",
			[name, id]
		);
		await refetch();
	}, [execute, refetch]);

	const deleteFolder = useCallback(async (id: string) => {
		// CASCADE on parent_id handles nested child deletion automatically
		await execute("DELETE FROM folders WHERE id = ?", [id]);
		await refetch();
	}, [execute, refetch]);

	return { folders, loading, error, refetch, createFolder, renameFolder, deleteFolder };
}