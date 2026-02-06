# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension providing Obsidian-like live preview editing for Markdown files with WYSIWYG interface. Uses Tiptap (ProseMirror wrapper) with bidirectional sync between the editor and VS Code's text document model.

**Current Status:** Pre-Development (PoC Phase) - v0.1.0-alpha

## Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Type checking (run before commits)
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
# Run all tests (requires VS Code test runner setup)
npm test

# Run specific test file with tsx (unit tests)
npx tsx test/constants.test.ts
npx tsx test/roundtrip.test.ts

# Run with coverage
npm run test:coverage
```

### Development Notes
- The extension consists of **two separate webpack bundles**:
  - `extension.js` (Node.js target) - VS Code extension host process
  - `webview.js` (web target) - Browser environment for Tiptap editor
- Always run `npm run typecheck` before commits (no errors allowed)
- ESLint warnings are acceptable but must be justified

## Architecture

### Dual-Bundle System

This extension uses a **split build architecture** with two independent compilation targets:

1. **Extension Bundle** (`src/extension.ts` → `dist/extension.js`)
   - Target: Node.js
   - Environment: VS Code Extension Host
   - Entry: `src/extension.ts`
   - Key components:
     - `MarkdownEditorProvider` - Custom editor implementation
     - Document synchronization logic
     - VS Code API integration

2. **Webview Bundle** (`src/editor/webview/editor.ts` → `dist/webview.js`)
   - Target: Web/Browser
   - Environment: VS Code Webview (isolated iframe)
   - Entry: `src/editor/webview/editor.ts`
   - Key components:
     - Tiptap editor initialization
     - Markdown ↔ Editor state conversion
     - Message-based communication with extension host

**Critical:** Code in webview bundle cannot import Node.js modules or use VS Code API directly. Communication happens via `postMessage` API only.

### Bidirectional Sync Architecture

The core challenge is maintaining **round-trip fidelity** between markdown text and editor state:

```
VS Code Document (plain text .md)
        ↕ (debounced 300ms)
MarkdownEditorProvider (extension host)
        ↕ (postMessage)
