class Locker {
  constructor() {
    this.locks = new Map();
  }

  lock = (lockType) => {
    this.locks.set(lockType, true);
  };

  unlock = (lockType) => {
    this.locks.delete(lockType);
    return !this.isLocked();
  };

  isLocked = (lockType) => {
    return lockType ? this.locks.has(lockType) : !!this.locks.size;
  };
}

export default Locker;
