// Cache to store copied records and columns to avoid circular reference serialization errors
// This cache is used by both setEventTransfer (at copy time) and getEventTransfer (at paste time)

const copiedDataCache = new Map();
let copiedDataCacheIdCounter = 0;

export function setCopiedData(data) {
  const cacheId = ++copiedDataCacheIdCounter;
  copiedDataCache.set(cacheId, data);
  return cacheId;
}

export function getCopiedData(cacheId) {
  const data = copiedDataCache.get(cacheId);
  // Clean up cache after retrieval to avoid memory leaks
  copiedDataCache.delete(cacheId);
  return data;
}

export function clearCopiedDataCache() {
  copiedDataCache.clear();
}
