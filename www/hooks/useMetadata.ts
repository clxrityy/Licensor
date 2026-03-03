// www/hooks/useMetadata.ts
import { useCallback } from "react";
import { useQuery, useExecute } from "./useDatabase";
import type { DocumentMetadata } from "../lib/types";

/**
 * CRUD hook for free-form key/value metadata on a document.
 * Use for tags, notes, custom annotations — intentionally schema-less.
 */
export function useMetadata(documentId: string) {
	const { data: metadata, loading, error, refetch } = useQuery<DocumentMetadata>(
		"SELECT * FROM document_metadata WHERE document_id = ? ORDER BY key ASC",
		[documentId]
	);
	const execute = useExecute();

	const setMeta = useCallback(
		async (key: string, value: string) => {
			// Upsert: if key already exists for this document, update it.
			// Otherwise insert a new row. Avoids duplicate keys per document.
			const existing = metadata.find((m) => m.key === key);
			if (existing) {
				await execute(
					"UPDATE document_metadata SET value = ? WHERE id = ?",
					[value, existing.id]
				);
			} else {
				const id = crypto.randomUUID();
				await execute(
					`INSERT INTO document_metadata (id, document_id, key, value)
           VALUES (?, ?, ?, ?)`,
					[id, documentId, key, value]
				);
			}
			await refetch();
		},
		[documentId, execute, refetch, metadata]
	);

	const deleteMeta = useCallback(
		async (id: string) => {
			await execute("DELETE FROM document_metadata WHERE id = ?", [id]);
			await refetch();
		},
		[execute, refetch]
	);

	return { metadata, loading, error, refetch, setMeta, deleteMeta };
}