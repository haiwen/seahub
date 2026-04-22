// Cache to store copied records and columns to avoid circular reference serialization errors
// This cache is used by both setEventTransfer (at copy time) and getEventTransfer (at paste time)

const COPIED_DATA_TTL_MS = 1 * 60 * 1000; // 1 minute

// Map<cacheId, { data, timestamp }>
const copiedDataCache = new Map();
let copiedDataCacheIdCounter = 0;

function pruneExpiredCache() {
  const now = Date.now();
  for (const [id, entry] of copiedDataCache) {
    if (now - entry.timestamp > COPIED_DATA_TTL_MS) {
      copiedDataCache.delete(id);
    }
  }
}

export function setCopiedData(data) {
  pruneExpiredCache();
  const cacheId = ++copiedDataCacheIdCounter;
  copiedDataCache.set(cacheId, { data, timestamp: Date.now() });
  return cacheId;
}

export function getCopiedData(cacheId) {
  const entry = copiedDataCache.get(cacheId);
  // Note: Cache entries are NOT deleted after retrieval to support "copy once, paste many"
  // The TTL mechanism (1 minute) handles automatic cleanup to avoid memory leaks
  return entry ? entry.data : undefined;
}

export function clearCopiedDataCache() {
  copiedDataCache.clear();
}
