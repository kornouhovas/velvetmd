/**
 * Message types for communication between extension and webview
 */

export interface UpdateMessage {
  type: 'update';
  content: string;
}

export interface ReadyMessage {
  type: 'ready';
}

export interface DocumentChangedMessage {
  type: 'documentChanged';
  content: string;
}

export type WebviewMessage = UpdateMessage | ReadyMessage;
export type ExtensionMessage = DocumentChangedMessage;
