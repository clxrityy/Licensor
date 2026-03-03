import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import FolderTree from "./FolderTree";
import { useFolders } from "../hooks/useFolders";

export default function Sidebar() {
	const location = useLocation();
	const [searchQuery, setSearchQuery] = useState("");

	// Helper: highlight active nav link
	const isActive = (path: string) =>
		location.pathname === path ? "bg-gray-200 font-medium" : "hover:bg-gray-100";

	const { folders, loading: foldersLoading } = useFolders();

	const navigate = useNavigate();

	return (
		<aside className="w-64 h-screen flex flex-col border-r border-gray-200 bg-white">
			{/* App title */}
			<div className="p-4 border-b border-gray-200">
				<h1 className="text-lg font-bold tracking-tight">Licensor</h1>
			</div>

			{/* Search bar — will wire to useSearch hook later */}
			<div className="p-3">
				<input
					type="text"
					placeholder="Search documents..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && searchQuery.trim()) {
							navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
						}
					}}
					className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			{/* Navigation links */}
			<nav className="flex-1 overflow-y-auto px-2 py-1">
				<Link to="/" className={`block px-3 py-2 rounded-md text-sm ${isActive("/")}`}>
					Home
				</Link>

				{/* FolderTree will be inserted here once built */}
				<div className="mt-4 px-3">
					<p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
						Folders
					</p>
					{
						foldersLoading ? (
							<p className="text-sm text-gray-500 mt-2">Loading...</p>
						) : (
							<FolderTree folders={folders} />
						)
					}
				</div>
			</nav>

			{/* Bottom actions */}
			<div className="p-3 border-t border-gray-200">
				<button
					onClick={() => navigate("/templates/new")}
					className="w-full px-3 py-2 text-sm text-white bg-blue-600 rounded-md
             hover:bg-blue-700 transition-colors"
				>
					+ New Template
				</button>
			</div>
		</aside>
	);
}