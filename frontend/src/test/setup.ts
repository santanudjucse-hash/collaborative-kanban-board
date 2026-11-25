import '@testing-library/jest-dom';

// Polyfill EventSource for test environment
class MockEventSource {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, ((event: any) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }

  addEventListener(event: string, callback: (event: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: (event: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach((cb) => cb({ data: JSON.stringify(data) }));
  }

  close() {}
}

(global as any).EventSource = MockEventSource;

// Polyfill window.matchMedia if missing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
