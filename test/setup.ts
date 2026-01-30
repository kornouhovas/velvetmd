/**
 * Test setup - initializes JSDOM for testing Tiptap editor
 */
import { JSDOM } from 'jsdom';
import { webcrypto } from 'crypto';

// Create JSDOM instance
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Set global document and window
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;

// Polyfill for crypto
if (!global.crypto) {
  global.crypto = webcrypto as Crypto;
}
