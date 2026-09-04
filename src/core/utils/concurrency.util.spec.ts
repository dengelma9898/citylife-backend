import { mapWithConcurrency } from './concurrency.util';

describe('mapWithConcurrency', () => {
  it('should return empty array for empty input', async () => {
    const result = await mapWithConcurrency([], 5, async () => 'value');
    expect(result).toEqual([]);
  });

  it('should preserve result order', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrency(items, 2, async value => value * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it('should limit concurrent executions', async () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    let activeCount = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency(items, 5, async value => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      await new Promise(resolve => setTimeout(resolve, 5));
      activeCount--;
      return value;
    });
    expect(result).toEqual(items);
    expect(maxActive).toBeLessThanOrEqual(5);
  });
});
