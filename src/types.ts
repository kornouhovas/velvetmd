/**
 * Message types for communication between extension and webview
 */

// Webview → Extension
export interface UpdateMessage {
  type: 'update';
  content: string;
}

export interface ReadyMessage {
  type: 'ready';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  stack?: string;
}

export interface ScrollSyncMessage {
  type: 'scrollSync';
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
}

// Extension → Webview
export interface DocumentChangedMessage {
  type: 'documentChanged';
  content: string;
  scrollTop?: number;
}

export interface ConfigMessage {
  type: 'config';
  showSyntaxOnFocus: boolean;
}

export interface ScrollRestoreLineMessage {
  type: 'scrollRestoreLine';
  line: number;
  totalLines: number;
}

export type WebviewMessage = UpdateMessage | ReadyMessage | ErrorMessage | ScrollSyncMessage;
export type ExtensionMessage = DocumentChangedMessage | ConfigMessage | ScrollRestoreLineMessage;
