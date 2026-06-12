import { invoke } from "@tauri-apps/api/core";
import { type Document } from "./types";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export async function exportZip(
	documentId: string
): Promise<Uint8Array> {
	return await invoke("export_document_bundle", {
		documentId,
	});
}

export async function exportZipToFile(doc: Document): Promise<void> {
	const bytes = await exportZip(doc.id);

	const path = await save({
	defaultPath: `${doc.title || "document"}.zip`,
	filters: [
		{
			name: "Zip Archive",
			extensions: ["zip"],
		},
	],
	});

	if (!path) return;

	await writeFile(path, new Uint8Array(bytes));
}