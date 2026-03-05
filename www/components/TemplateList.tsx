// www/components/TemplateList.tsx
// Displays all templates, optionally scoped to a folder.
// Entry point for creating, cloning, or opening a template.
import { Link } from "react-router-dom";
import { useTemplates } from "../hooks/useTemplates";
import { TbFilePlus } from "react-icons/tb";
import { FaRegClone } from "react-icons/fa6";
import { MdOutlineDelete } from "react-icons/md";
import { Tooltip, VariablePills } from "./ui";

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
		// table-fixed ➔ columns respect explicit widths instead of auto-sizing to content
		<table className="w-full text-sm table-fixed border-collapse">
			<thead>
				<tr className="border-b border-gray-200 text-left text-gray-500">
					{/* Explicit width classes give each column a predictable proportion */}
					<th className="pb-2 font-medium w-1/4">Name</th>
					<th className="pb-2 font-medium w-1/3">Variables</th>
					<th className="pb-2 font-medium w-1/6">Updated</th>
					<th className="pb-2 font-medium w-1/4">Actions</th>
				</tr>
			</thead>
			<tbody>
				{templates.map((t) => (
					<tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 text-left">
						<td className="py-2">
							<Link
								to={`/templates/${t.id}`}
								className="text-blue-600 hover:underline font-medium block truncate"
							>
								{t.name}
							</Link>
						</td>
						<td className="py-2 text-gray-500">
							{/* Inline-flex keeps pills on a single row; flex-wrap lets them wrap if needed */}
							<VariablePills variables={t.variables} limit={3} />
						</td>
						<td className="py-2 text-gray-500">
							{new Date(t.updated_at).toLocaleDateString()}
						</td>
						<td className="py-2">
							<div className="flex flex-wrap items-center gap-4 justify-center *:cursor-pointer lg:flex-row sm:gap-2">
								<Tooltip text="Generate document">
									<Link
										to={`/templates/${t.id}/generate`}
										className="text-gray-500 hover:text-green-600 text-xs px-3 py-2 rounded-md border border-gray-500 hover:border-green-600 bg-gray-500/10 hover:bg-green-600/10 flex-1 inline-flex items-center justify-center"
									>
										<TbFilePlus />
										<span className="sr-only">Generate document</span>
									</Link>
								</Tooltip>
								<Tooltip text="Clone">
									<button
										onClick={() => cloneTemplate(t.id)}
										className="text-gray-500 hover:text-blue-600 text-xs px-3 py-2 rounded-md border border-gray-500 hover:border-blue-600 bg-gray-500/10 hover:bg-blue-600/10"
									>
										<FaRegClone />
										<span className="sr-only">Clone template</span>
									</button>
								</Tooltip>
								<Tooltip text={`Delete "${t.name}"`}>
									<button
										onClick={() => {
											if (confirm(`Delete "${t.name}"?`)) deleteTemplate(t.id);
										}}
										className="text-gray-500 hover:text-red-600 text-xs px-3 py-2 rounded-md border border-gray-500 hover:border-red-600 bg-gray-500/10 hover:bg-red-600/10"
									>
										<MdOutlineDelete />
										<span className="sr-only">Delete template</span>
									</button>
								</Tooltip>
							</div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}