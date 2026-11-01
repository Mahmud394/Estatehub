import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

// Loads data from the API once (and again when `path` changes).
// Returns { data, error, loading, reload }. Pass path = null to skip the request.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });

  const load = useCallback(() => {
    if (!path) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((err) => !cancelled && setState({ data: null, error: err.message, loading: false }));
    return () => { cancelled = true; };
  }, [path]);

  useEffect(() => load(), [load]);

  return { ...state, reload: load };
}
