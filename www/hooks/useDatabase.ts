// www/hooks/useDatabase.ts
// Thin wrapper around the DB singleton. All data hooks go through this.
import { useState, useEffect, useCallback } from "react";
import { getDb } from "../lib/db";

/**
 * Generic hook for executing a DB query and managing its lifecycle.
 * T = the row shape returned by the query.
 *
 * Returns { data, loading, error, refetch }.
 * `refetch` re-runs the query — call it after mutations to refresh UI.
 */
export function useQuery<T>(query: string, params: unknown[] = []) {
	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const fetch = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const db = await getDb();
			const rows = await db.select<T[]>(query, params);
			setData(rows);
		} catch (e) {
			setError(e instanceof Error ? e : new Error(String(e)));
		} finally {
			setLoading(false);
		}
		// Stringify params so the effect re-runs when actual values change,
		// not on every render (arrays create new references each time)
	}, [query, JSON.stringify(params)]);

	useEffect(() => { fetch(); }, [fetch]);

	return { data, loading, error, refetch: fetch };
}

/**
 * Returns a function to execute write operations (INSERT/UPDATE/DELETE).
 * Doesn't manage state — just provides an ergonomic wrapper around db.execute.
 */
export function useExecute() {
	return useCallback(async (query: string, params: unknown[] = []) => {
		const db = await getDb();
		return db.execute(query, params);
	}, []);
}