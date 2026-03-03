// www/components/AttachmentPanel.tsx
// Upload/list/delete file attachments for a document.
// Files are stored on disk via Tauri FS plugin; DB tracks metadata only.
import { useRef } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, copyFile, remove } from "@tauri-apps/plugin-fs";
import { useAttachments } from "../hooks/useAttachments";
import { open } from "@tauri-apps/plugin-dialog";

interface AttachmentPanelProps {
	documentId: string;
}

export default function AttachmentPanel({ documentId }: AttachmentPanelProps) {
	const { attachments, loading, addAttachment, deleteAttachment } = useAttachments(documentId);
	const uploading = useRef(false);

	const handleUpload = async () => {
		if (uploading.current) return;
		uploading.current = true;

		try {
			// Open native file picker — returns the selected file path
			const selected = await open({
				multiple: false,
				title: "Select file to attach",
			});

			if (!selected) return; // User cancelled

			const sourcePath = selected as string;
			const filename = sourcePath.split("/").pop() ?? "attachment";
			const ext = filename.includes(".") ? filename.split(".").pop() : "";

			// Build destination: $APPDATA/attachments/{documentId}/{uuid}.{ext}
			const dataDir = await appDataDir();
			const attachDir = await join(dataDir, "attachments", documentId);
			await mkdir(attachDir, { recursive: true });

			const storedName = `${crypto.randomUUID()}${ext ? "." + ext : ""}`;
			const destPath = await join(attachDir, storedName);

			// Copy file to app data directory
			await copyFile(sourcePath, destPath);

			// Relative path for DB storage (portable across machines)
			const relativePath = `attachments/${documentId}/${storedName}`;

			// Detect MIME type from extension (basic heuristic)
			const mimeType = guessMime(ext ?? "");

			// We don't have easy access to file size from the dialog result,
			// so we store 0 and could update it later if needed
			await addAttachment(filename, relativePath, mimeType, 0);
		} catch (e) {
			console.error("Upload failed:", e);
		} finally {
			uploading.current = false;
		}
	};

	const handleDelete = async (id: string, filePath: string) => {
		if (!confirm("Delete this attachment?")) return;
		try {
			// Remove file from disk
			const dataDir = await appDataDir();
			const fullPath = await join(dataDir, filePath);
			await remove(fullPath);
		} catch {
			// File might already be missing — proceed with DB cleanup regardless
		}
		await deleteAttachment(id);
	};

	if (loading) return null;

	return (
		<section className="mt-6">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
					Attachments
				</h3>
				<button
					onClick={handleUpload}
					className="text-xs text-blue-600 hover:text-blue-800"
				>
					+ Upload File
				</button>
			</div>

			{attachments.length === 0 ? (
				<p className="text-xs text-gray-400 italic">No attachments</p>
			) : (
				<ul className="space-y-1">
					{attachments.map((a) => (
						<li
							key={a.id}
							className="flex items-center justify-between px-3 py-2
                         bg-white border border-gray-200 rounded-md text-sm"
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="text-gray-400 text-xs">&#128206;</span>
								<span className="truncate">{a.filename}</span>
								<span className="text-xs text-gray-400">{a.mime_type}</span>
							</div>
							<button
								onClick={() => handleDelete(a.id, a.file_path)}
								className="text-gray-400 hover:text-red-500 text-xs ml-2 shrink-0"
							>
								✕
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

// Basic MIME type guesser from file extension
function guessMime(ext: string): string {
	const map: Record<string, string> = {
		pdf: "application/pdf",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		svg: "image/svg+xml",
		txt: "text/plain",
		md: "text/markdown",
		json: "application/json",
		csv: "text/csv",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	};
	return map[ext.toLowerCase()] ?? "application/octet-stream";
}