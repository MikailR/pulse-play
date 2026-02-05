import type { WsMessage } from '@/lib/types';

type MessageHandler = (event: MessageEvent) => void;
type OpenHandler = (event: Event) => void;
type CloseHandler = (event: CloseEvent) => void;
type ErrorHandler = (event: Event) => void;

// Test-controllable mock WebSocket
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;

  private messageHandlers: MessageHandler[] = [];
  private openHandlers: OpenHandler[] = [];
  private closeHandlers: CloseHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

  constructor(url: string) {
    this.url = url;
    // Store instance for test access
    MockWebSocket.instances.push(this);
  }

  // Static storage of instances for testing
  static instances: MockWebSocket[] = [];

  static clearInstances() {
    MockWebSocket.instances = [];
  }

  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  // Event listeners
  set onopen(handler: OpenHandler | null) {
    if (handler) this.openHandlers.push(handler);
  }
  set onclose(handler: CloseHandler | null) {
    if (handler) this.closeHandlers.push(handler);
  }
  set onmessage(handler: MessageHandler | null) {
    if (handler) this.messageHandlers.push(handler);
  }
  set onerror(handler: ErrorHandler | null) {
    if (handler) this.errorHandlers.push(handler);
  }

  addEventListener(type: string, handler: EventListener) {
    switch (type) {
      case 'open':
        this.openHandlers.push(handler as OpenHandler);
        break;
      case 'close':
        this.closeHandlers.push(handler as CloseHandler);
        break;
      case 'message':
        this.messageHandlers.push(handler as MessageHandler);
        break;
      case 'error':
        this.errorHandlers.push(handler as ErrorHandler);
        break;
    }
  }

  removeEventListener(type: string, handler: EventListener) {
    switch (type) {
      case 'open':
        this.openHandlers = this.openHandlers.filter((h) => h !== handler);
        break;
      case 'close':
        this.closeHandlers = this.closeHandlers.filter((h) => h !== handler);
        break;
      case 'message':
        this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
        break;
      case 'error':
        this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
        break;
    }
  }

  // Methods
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(data: string) {}

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.closeHandlers.forEach((h) => h(event));
  }

  // Test helpers - call these to simulate server events
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    const event = new Event('open');
    this.openHandlers.forEach((h) => h(event));
  }

  simulateMessage(data: WsMessage) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
    });
    this.messageHandlers.forEach((h) => h(event));
  }

  simulateError(error: Event = new Event('error')) {
    this.errorHandlers.forEach((h) => h(error));
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.closeHandlers.forEach((h) => h(event));
  }
}

// Install mock globally
export function installMockWebSocket() {
  MockWebSocket.clearInstances();
  global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
}

// Helper to wait for async operations
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
