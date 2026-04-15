/**
 * useSearch — Debounced global search across scans, findings, agents, and reports.
 *
 * Returns categorized results. Falls back to "Search unavailable" when API fails.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { search as searchApi, type Scan, type Finding, type Report } from "../api/endpoints";

interface SearchResults {
  scans: Scan[];
  findings: Finding[];
  agents: unknown[];
  reports: Report[];
}

const EMPTY: SearchResults = { scans: [], findings: [], agents: [], reports: [] };
const DEBOUNCE_MS = 300;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(EMPTY);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await searchApi.query(q, 10);
      setResults(data);
    } catch {
      setError("Search unavailable");
      setResults(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => performSearch(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, performSearch]);

  return { query, setQuery, results, isLoading, error };
}
