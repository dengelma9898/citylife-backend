/**
 * Recursively converts `undefined` to `null` for Firebase persistence.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = removeUndefined(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Strips `id` from entity JSON and prepares data for Firestore writes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFirestoreData(entity: { toJSON(): object }): any {
  const { id, ...data } = entity.toJSON() as Record<string, unknown> & { id?: unknown };
  return removeUndefined(data);
}
