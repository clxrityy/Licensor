// www/hooks/useAttachments.ts
import { useCallback } from "react";
import { useQuery, useExecute } from "./useDatabase";
import type { Attachment } from "../lib/types";

/**
 * CRUD hook for file attachments on a specific document.
 * File bytes live on disk at $APPDATA/attachments/{documentId}/{uuid}.{ext}
 * This hook only manages the DB metadata rows — actual file I/O happens
 * in the component via @tauri-apps/plugin-fs.
 */
export function useAttachments(documentId: string) {
	const { data: attachments, loading, error, refetch } = useQuery<Attachment>(
		"SELECT * FROM attachments WHERE document_id = ? ORDER BY created_at DESC",
		[documentId]
	);
	const execute = useExecute();

	const addAttachment = useCallback(
		async (filename: string, filePath: string, mimeType: string, sizeBytes: number) => {
			const id = crypto.randomUUID();
			await execute(
				`INSERT INTO attachments (id, document_id, filename, file_path, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
				[id, documentId, filename, filePath, mimeType, sizeBytes]
			);
			await refetch();
			return id;
		},
		[documentId, execute, refetch]
	);

	const deleteAttachment = useCallback(
		async (id: string) => {
			await execute("DELETE FROM attachments WHERE id = ?", [id]);
			await refetch();
		},
		[execute, refetch]
	);

	return { attachments, loading, error, refetch, addAttachment, deleteAttachment };
}