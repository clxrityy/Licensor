// www/components/MetadataPanel.tsx
// Key-value editor for document annotations: tags, notes, custom fields.
import { useState } from "react";
import { useMetadata } from "../hooks/useMetadata";

interface MetadataPanelProps {
	documentId: string;
}

export default function MetadataPanel({ documentId }: MetadataPanelProps) {
	const { metadata, loading, setMeta, deleteMeta } = useMetadata(documentId);
	const [newKey, setNewKey] = useState("");
	const [newValue, setNewValue] = useState("");

	const handleAdd = async () => {
		const key = newKey.trim();
		const value = newValue.trim();
		if (!key) return;

		await setMeta(key, value);
		setNewKey("");
		setNewValue("");
	};

	if (loading) return null;

	return (
		<section className="mt-6">
			<h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
				Metadata
			</h3>

			{/* Existing key-value pairs */}
			{metadata.length > 0 && (
				<div className="space-y-1 mb-3">
					{metadata.map((m) => (
						<div
							key={m.id}
							className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
						>
							<span className="font-mono text-xs text-gray-500 w-24 shrink-0 truncate">
								{m.key}
							</span>
							<span className="flex-1 truncate">{m.value}</span>
							<button
								onClick={() => deleteMeta(m.id)}
								className="text-gray-400 hover:text-red-500 text-xs shrink-0"
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}

			{/* Add new pair */}
			<div className="flex items-center gap-2">
				<input
					type="text"
					value={newKey}
					onChange={(e) => setNewKey(e.target.value)}
					placeholder="Key"
					className="w-28 px-2 py-1.5 border border-gray-300 rounded text-xs font-mono
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
					onKeyDown={(e) => e.key === "Enter" && handleAdd()}
				/>
				<input
					type="text"
					value={newValue}
					onChange={(e) => setNewValue(e.target.value)}
					placeholder="Value"
					className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
					onKeyDown={(e) => e.key === "Enter" && handleAdd()}
				/>
				<button
					onClick={handleAdd}
					disabled={!newKey.trim()}
					className="px-2 py-1.5 text-xs text-blue-600 hover:text-blue-800
                     disabled:text-gray-300"
				>
					Add
				</button>
			</div>
		</section>
	);
}