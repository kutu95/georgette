type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify the sidebar (and other subscribers) to reload database counts. */
export function invalidateStats(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeStats(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
