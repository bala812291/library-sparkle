import { useState } from "react";

// In-memory store so search/filter choices survive navigating between pages.
const store = new Map<string, unknown>();

export function useSticky<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));
  const set = (next: T) => {
    store.set(key, next);
    setV(next);
  };
  return [v, set] as const;
}
