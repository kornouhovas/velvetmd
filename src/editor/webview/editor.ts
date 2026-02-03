import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import type { ExtensionMessage } from '../../types';
import { serializeMarkdown } from '../../utils/markdownSerializer';
import { MAX_CONTENT_SIZE_BYTES, formatBytes } from '../../constants';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

interface EditorState {
  editor: Editor | null;
  messageHandler: ((event: MessageEvent<ExtensionMessage>) => void) | null;
}

/**
 * Creates a Tiptap editor instance with markdown support
 */
function createTiptapEditor(editorElement: HTMLElement): Editor {
  const editor = new Editor({
    element: editorElement,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        // Disable link in StarterKit to avoid conflict with our custom Link configuration
        link: false
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'markdown-image'
        }
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'tiptap-table'
        }
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list'
        }
      }),
      TaskItem.extend({
        addNodeView() {
          // Return null to disable custom NodeView and use renderHTML instead
          return null;
        }
      }).configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item'
        }
      }),
      Markdown
    ],
    content: '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'prose'
      }
    },
    onUpdate: ({ editor: editorInstance }) => {
      if (!editorInstance.markdown) {
        vscode.postMessage({
          type: 'error',
          message: 'Markdown extension not initialized'
        });
        return;
      }
      const rawMarkdown = editorInstance.markdown.serialize(editorInstance.getJSON());
      const cleanedMarkdown = serializeMarkdown(rawMarkdown);
      vscode.postMessage({
        type: 'update',
        content: cleanedMarkdown
      });
    }
  });

  console.log('Editor created');
  console.log('Extensions:', editor.extensionManager.extensions.map((e: any) => e.name));
  console.log('Has markdown?', !!editor.markdown);

  return editor;
}

/**
 * Handles document content changes from VS Code
 */
function handleDocumentChanged(state: EditorState, content: string): void {
  if (!state.editor) {
    return;
  }

  if (typeof content !== 'string') {
    vscode.postMessage({
      type: 'error',
      message: 'Invalid content type received'
    });
    return;
  }

  if (content.length > MAX_CONTENT_SIZE_BYTES) {
    vscode.postMessage({
      type: 'error',
      message: `Document too large (max ${formatBytes(MAX_CONTENT_SIZE_BYTES)})`
    });
    return;
  }

  console.log('Setting content:', content.substring(0, 200));

  // emitUpdate: false prevents the onUpdate callback from firing
  // This avoids infinite update loops
  state.editor.commands.setContent(content, {
    emitUpdate: false,
    contentType: 'markdown'
  });

  console.log('Editor JSON after setContent:', JSON.stringify(state.editor.getJSON(), null, 2));
}

/**
 * Sets up message listener for VS Code events
 */
function setupMessageListener(state: EditorState): void {
  const handler = (event: MessageEvent<ExtensionMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'documentChanged':
        handleDocumentChanged(state, message.content);
        break;
      default:
        break;
    }
  };

  state.messageHandler = handler;
  window.addEventListener('message', handler);
}

/**
 * Initializes the editor
 */
function initializeEditor(state: EditorState): void {
  try {
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
      vscode.postMessage({
        type: 'error',
        message: 'Editor element not found'
      });
      return;
    }

    state.editor = createTiptapEditor(editorElement);
    setupMessageListener(state);
    vscode.postMessage({ type: 'ready' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown initialization error';
    vscode.postMessage({
      type: 'error',
      message: `Editor initialization failed: ${message}`
    });
  }
}

/**
 * Cleans up editor resources
 */
function cleanupEditor(state: EditorState): void {
  if (state.messageHandler) {
    window.removeEventListener('message', state.messageHandler);
    state.messageHandler = null;
  }
  if (state.editor) {
    state.editor.destroy();
    state.editor = null;
  }
}

/**
 * Creates an editor manager that encapsulates state
 */
function createEditorManager() {
  const state: EditorState = {
    editor: null,
    messageHandler: null
  };

  return {
    initialize: () => initializeEditor(state),
    cleanup: () => cleanupEditor(state)
  };
}

const editorManager = createEditorManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', editorManager.initialize);
} else {
  editorManager.initialize();
}

export const { initialize, cleanup } = editorManager;
