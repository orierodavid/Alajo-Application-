type Entry<T> = { promise: Promise<T>; expiresAt: number }

const inflight = new Map<string, Entry<unknown>>()

/**
 * Collapses concurrent work for the same key within a warm server runtime.
 * This is deliberately an optimization only; correctness must remain in the DB.
 */
export async function singleFlight<T>(key: string, fn: () => Promise<T>, ttlMs = 10_000): Promise<T> {
  const now = Date.now()
  const existing = inflight.get(key) as Entry<T> | undefined
  if (existing && existing.expiresAt > now) return existing.promise

  const promise = Promise.resolve().then(fn)
  inflight.set(key, { promise, expiresAt: now + ttlMs })
  try { return await promise } finally {
    if (inflight.get(key)?.promise === promise) inflight.delete(key)
  }
}

export function jitteredTtl(baseMs: number, maxJitterMs: number): number {
  return baseMs + Math.floor(Math.random() * Math.max(0, maxJitterMs + 1))
}
