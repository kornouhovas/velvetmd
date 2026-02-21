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
import { lineToScrollState } from '../../utils/scrollUtils';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// NOTE: EditorState is intentionally mutable for lifecycle management in browser environment.
// The state contains DOM references (Editor, MessageHandler) that must be updated during
// initialization and cleanup phases. This is documented as 'mutable by design' in CLAUDE.md.
// Alternative immutable patterns (ref-cells, state machines) would add unnecessary complexity
// for lifecycle state in a webview context.
interface EditorState {
  editor: Editor | null;
  messageHandler: ((event: MessageEvent<ExtensionMessage>) => void) | null;
  showSyntaxOnFocus: boolean;
  scrollCleanup: (() => void) | null;
}

/**
 * Creates a Tiptap editor instance with markdown support
 */
function createTiptapEditor(editorElement: HTMLElement): Editor {
  const editor = new Editor({
    element: editorElement,
    extensions: [
      StarterKit.configure({
        link: false
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        // SECURITY: Only allow http(s) and mailto URLs to prevent javascript: URI attacks
        validate: (href: string) => /^(https?:\/\/|mailto:)/.test(href)
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
      TaskItem.configure({
        nested: true
      }),
      Markdown.configure({
        markedOptions: {
          gfm: true,
          breaks: true
        }
      })
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

  // Get current content from editor and normalize it the same way as outgoing updates
  const rawMarkdown = state.editor.markdown?.serialize(state.editor.getJSON()) || '';
  const currentMarkdown = serializeMarkdown(rawMarkdown);

  // Only update if content actually changed (prevents unnecessary cursor resets)
  if (currentMarkdown !== content) {
    state.editor.commands.setContent(content, {
      emitUpdate: false,
      contentType: 'markdown'
    });
  }
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
        if (typeof message.scrollTop === 'number') {
          const scrollTop = message.scrollTop;
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollTop, behavior: 'instant' });
          });
        }
        break;
      case 'config':
        state.showSyntaxOnFocus = message.showSyntaxOnFocus;
        break;
      case 'scrollRestoreLine': {
        const { line, totalLines } = message;
        requestAnimationFrame(() => {
          const el = document.documentElement;
          const scrollTop = lineToScrollState(line, totalLines, el.scrollHeight, el.clientHeight);
          window.scrollTo({ top: scrollTop, behavior: 'instant' });
        });
        break;
      }
      default:
        break;
    }
  };

  state.messageHandler = handler;
  window.addEventListener('message', handler);
}

/**
 * Sets up a throttled scroll listener that reports scroll position to the extension.
 * Returns a cleanup function.
 */
function setupScrollSync(): () => void {
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;

  const onScroll = () => {
    if (throttleTimer !== null) { return; }
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      const el = document.documentElement;
      vscode.postMessage({
        type: 'scrollSync',
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        viewportHeight: el.clientHeight
      });
    }, 100);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
  };
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
    state.scrollCleanup = setupScrollSync();
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
  if (state.scrollCleanup) {
    state.scrollCleanup();
    state.scrollCleanup = null;
  }
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
    messageHandler: null,
    showSyntaxOnFocus: true,
    scrollCleanup: null
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
