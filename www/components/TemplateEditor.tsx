// www/components/TemplateEditor.tsx
// Full template editor: name, variable definitions, markdown body, and live preview.
// Calls the Rust `render_preview` command for comrak HTML preview.
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useTemplates } from "../hooks/useTemplates";
import type { TemplateVariable } from "../lib/types";

export default function TemplateEditor() {
	const { templateId } = useParams();
	const navigate = useNavigate();
	const { templates, updateTemplate, createTemplate } = useTemplates();

	// Find the template being edited (null = creating new)
	const existing = templates.find((t) => t.id === templateId);

	const [name, setName] = useState<string>("");
	const [content, setContent] = useState<string>("");
	const [variables, setVariables] = useState<TemplateVariable[]>([]);
	const [preview, setPreview] = useState<string>("");
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

	// Populate fields when template loads
	useEffect(() => {
		if (existing) {
			setName(existing.name);
			setContent(existing.content);
			setVariables(existing.variables);
		}
	}, [existing?.id]);

	// Live preview — debounced via a simple timeout.
	// Falls back to raw content if the Rust command isn't available (e.g. running in browser).
	useEffect(() => {
		const timer = setTimeout(async () => {
			if (!content.trim()) {
				setPreview("");
				return;
			}
			try {
				// Rust backend renders markdown → HTML via comrak
				const html = await invoke<string>("render_preview", { markdown: content });
				setPreview(html);
			} catch {
				// Fallback: show raw markdown wrapped in <pre> if Rust command fails
				setPreview(`<pre class="whitespace-pre-wrap">${content}</pre>`);
			}
		}, 400);
		return () => clearTimeout(timer);
	}, [content]);

	// ─── Variable management ───────────────────────────────────────

	const addVariable = () => {
		setVariables([
			...variables,
			{ name: "", label: "", type: "text", default: "" },
		]);
	};

	const updateVariable = (index: number, field: keyof TemplateVariable, value: string) => {
		const updated = [...variables];
		updated[index] = { ...updated[index], [field]: value };
		setVariables(updated);
	};

	const removeVariable = (index: number) => {
		setVariables(variables.filter((_, i) => i !== index));
	};

	// ─── Save ──────────────────────────────────────────────────────

	const handleSave = async () => {
		if (!name.trim()) return;
		setSaveState("saving");
		try {
			if (existing) {
				await updateTemplate(existing.id, { name, content, variables });
			} else {
				const id = await createTemplate(name, content, variables);
				navigate(`/templates/${id}`, { replace: true });
			}
			setSaveState("saved");
			// Reset back to idle after 1.5s so the button returns to "Save"
			setTimeout(() => setSaveState("idle"), 1500);
		} catch (e) {
			console.error("Save failed:", e);
			setSaveState("idle");
		}
	};

	const saveButtonText =
		saveState === "saving"
			? "Saving..."
			: saveState === "saved"
			? "Saved"
			: saveState === "error"
			? "Error"
			: "Save Template";

	return (
		<div className="p-6 max-w-6xl">
			{/* Header: name + save button */}
			<div className="flex items-center justify-between mb-6">
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Template name..."
					className="text-2xl font-bold bg-transparent border-b border-transparent
                     hover:border-gray-300 focus:border-blue-500 focus:outline-none
                     pb-1 w-full max-w-md"
				/>
				<button
					onClick={handleSave}
					disabled={saveState !== "idle" || !name.trim()}
					className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					{saveButtonText}
				</button>
			</div>

			{/* Variable definitions */}
			<section className="mb-6">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
						Variables
					</h3>
					<button
						onClick={addVariable}
						className="text-xs text-blue-600 hover:text-blue-800"
					>
						+ Add Variable
					</button>
				</div>

				{variables.length === 0 ? (
					<p className="text-xs text-gray-400 italic">
						No variables defined. Add one to enable form-based document generation.
					</p>
				) : (
					<div className="space-y-2">
						{variables.map((v, i) => (
							<div key={i} className="flex items-center gap-2 text-sm">
								<input
									type="text"
									value={v.name}
									onChange={(e) => updateVariable(i, "name", e.target.value)}
									placeholder="name"
									className="w-28 px-2 py-1 border border-gray-300 rounded font-mono text-xs"
								/>
								<input
									type="text"
									value={v.label}
									onChange={(e) => updateVariable(i, "label", e.target.value)}
									placeholder="Label"
									className="w-36 px-2 py-1 border border-gray-300 rounded text-xs"
								/>
								<select
									value={v.type}
									onChange={(e) => updateVariable(i, "type", e.target.value)}
									className="px-2 py-1 border border-gray-300 rounded text-xs"
								>
									<option value="text">Text</option>
									<option value="number">Number</option>
									<option value="date">Date</option>
									<option value="textarea">Textarea</option>
								</select>
								<input
									type="text"
									value={v.default ?? ""}
									onChange={(e) => updateVariable(i, "default", e.target.value)}
									placeholder="Default"
									className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
								/>
								<button
									onClick={() => removeVariable(i)}
									className="text-red-400 hover:text-red-600 text-xs"
								>
									✕
								</button>
							</div>
						))}
					</div>
				)}
			</section>

			{/* Editor + Preview — side by side */}
			<div className="grid grid-cols-2 gap-4 h-[calc(100vh-320px)]">
				{/* Markdown editor */}
				<div className="flex flex-col">
					<h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
						Content
					</h3>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Write your template in Markdown. Use {{ variable_name }} for substitution..."
						className="flex-1 p-3 border border-gray-300 rounded-md font-mono text-sm
                       resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				{/* Live preview */}
				<div className="flex flex-col">
					<h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
						Preview
					</h3>
					<div
						className="flex-1 p-3 border border-gray-200 rounded-md overflow-y-auto
                       prose prose-sm max-w-none bg-white"
						dangerouslySetInnerHTML={{ __html: preview }}
					/>
				</div>
			</div>
		</div>
	);
}