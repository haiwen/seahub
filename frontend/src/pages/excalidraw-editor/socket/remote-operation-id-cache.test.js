import RemoteOperationIdCache, {
  MAX_REMOTE_OPERATION_IDS,
  REMOTE_OPERATION_ID_TTL,
} from './remote-operation-id-cache';

describe('RemoteOperationIdCache', () => {
  test('expires an operation id after the TTL in a long-running session', () => {
    const cache = new RemoteOperationIdCache();

    expect(cache.remember('remote-operation-1', 0)).toBe(true);
    expect(cache.remember('remote-operation-1', REMOTE_OPERATION_ID_TTL - 1)).toBe(false);
    expect(cache.remember('remote-operation-1', REMOTE_OPERATION_ID_TTL + 1)).toBe(true);

    expect(cache.size).toBe(1);
  });

  test('evicts the oldest operation ids when the cache reaches its capacity', () => {
    const cache = new RemoteOperationIdCache();

    for (let index = 0; index < MAX_REMOTE_OPERATION_IDS; index += 1) {
      cache.remember(`remote-operation-${index}`, index);
    }
    cache.remember('remote-operation-new', MAX_REMOTE_OPERATION_IDS);

    expect(cache.size).toBe(MAX_REMOTE_OPERATION_IDS);
    expect(cache.has('remote-operation-0', MAX_REMOTE_OPERATION_IDS)).toBe(false);
    expect(cache.has('remote-operation-new', MAX_REMOTE_OPERATION_IDS)).toBe(true);
  });
});
