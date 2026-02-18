
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension providing Obsidian-like live preview editing for Markdown files with WYSIWYG interface. Uses Tiptap (ProseMirror wrapper) with bidirectional sync between the editor and VS Code's text document model.

**Current Status:** Early Development - v0.2.0

## Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Type checking (MUST pass before commits - zero errors required)
npm run typecheck

# Linting
npm run lint

# Compile extension (production build)
npm run compile

# Watch mode for development
npm run watch

# Full build pipeline (typecheck + lint + compile)
npm run build
```

### Testing
```bash
# Run specific test file with tsx (unit tests)
npx tsx test/constants.test.ts
npx tsx test/roundtrip.test.ts
npx tsx test/link-image.test.ts

# Run with coverage
npm run test:coverage
```

**Important:** Always run `npm run typecheck` before commits. Zero errors required.

## Architecture

### Dual-Bundle System (CRITICAL)

This extension uses a **split build architecture** with two independent webpack bundles:

1. **Extension Bundle** (`src/extension.ts` → `dist/extension.js`)
   - **Target:** Node.js (`target: 'node'`)
   - **Environment:** VS Code Extension Host process
   - **Entry:** `src/extension.ts`
   - **Config:** Main `tsconfig.json` (excludes webview files)
   - **Key components:**
     - `MarkdownEditorProvider` - Custom editor implementation
     - Document synchronization logic
     - VS Code API integration

2. **Webview Bundle** (`src/editor/webview/editor.ts` → `dist/webview.js`)
   - **Target:** Web/Browser (`target: 'web'`)
   - **Environment:** VS Code Webview (isolated iframe/sandbox)
   - **Entry:** `src/editor/webview/editor.ts`
   - **Config:** `tsconfig.webview.json` (extends main, adds DOM types)
   - **Key components:**
     - Tiptap editor initialization
     - Markdown ↔ Editor state conversion
     - Message-based communication with extension host

**CRITICAL:** Code in webview bundle **CANNOT**:
- Import Node.js modules (fs, path, crypto, etc.)
- Use VS Code API directly
- Access file system

Communication happens **ONLY** via `postMessage` API.

### Bidirectional Sync Architecture

The core challenge is maintaining **round-trip fidelity** between markdown text and editor state:

```
VS Code Document (plain text .md)
        ↕ (debounced 300ms)
MarkdownEditorProvider (extension host)
        ↕ (postMessage)
