export const REMOTE_OPERATION_ID_TTL = 5 * 60 * 1000;
export const MAX_REMOTE_OPERATION_IDS = 5000;

class RemoteOperationIdCache {
  constructor({ ttl = REMOTE_OPERATION_ID_TTL, maxSize = MAX_REMOTE_OPERATION_IDS } = {}) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.operationIds = new Map();
  }

  get size() {
    return this.operationIds.size;
  }

  has(operationId, now = Date.now()) {
    this.prune(now);
    return this.operationIds.has(operationId);
  }

  remember(operationId, now = Date.now()) {
    this.prune(now);
    if (this.operationIds.has(operationId)) {
      return false;
    }

    if (this.operationIds.size >= this.maxSize) {
      this.operationIds.delete(this.operationIds.keys().next().value);
    }

    this.operationIds.set(operationId, now);
    return true;
  }

  prune(now = Date.now()) {
    for (const [operationId, receivedAt] of this.operationIds) {
      if (now - receivedAt >= this.ttl) {
        this.operationIds.delete(operationId);
      }
    }
  }
}

export default RemoteOperationIdCache;
