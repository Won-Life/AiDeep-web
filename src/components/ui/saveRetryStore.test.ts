import { describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from './saveRetryStore';

describe('pending save queue', () => {
  it('holds the original result until retry and preserves edit order', async () => {
    const queue = createSaveQueue();
    const calls: number[] = [];
    const first = queue.enqueue(async () => { calls.push(1); return 'saved'; }, () => false);
    const second = queue.enqueue(async () => { calls.push(2); return 'latest'; }, () => false);
    expect(calls).toEqual([]);
    await queue.retry();
    expect(await first).toBe('saved');
    expect(await second).toBe('latest');
    expect(calls).toEqual([1, 2]);
    expect(queue.getCount()).toBe(0);
  });

  it('keeps failed edits and later edits pending until connectivity recovers', async () => {
    const queue = createSaveQueue();
    let online = false;
    const later = vi.fn(async () => 'later');
    const first = queue.enqueue(async () => { if (!online) throw new Error('offline'); return 'first'; }, () => true);
    const second = queue.enqueue(later, () => true);
    await queue.retry();
    expect(queue.getCount()).toBe(2);
    expect(later).not.toHaveBeenCalled();
    online = true;
    await queue.retry();
    expect(await Promise.all([first, second])).toEqual(['first', 'later']);
  });

  it('does not send duplicates when retry is clicked while a save is running', async () => {
    const queue = createSaveQueue();
    let complete!: (value: string) => void;
    const run = vi.fn(() => new Promise<string>((resolve) => { complete = resolve; }));
    const saved = queue.enqueue(run, () => false);
    const firstRetry = queue.retry();
    await queue.retry();
    expect(run).toHaveBeenCalledTimes(1);
    complete('ok');
    await firstRetry;
    expect(await saved).toBe('ok');
  });

  it('rejects permanent errors and allows remaining edits to finish', async () => {
    const queue = createSaveQueue();
    const failed = queue.enqueue(async () => { throw new Error('Auth session changed'); }, () => false);
    const rejected = expect(failed).rejects.toThrow('Auth session changed');
    const saved = queue.enqueue(async () => 'ok', () => false);
    await queue.retry();
    await rejected;
    expect(await saved).toBe('ok');
    expect(queue.getCount()).toBe(0);
  });
});
