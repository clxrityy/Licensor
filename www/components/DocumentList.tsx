// www/components/DocumentList.tsx
// Lists documents with sort by date/title. Links to document view.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useDocuments } from "../hooks/useDocuments";

interface DocumentListProps {
	folderId?: string;
	templateId?: string;
}

type SortField = "title" | "updated_at" | "created_at";
type SortDir = "asc" | "desc";

export default function DocumentList({ folderId, templateId }: DocumentListProps) {
	const { documents, loading, error, deleteDocument } = useDocuments({ folderId, templateId });
	const [sortField, setSortField] = useState<SortField>("updated_at");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	if (loading) return <p className="text-sm text-gray-500">Loading documents...</p>;
	if (error) return <p className="text-sm text-red-500">Error: {error.message}</p>;

	// Client-side sort — DB already sends ordered results, but user can re-sort
	const sorted = [...documents].sort((a, b) => {
		const aVal = a[sortField];
		const bVal = b[sortField];
		const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
		return sortDir === "asc" ? cmp : -cmp;
	});

	const toggleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDir("asc");
		}
	};

	// Sort direction indicator
	const arrow = (field: SortField) =>
		sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

	if (documents.length === 0) {
		return (
			<div className="text-center py-12 text-gray-400">
				<p className="text-lg">No documents yet</p>
				<p className="text-sm mt-1">Generate one from a template</p>
			</div>
		);
	}

	return (
		<table className="w-full text-sm">
			<thead>
				<tr className="border-b border-gray-200 text-left text-gray-500">
					<th
						className="pb-2 font-medium cursor-pointer select-none"
						onClick={() => toggleSort("title")}
					>
						Title{arrow("title")}
					</th>
					<th
						className="pb-2 font-medium cursor-pointer select-none"
						onClick={() => toggleSort("created_at")}
					>
						Created{arrow("created_at")}
					</th>
					<th
						className="pb-2 font-medium cursor-pointer select-none"
						onClick={() => toggleSort("updated_at")}
					>
						Updated{arrow("updated_at")}
					</th>
					<th className="pb-2 font-medium w-20">Actions</th>
				</tr>
			</thead>
			<tbody>
				{sorted.map((doc) => (
					<tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
						<td className="py-2">
							<Link
								to={`/documents/${doc.id}`}
								className="text-blue-600 hover:underline font-medium"
							>
								{doc.title}
							</Link>
						</td>
						<td className="py-2 text-gray-500">
							{new Date(doc.created_at).toLocaleDateString()}
						</td>
						<td className="py-2 text-gray-500">
							{new Date(doc.updated_at).toLocaleDateString()}
						</td>
						<td className="py-2">
							<button
								onClick={() => {
									if (confirm(`Delete "${doc.title}"?`)) deleteDocument(doc.id);
								}}
								className="text-gray-500 hover:text-red-600 text-xs"
							>
								Delete
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}