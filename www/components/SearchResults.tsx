// www/components/SearchResults.tsx
// Displays FTS5 search results from the useSearch hook.
import { Link } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";

interface SearchResultsProps {
	query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
	const { results, loading, error } = useSearch(query);

	if (!query.trim() || query.trim().length < 2) {
		return <p className="text-sm text-gray-400 p-6">Type at least 2 characters to search</p>;
	}

	if (loading) return <p className="text-sm text-gray-500 p-6">Searching...</p>;
	if (error) return <p className="text-sm text-red-500 p-6">Search error: {error.message}</p>;

	if (results.length === 0) {
		return <p className="text-sm text-gray-400 p-6">No results for "{query}"</p>;
	}

	return (
		<div className="p-6">
			<h2 className="text-lg font-semibold mb-4">
				{results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
			</h2>

			<div className="space-y-3">
				{results.map((r) => (
					<Link
						key={r.id}
						to={`/documents/${r.id}`}
						className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
					>
						<h3 className="font-medium text-blue-600">{r.title}</h3>
						{/* Show a snippet of the rendered content — first 200 chars */}
						<p className="text-xs text-gray-500 mt-1 line-clamp-2">
							{r.rendered_content.slice(0, 200)}
						</p>
					</Link>
				))}
			</div>
		</div>
	);
}