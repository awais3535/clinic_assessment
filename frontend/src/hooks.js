import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
export function useResource(path) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let live = true;
    setState((old) => ({ ...old, loading: true, error: '' }));
    api(path)
      .then((data) => {
        if (live) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (live) setState({ data: null, loading: false, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [path, version]);
  return { ...state, refresh };
}
