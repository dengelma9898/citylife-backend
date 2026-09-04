/**
 * Führt mapper-Async-Aufrufe mit begrenzter Parallelität aus und erhält die Reihenfolge.
 * Verhindert unbegrenzte Fan-outs (z. B. FCM-Sends an tausende User/Tokens).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
