import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import type { ExtensionMessage } from '../../types';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

let editor: Editor | null = null;
let messageHandler: ((event: MessageEvent<ExtensionMessage>) => void) | null = null;

function createEditor(editorElement: HTMLElement): Editor {
  return new Editor({
    element: editorElement,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] }
      }),
      Link.configure({ openOnClick: false })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose'
      }
    },
    onUpdate: ({ editor: editorInstance }) => {
      // TODO: Task 4 will replace getText() with proper markdown serialization
      // Currently using getText() as temporary solution - loses formatting
      const text = editorInstance.getText();
      vscode.postMessage({
        type: 'update',
        content: text
      });
    }
  });
}

function setupMessageListener(): void {
  messageHandler = (event: MessageEvent<ExtensionMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'documentChanged':
        handleDocumentChanged(message.content);
        break;
      default:
        break;
    }
  };

  window.addEventListener('message', messageHandler);
}

function initialize(): void {
  try {
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
      vscode.postMessage({
        type: 'error',
        message: 'Editor element not found'
      });
      return;
    }

    editor = createEditor(editorElement);
    setupMessageListener();
    vscode.postMessage({ type: 'ready' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown initialization error';
    vscode.postMessage({
      type: 'error',
      message: `Editor initialization failed: ${message}`
    });
  }
}

function handleDocumentChanged(content: string): void {
  if (!editor) {
    return;
  }

  if (typeof content !== 'string') {
    vscode.postMessage({
      type: 'error',
      message: 'Invalid content type received'
    });
    return;
  }

  const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
  if (content.length > MAX_CONTENT_SIZE) {
    vscode.postMessage({
      type: 'error',
      message: 'Document too large (max 10MB)'
    });
    return;
  }

  // emitUpdate: false prevents the onUpdate callback from firing
  // This avoids infinite update loops
  editor.commands.setContent(content, { emitUpdate: false });
}

export function cleanup(): void {
  if (messageHandler) {
    window.removeEventListener('message', messageHandler);
    messageHandler = null;
  }
  if (editor) {
    editor.destroy();
    editor = null;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

export { initialize };
