"use client";

import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads data for a screen and exposes the loading / error / success states every
 * list and report needs.
 *
 * The effect deliberately performs no synchronous setState — the initial loading
 * flag is the initial state, and every later transition happens in a promise
 * callback or an event handler. That is what keeps this off React's cascading
 * render path.
 *
 * `fetcher` must be wrapped in useCallback by the caller, since it drives the effect.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, errorMessage: string) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: errorMessage });
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, errorMessage, attempt]);

  const retry = useCallback(() => {
    setState({ data: null, loading: true, error: null });
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