Tiptap Editor (webview)
```

**Key Components:**

#### 1. MarkdownEditorProvider (`src/providers/markdownEditorProvider.ts`)
- Implements `vscode.CustomTextEditorProvider`
- Manages document ↔ webview synchronization
- **Critical timing constants:**
  - `WEBVIEW_UPDATE_COOLDOWN_MS = 500` - Prevents echo loops after webview updates
  - `DOCUMENT_CHANGE_DEBOUNCE_MS = 300` - Debounces external file changes
- Tracks update sources (`webview` vs `external`) to prevent infinite loops
- Uses `lastUpdates` Map to correlate document changes with their origin

#### 2. Message Protocol (`src/types.ts`)

**Extension → Webview:**
- `DocumentChangedMessage` - File content updated externally

**Webview → Extension:**
- `UpdateMessage` - Editor content changed by user
- `ReadyMessage` - Editor initialized successfully
- `ErrorMessage` - Editor error occurred

#### 3. Markdown Processing Pipeline

**Parsing (Markdown → Editor):**
- `markdown-it` parses to intermediate format
- Tiptap's `@tiptap/markdown` extension converts to ProseMirror schema
- `src/utils/markdownParser.ts`:
  - `preprocessMarkdown()` - Normalizes line endings, whitespace
  - `validateMarkdown()` - Checks size limits (10MB), unmatched delimiters
  - Security: `html: false` to prevent XSS

**Serialization (Editor → Markdown):**
- Tiptap serializes ProseMirror state to markdown
- `src/utils/markdownSerializer.ts`:
  - `postprocessMarkdown()` - Removes `&nbsp;`, normalizes spacing
  - `serializeMarkdown()` - Main entry point for webview output
  - Ensures POSIX-compliant file endings (single trailing newline)

#### 4. Webview Editor (`src/editor/webview/editor.ts`)
- Uses **factory pattern** to encapsulate mutable state
- `createEditorManager()` returns `{ initialize, cleanup }` interface
- **State management:**
  - Internal `EditorState` interface (mutable by design for lifecycle management)
  - State isolated in closure, not exposed globally
- **Update flow:**
  - User edits → `onUpdate` callback → serialize → `postMessage('update')`
  - Extension message → `handleDocumentChanged` → `setContent({ emitUpdate: false })`

### Security Considerations

1. **Content Security Policy (CSP):**
   - Strict CSP with cryptographic nonces (`crypto.randomBytes(16)`)
   - `default-src 'none'` - deny all by default
   - Scripts/styles only via nonce
   - Located in: `MarkdownEditorProvider.getHtmlForWebview()`

2. **XSS Prevention:**
   - `markdown-it` configured with `html: false` (no raw HTML passthrough)
   - All user content sanitized through markdown parser
   - No `dangerouslySetInnerHTML` or equivalent

3. **Input Validation:**
   - `MAX_CONTENT_SIZE_BYTES = 10MB` enforced consistently
   - Type checking for all message payloads
   - `formatBytes()` validates non-negative finite numbers

### Configuration

Extension settings (`package.json` → `contributes.configuration`):
- `showSyntaxOnFocus` (boolean, default: true) - Show markdown syntax when editing
- `autoReloadOnExternalChanges` (boolean, default: true) - Auto-reload on external edits
- `virtualizationThreshold` (number, default: 512000) - Performance threshold for large files

### Key Files

**Extension Host (Node.js):**
- `src/extension.ts` - Extension activation/deactivation
- `src/providers/markdownEditorProvider.ts` - Custom editor provider (236 lines)
- `src/utils/debounce.ts` - Debouncing utility

**Webview (Browser):**
- `src/editor/webview/editor.ts` - Tiptap initialization and sync (150 lines)
- `media/webview/styles.css` - Editor styling

**Utilities (Shared concepts, separate bundles):**
- `src/constants.ts` - Centralized constants, `formatBytes()`
- `src/utils/markdownParser.ts` - Markdown → AST (142 lines)
- `src/utils/markdownSerializer.ts` - AST → Markdown (165 lines)
- `src/types.ts` - Message type definitions

**Tests:**
- `test/setup.ts` - JSDOM setup for testing Tiptap in Node.js
- `test/roundtrip.test.ts` - Round-trip fidelity tests (26 test cases)
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

### Quality Standards

All code must pass:
- **Linting:** `npm run lint` (0 errors, warnings justified)
- **Type checking:** `npm run typecheck` (0 errors)
- **Compilation:** `npm run compile` (must succeed)

Code quality checklist (`.claude/QUALITY_CHECKLIST.md`):
- Immutability: Use spread operators, avoid mutation
- Function size: <50 lines per function
- File size: <800 lines per file (prefer <400)
- No `console.log` statements in production code
- Security review required for user input handling

### Known Limitations

1. **Round-trip Tests:** Some tests currently fail - this is expected during PoC phase. Tests verify that raw Tiptap output matches input, but actual implementation uses `serializeMarkdown()` utility which fixes these issues.

2. **Webview Bundle Size:** 398KB (exceeds webpack recommendation of 244KB) - acceptable for rich text editor with Tiptap dependencies.

### Development Workflow

1. Make changes in `src/` directory
2. Run `npm run typecheck` to verify types
3. Run `npm run lint` to check code style
4. Run `npm run compile` to build both bundles
5. Test in VS Code Extension Host (F5 in VS Code)
6. Run unit tests: `npx tsx test/<file>.test.ts`
7. Follow quality checklist before commits

### PRD Reference

See `PRD.md` for detailed functional requirements:
- FR-1: Live Preview Mode (syntax hiding on blur)
- FR-2: Interactive table editing
- FR-3: Table creation commands
- FR-4: VS Code integration
- NFR-1: Performance (500KB+ files with virtualization)
- NFR-2: Accessibility (WCAG 2.1 AA)

### Debugging

Extension logs available via:
```typescript
this.logger = vscode.window.createOutputChannel('Markdown Live Editor');
this.logger.appendLine('Debug message');
```

View logs: VS Code → Output panel → "Markdown Live Editor"
