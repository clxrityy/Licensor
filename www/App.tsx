import { Routes, Route, useParams, useSearchParams } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TemplateList from "./components/TemplateList";
import DocumentList from "./components/DocumentList";
import SearchResults from "./components/SearchResults";
import DocumentView from "./components/DocumentView";
import TemplateEditor from "./components/TemplateEditor";
import GenerateDocument from "./components/GenerateDocument";

// Placeholder pages — will be replaced with real components
function Home() {
	return <div className="p-6 space-y-8">
		<section>
			<h2 className="text-xl font-semibold mb-4">
				Templates
			</h2>
			<TemplateList />
		</section>
		<section>
			<h2 className="text-xl font-semibold mb-4">
				Recent Documents
			</h2>
			<DocumentList />
		</section>
	</div>;
}

// ─── Folder view: scoped templates + documents ───────────────────
function FolderView() {
	const { folderId } = useParams();
	return (
		<div className="p-6 space-y-8">
			<section>
				<h2 className="text-xl font-semibold mb-4">Templates</h2>
				<TemplateList folderId={folderId} />
			</section>
			<section>
				<h2 className="text-xl font-semibold mb-4">Documents</h2>
				<DocumentList folderId={folderId} />
			</section>
		</div>
	);
}

// ─── Search page: reads query from URL search params ─────────────
function SearchPage() {
	const [searchParams] = useSearchParams();
	const query = searchParams.get("q") ?? "";
	return <SearchResults query={query} />;
}

function NotFound() {
	return <div className="p-6 text-red-500">404 — Page not found</div>;
}

export default function App() {
	return (
		// Full-height flex layout: sidebar fixed-width, content fills remaining space
		<div className="flex h-screen bg-gray-50 text-gray-900">
			<Sidebar />

			{/* Main content area — scrollable independently of sidebar */}
			<main className="flex-1 overflow-y-auto">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/folders/:folderId" element={<FolderView />} />
					<Route path="/templates/new" element={<TemplateEditor key="new" />} />
					<Route path="/templates/:templateId" element={<TemplateEditor />} />
					<Route path="/templates/:templateId/generate" element={<GenerateDocument />} />
					<Route path="/documents/:documentId" element={<DocumentView />} />
					<Route path="/search" element={<SearchPage />} />
					<Route path="*" element={<NotFound />} />
				</Routes>
			</main>
		</div>
	);
}