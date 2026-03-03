// www/components/DocumentForm.tsx
// Auto-generates a form from a template's variable definitions.
// On submit: calls Rust backend to render via minijinja, then saves the document.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useDocuments } from "../hooks/useDocuments";
import type { Template } from "../lib/types";

interface DocumentFormProps {
	template: Template;
}

export default function DocumentForm({ template }: DocumentFormProps) {
	const navigate = useNavigate();
	const { createDocument } = useDocuments();
	const [title, setTitle] = useState(`${template.name} — ${new Date().toLocaleDateString()}`);
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Initialize form values from variable defaults
	const [values, setValues] = useState<Record<string, string>>(() => {
		const defaults: Record<string, string> = {};
		for (const v of template.variables) {
			defaults[v.name] = v.default ?? "";
		}
		return defaults;
	});

	const updateValue = (name: string, value: string) => {
		setValues((prev) => ({ ...prev, [name]: value }));
	};

	const handleGenerate = async () => {
		// Check required fields
		for (const v of template.variables) {
			if (v.required && !values[v.name]?.trim()) {
				setError(`"${v.label}" is required`);
				return;
			}
		}

		setGenerating(true);
		setError(null);

		try {
			// Rust backend runs minijinja substitution on the template content
			const rendered = await invoke<string>("render_template", {
				templateContent: template.content,
				variables: values,
			});

			const docId = await createDocument(
				template.id,
				template.folder_id,
				title,
				rendered,
				values
			);

			navigate(`/documents/${docId}`);
		} catch (e) {
			setError(String(e));
		} finally {
			setGenerating(false);
		}
	};

	return (
		<div className="p-6 max-w-2xl">
			<h2 className="text-xl font-bold mb-1">Generate Document</h2>
			<p className="text-sm text-gray-500 mb-6">
				From template: <span className="font-medium text-gray-700">{template.name}</span>
			</p>

			{/* Document title */}
			<div className="mb-6">
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Document Title
				</label>
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			{/* Dynamic variable fields — driven by template.variables */}
			{template.variables.length > 0 && (
				<fieldset className="mb-6 space-y-4">
					<legend className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
						Template Variables
					</legend>

					{template.variables.map((v) => (
						<div key={v.name}>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{v.label}
								{v.required && <span className="text-red-500 ml-0.5">*</span>}
							</label>

							{v.type === "textarea" ? (
								<textarea
									value={values[v.name] ?? ""}
									onChange={(e) => updateValue(v.name, e.target.value)}
									rows={4}
									className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							) : (
								<input
									type={v.type === "number" ? "number" : v.type === "date" ? "date" : "text"}
									value={values[v.name] ?? ""}
									onChange={(e) => updateValue(v.name, e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							)}
						</div>
					))}
				</fieldset>
			)}

			{error && (
				<p className="text-sm text-red-500 mb-4">{error}</p>
			)}

			<button
				onClick={handleGenerate}
				disabled={generating || !title.trim()}
				className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium
                   hover:bg-blue-700 disabled:opacity-50 transition-colors"
			>
				{generating ? "Generating..." : "Generate Document"}
			</button>
		</div>
	);
}