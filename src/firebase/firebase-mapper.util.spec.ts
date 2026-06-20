import { removeUndefined, toFirestoreData } from './firebase-mapper.util';

describe('removeUndefined', () => {
  it('should return null for undefined', () => {
    expect(removeUndefined(undefined)).toBeNull();
  });

  it('should return null for null', () => {
    expect(removeUndefined(null)).toBeNull();
  });

  it('should return primitives unchanged', () => {
    expect(removeUndefined('text')).toBe('text');
    expect(removeUndefined(42)).toBe(42);
    expect(removeUndefined(false)).toBe(false);
  });

  it('should convert undefined object values to null', () => {
    expect(removeUndefined({ a: 1, b: undefined })).toEqual({ a: 1, b: null });
  });

  it('should handle nested objects', () => {
    expect(removeUndefined({ outer: { inner: undefined, kept: 'x' } })).toEqual({
      outer: { inner: null, kept: 'x' },
    });
  });

  it('should handle arrays with undefined elements', () => {
    expect(removeUndefined([1, undefined, { x: undefined }])).toEqual([1, null, { x: null }]);
  });
});

describe('toFirestoreData', () => {
  it('should strip id and remove undefined fields', () => {
    const entity = {
      toJSON: () => ({
        id: 'doc-1',
        name: 'Test',
        optional: undefined,
      }),
    };
    expect(toFirestoreData(entity)).toEqual({ name: 'Test', optional: null });
  });
});
