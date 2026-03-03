// www/components/TemplateList.tsx
// Displays all templates, optionally scoped to a folder.
// Entry point for creating, cloning, or opening a template.
import { Link } from "react-router-dom";
import { useTemplates } from "../hooks/useTemplates";

interface TemplateListProps {
	folderId?: string;
}

export default function TemplateList({ folderId }: TemplateListProps) {
	const { templates, loading, error, deleteTemplate, cloneTemplate } = useTemplates(folderId);

	if (loading) return <p className="text-sm text-gray-500">Loading templates...</p>;
	if (error) return <p className="text-sm text-red-500">Error: {error.message}</p>;

	if (templates.length === 0) {
		return (
			<div className="text-center py-12 text-gray-400">
				<p className="text-lg">No templates yet</p>
				<p className="text-sm mt-1">Create one to get started</p>
			</div>
		);
	}

	return (
		<table className="w-full text-sm">
			<thead>
				<tr className="border-b border-gray-200 text-left text-gray-500">
					<th className="pb-2 font-medium">Name</th>
					<th className="pb-2 font-medium">Variables</th>
					<th className="pb-2 font-medium">Updated</th>
					<th className="pb-2 font-medium w-32">Actions</th>
				</tr>
			</thead>
			<tbody>
				{templates.map((t) => (
					<tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
						<td className="py-2">
							<Link
								to={`/templates/${t.id}`}
								className="text-blue-600 hover:underline font-medium"
							>
								{t.name}
							</Link>
						</td>
						<td className="py-2 text-gray-500">
							{/* Show variable names as pills */}
							{t.variables.map((v) => (
								<span
									key={v.name}
									className="inline-block mr-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs"
								>
									{v.name}
								</span>
							))}
						</td>
						<td className="py-2 text-gray-500">
							{new Date(t.updated_at).toLocaleDateString()}
						</td>
						<td className="py-2 space-x-2">
							<button
								onClick={() => cloneTemplate(t.id)}
								className="text-gray-500 hover:text-blue-600 text-xs"
								title="Clone template"
							>
								Clone
							</button>
							<button
								onClick={() => {
									if (confirm(`Delete "${t.name}"?`)) deleteTemplate(t.id);
								}}
								className="text-gray-500 hover:text-red-600 text-xs"
								title="Delete template"
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