Tiptap Editor (webview)
```

#### Critical Timing Constants

Located in `src/providers/markdownEditorProvider.ts`:

- **`WEBVIEW_UPDATE_COOLDOWN_MS = 500`**
  - Prevents echo loops after webview updates
  - Time window where document changes are assumed to originate from webview
  - Accounts for VS Code workspace edit latency (~50-100ms) + safety margin
  - Too low → update loops; too high → miss rapid external edits

- **`DOCUMENT_CHANGE_DEBOUNCE_MS = 300`**
  - Debounces external file changes to reduce update frequency
  - Prevents excessive re-renders during rapid external edits (e.g., git operations)

#### Update Flow Prevention Logic

Uses `lastUpdates` Map to track update sources:
- When webview sends update → mark as `source: 'webview'` with timestamp
- When document change fires → check if within cooldown window
- If within cooldown → assume echo, skip webview update
- If outside cooldown → treat as external edit, send to webview

### Message Protocol

Defined in `src/types.ts`:

**Extension → Webview:**
- `DocumentChangedMessage` - File content updated externally

**Webview → Extension:**
- `UpdateMessage` - Editor content changed by user
- `ReadyMessage` - Editor initialized successfully
- `ErrorMessage` - Editor error occurred

### Markdown Processing Pipeline

#### Parsing (Markdown → Editor)
- Tiptap's `@tiptap/markdown` extension converts to ProseMirror schema
- **Security:** Link extension validates URLs (`/^(https?:\/\/|mailto:)/`) to prevent `javascript:` attacks
- **Size limit:** `MAX_CONTENT_SIZE_BYTES = 10MB` enforced in constants

#### Serialization (Editor → Markdown)
Located in `src/utils/markdownSerializer.ts`:

- `serializeMarkdown()` - Main entry point for webview output
- `postprocessMarkdown()` - Removes `&nbsp;`, normalizes spacing
- Ensures POSIX-compliant file endings (single trailing newline)

**Important:** Raw Tiptap output may not preserve formatting perfectly. The `serializeMarkdown()` utility fixes these issues, which is why some round-trip tests are expected to fail (they test raw output).

### Webview Editor

Located in `src/editor/webview/editor.ts`:

- Uses **factory pattern** to encapsulate mutable state
- `createEditorManager()` returns `{ initialize, cleanup }` interface
- **State management:**
  - Internal `EditorState` interface (mutable by design for lifecycle management)
  - Contains DOM references (Editor instance, MessageHandler)
  - State isolated in closure, not exposed globally
- **Update flow:**
  - User edits → `onUpdate` callback → `serializeMarkdown()` → `postMessage('update')`
  - Extension message → `handleDocumentChanged` → `setContent({ emitUpdate: false })`

### Security

1. **Content Security Policy (CSP):**
   - Located in `MarkdownEditorProvider.getHtmlForWebview()`
   - Strict CSP with cryptographic nonces (`crypto.randomBytes(16)`)
   - `default-src 'none'` - deny all by default
   - Scripts/styles only via nonce

2. **XSS Prevention:**
   - Link extension validates URLs (no `javascript:` URIs)
   - No raw HTML passthrough in markdown parser

3. **Input Validation:**
   - `MAX_CONTENT_SIZE_BYTES = 10MB` enforced consistently
   - Type checking for all message payloads
   - `formatBytes()` validates non-negative finite numbers

### Configuration

Extension settings in `package.json` → `contributes.configuration`:
- `showSyntaxOnFocus` (boolean, default: true) - Show markdown syntax when editing
- `autoReloadOnExternalChanges` (boolean, default: true) - Auto-reload on external edits
- `virtualizationThreshold` (number, default: 512000) - Performance threshold for large files

### Key Files

**Extension Host (Node.js):**
- `src/extension.ts` - Extension activation/deactivation
- `src/providers/markdownEditorProvider.ts` - Custom editor provider (~236 lines)
- `src/utils/debounce.ts` - Debouncing utility

**Webview (Browser):**
- `src/editor/webview/editor.ts` - Tiptap initialization and sync (~150 lines)
- `media/webview/styles.css` - Editor styling

**Utilities (Shared concepts, separate bundles):**
- `src/constants.ts` - Centralized constants, `formatBytes()`
- `src/utils/markdownSerializer.ts` - Editor → Markdown serialization (~165 lines)
- `src/utils/debounce.ts` - Debouncing utility
- `src/types.ts` - Message type definitions

**Tests:**
- `test/setup.ts` - JSDOM setup for testing Tiptap in Node.js
- `test/roundtrip.test.ts` - Round-trip fidelity tests (26 test cases)
- `test/link-image.test.ts` - Link and image handling tests
- `test/constants.test.ts` - Utility function tests (14 tests)

### Testing Strategy

Tests use Node.js built-in test runner with JSDOM for DOM simulation:

```typescript
import './setup';  // Sets up global.document, global.window, etc.
import { Editor } from '@tiptap/core';

// Test round-trip conversion
editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
const result = editor.markdown.serialize(editor.getJSON());
```

**Run tests:** `npx tsx test/<filename>.test.ts`

### Known Limitations

1. **Round-trip Tests:** Some tests in `test/roundtrip.test.ts` currently fail - this is expected during PoC phase. Tests verify that raw Tiptap output matches input, but actual implementation uses `serializeMarkdown()` utility which fixes these issues.

2. **Webview Bundle Size:** 398KB (exceeds webpack recommendation of 244KB) - acceptable for rich text editor with Tiptap dependencies.

### Development Workflow

1. Make changes in `src/` directory
2. Run `npm run typecheck` to verify types (must pass)
3. Run `npm run lint` to check code style
4. Run `npm run compile` to build both bundles
5. Test in VS Code Extension Host (F5 in VS Code)
6. Run unit tests: `npx tsx test/<file>.test.ts`

### Debugging

Extension logs available via:
```typescript
this.logger = vscode.window.createOutputChannel('Velvet MD');
this.logger.appendLine('Debug message');
```

View logs: VS Code → Output panel → "Velvet MD"
