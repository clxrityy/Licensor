// www/components/DocumentView.tsx
// Displays the rendered document with a download/export button.
// Uses Tauri's dialog plugin to pick save location.
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useDocuments } from "../hooks/useDocuments";
import AttachmentPanel from "./AttachmentPanel";
import MetadataPanel from "./MetadataPanel";

export default function DocumentView() {
	const { documentId } = useParams();
	const { documents, loading } = useDocuments();
	const [preview, setPreview] = useState("");
	const [exporting, setExporting] = useState(false);

	const doc = documents.find((d) => d.id === documentId);

	// Render markdown → HTML for in-app preview
	useEffect(() => {
		if (!doc) return;
		(async () => {
			try {
				const html = await invoke<string>("render_preview", {
					markdown: doc.rendered_content,
				});
				setPreview(html);
			} catch {
				setPreview(`<pre class="whitespace-pre-wrap">${doc.rendered_content}</pre>`);
			}
		})();
	}, [doc]);

	// Export: get rendered content from Rust, let user pick file location
	const handleExport = async (format: "md" | "txt") => {
		if (!doc) return;
		setExporting(true);
		try {
			// Ask Rust backend for the export content (strips frontmatter, etc.)
			const content = await invoke<string>("export_document", {
				documentId: doc.id,
				format,
			});

			// Open native save dialog
			const path = await save({
				defaultPath: `${doc.title}.${format}`,
				filters: [
					{
						name: format === "md" ? "Markdown" : "Text",
						extensions: [format],
					},
				],
			});

			if (path) {
				await writeTextFile(path, content);
			}
		} catch (e) {
			console.error("Export failed:", e);
		} finally {
			setExporting(false);
		}
	};

	if (loading) return <p className="p-6 text-sm text-gray-500">Loading...</p>;
	if (!doc) return <p className="p-6 text-sm text-red-500">Document not found</p>;

	return (
		<div className="p-6 max-w-4xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-bold">{doc.title}</h2>
				<div className="flex gap-2">
					<button
						onClick={() => handleExport("md")}
						disabled={exporting}
						className="px-3 py-1.5 text-sm border border-gray-300 rounded-md
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
					>
						Download .md
					</button>
					<button
						onClick={() => handleExport("txt")}
						disabled={exporting}
						className="px-3 py-1.5 text-sm border border-gray-300 rounded-md
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
					>
						Download .txt
					</button>
				</div>
			</div>

			{/* Metadata bar */}
			<div className="flex gap-4 text-xs text-gray-500 mb-6">
				<span>Created: {new Date(doc.created_at).toLocaleString()}</span>
				<span>Updated: {new Date(doc.updated_at).toLocaleString()}</span>
			</div>

			{/* Variable values used — collapsible reference */}
			{Object.keys(doc.variable_values).length > 0 && (
				<details className="mb-6">
					<summary className="text-sm font-medium text-gray-600 cursor-pointer">
						Variable values used
					</summary>
					<div className="mt-2 p-3 bg-gray-100 rounded-md text-xs font-mono space-y-1">
						{Object.entries(doc.variable_values).map(([k, v]) => (
							<div key={k}>
								<span className="text-gray-500">{k}:</span> {String(v)}
							</div>
						))}
					</div>
				</details>
			)}

			{/* Side panels: attachments + metadata */}
			<div className="grid grid-cols-2 gap-6 mb-6">
				<AttachmentPanel documentId={doc.id} />
				<MetadataPanel documentId={doc.id} />
			</div>

			{/* Rendered content */}
			<div
				className="prose prose-sm max-w-none bg-white p-6 border border-gray-200 rounded-md"
				dangerouslySetInnerHTML={{ __html: preview }}
			/>
		</div>
	);
}