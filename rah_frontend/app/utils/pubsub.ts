type Callback = (payload?: any) => void;
const subs: Record<string, Set<Callback>> = {};

export function on(event: string, cb: Callback) {
  if (!subs[event]) subs[event] = new Set();
  subs[event].add(cb);
  return () => off(event, cb);
}

export function off(event: string, cb: Callback) {
  if (!subs[event]) return;
  subs[event].delete(cb);
  if (subs[event].size === 0) delete subs[event];
}

export function emit(event: string, payload?: any) {
  const set = subs[event];
  if (!set) return;
  set.forEach((cb) => {
    try {
      cb(payload);
    } catch {
      // swallow listener errors
    }
  });
}

