// Webview editor script for Markdown Live Editor
// This will be fully implemented in Task 3 with Tiptap integration

import type { ExtensionMessage } from '../../types';

// Get VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// Initialize editor placeholder
function initialize(): void {
  // Notify extension that webview is ready
  vscode.postMessage({ type: 'ready' });

  // Listen for messages from extension
  window.addEventListener('message', (event: MessageEvent<ExtensionMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'documentChanged':
        handleDocumentChanged(message.content);
        break;
      default:
        break;
    }
  });
}

function handleDocumentChanged(content: string): void {
  // Task 3: This will update Tiptap editor with new content
  const editorElement = document.getElementById('editor');
  if (editorElement && editorElement.querySelector('.placeholder')) {
    // For now, just update placeholder text
    const placeholder = editorElement.querySelector('.placeholder p:last-child');
    if (placeholder) {
      placeholder.textContent = `Content loaded: ${content.length} characters`;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Export for TypeScript
export { initialize };
