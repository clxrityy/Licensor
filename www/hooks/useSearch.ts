// www/hooks/useSearch.ts
import { useState, useEffect, useRef } from "react";
import { getDb } from "../lib/db";
import type { SearchResult } from "../lib/types";

/**
 * Debounced FTS5 search hook.
 * Waits `delay` ms after the user stops typing before firing the query.
 * Returns empty results for empty/short queries.
 */
export function useSearch(query: string, delay: number = 300) {
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		// Clear previous debounce timer on every keystroke
		if (timerRef.current) clearTimeout(timerRef.current);

		const trimmed = query.trim();

		// Don't search for very short strings — noisy and slow
		if (trimmed.length < 2) {
			setResults([]);
			setLoading(false);
			return;
		}

		setLoading(true);

		timerRef.current = setTimeout(async () => {
			try {
				const db = await getDb();
				// FTS5 match syntax: append * for prefix matching ("lic" matches "license")
				// rank uses BM25 scoring — lower values = more relevant
				const rows = await db.select<SearchResult[]>(
					`SELECT d.id, d.title, d.rendered_content, rank
           FROM document_fts
           JOIN documents d ON d.rowid = document_fts.rowid
           WHERE document_fts MATCH ?
           ORDER BY rank
           LIMIT 50`,
					[trimmed + "*"]
				);
				setResults(rows);
				setError(null);
			} catch (e) {
				setError(e instanceof Error ? e : new Error(String(e)));
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, delay);

		// Cleanup on unmount
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [query, delay]);

	return { results, loading, error };
}