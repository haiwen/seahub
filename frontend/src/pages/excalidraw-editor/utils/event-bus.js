class EventBus {
  constructor() {
    this.instance = null;
    this.subscribers = {};
  }

  static getInstance() {
    if (this.instance) return this.instance;
    this.instance = new EventBus();
    return this.instance;
  }

  subscribe(type, handler) {
    if (!this.subscribers[type]) {
      this.subscribers[type] = [];
    }

    const handlers = this.subscribers[type];
    handlers.push(handler);

    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  dispatch(type, ...data) {
    const handlers = this.subscribers[type];
    if (Array.isArray(handlers)) {
      handlers.forEach(handler => handler(...data));
    }
  }
}

export default EventBus;
