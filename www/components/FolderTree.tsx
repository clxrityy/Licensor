// www/components/FolderTree.tsx
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Folder } from "../lib/types";

interface FolderTreeProps {
	folders: Folder[];
}

/**
 * Recursively renders the folder hierarchy.
 * Receives a flat list, builds the tree structure in-component.
 */
export default function FolderTree({ folders }: FolderTreeProps) {
	// Build tree by grouping children under their parent_id
	const childrenOf = (parentId: string | null): Folder[] =>
		folders.filter((f) => f.parent_id === parentId);

	const roots = childrenOf(null);

	if (roots.length === 0) {
		return <p className="text-xs text-gray-400 italic px-1 py-2">No folders yet</p>;
	}

	return (
		<ul className="space-y-0.5">
			{roots.map((folder) => (
				<FolderNode key={folder.id} folder={folder} childrenOf={childrenOf} depth={0} />
			))}
		</ul>
	);
}

// ─── Internal recursive node ─────────────────────────────────────────────────

interface FolderNodeProps {
	folder: Folder;
	childrenOf: (parentId: string | null) => Folder[];
	depth: number;
}

function FolderNode({ folder, childrenOf, depth }: FolderNodeProps) {
	const [expanded, setExpanded] = useState(false);
	const { folderId } = useParams();
	const children = childrenOf(folder.id);
	const hasChildren = children.length > 0;
	const isActive = folderId === folder.id;

	return (
		<li>
			<div
				className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer
          ${isActive ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}`}
				// Indent nested levels: 0.75rem per depth level
				style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
			>
				{/* Expand/collapse toggle — only shown if folder has children */}
				<button
					onClick={(e) => {
						e.preventDefault();
						setExpanded(!expanded);
					}}
					className={`w-4 h-4 flex items-center justify-center text-gray-400
            ${hasChildren ? "hover:text-gray-600" : "invisible"}`}
				>
					{expanded ? "▼" : "▶"}
				</button>

				<Link to={`/folders/${folder.id}`} className="flex-1 truncate">
					{folder.name}
				</Link>
			</div>

			{/* Recursively render children when expanded */}
			{expanded && hasChildren && (
				<ul>
					{children.map((child) => (
						<FolderNode
							key={child.id}
							folder={child}
							childrenOf={childrenOf}
							depth={depth + 1}
						/>
					))}
				</ul>
			)}
		</li>
	);
}