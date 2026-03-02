import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

// Placeholder pages — will be replaced with real components
function Home() {
	return <div className="p-6"><h2 className="text-xl font-semibold">Welcome to Licensor</h2></div>;
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
					<Route path="/folders/:folderId" element={<Home />} />
					<Route path="/templates/:templateId" element={<Home />} />
					<Route path="/documents/:documentId" element={<Home />} />
					<Route path="/search" element={<Home />} />
					<Route path="*" element={<NotFound />} />
				</Routes>
			</main>
		</div>
	);
}