import { useCallback, useEffect, useState } from 'react';
import { api, toQuery } from '../services/api.js';

// Loads one page of an admin list. `filters` is an object like { status: 'pending' }.
// Returns { data, error, loading, page, setPage, reload }. Changing a filter goes back to page 1.
export function usePagedAdmin(path, filters = {}) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const key = JSON.stringify(filters);

  useEffect(() => { setPage(1); }, [key]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await api(`${path}${toQuery({ ...JSON.parse(key), page, limit: 15 })}`);
      setState({ data, error: '', loading: false });
    } catch (err) {
      setState({ data: null, error: err.message, loading: false });
    }
  }, [path, key, page]);

  useEffect(() => { load(); }, [load]);
  return { ...state, page, setPage, reload: load };
}
