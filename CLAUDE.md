
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
        ↕ (debounced 150ms)
MarkdownEditorProvider (extension host)
        ↕ (postMessage)
Tiptap Editor (webview)
```

#### Critical Timing Constants

Located in `src/providers/markdownEditorProvider.ts`:

- **`WEBVIEW_UPDATE_COOLDOWN_MS = 1000`**
  - Prevents echo loops after webview updates
  - Time window where document changes are assumed to originate from webview
  - Accounts for: 30ms onUpdate debounce + ~50ms IPC + 150ms doc debounce = ~230ms round-trip
  - Remaining ~770ms is a safety buffer for slow systems / large documents
  - **Trade-off:** External edits within 1s of a user keystroke are suppressed by this guard
  - Too low → update loops; too high → miss rapid external edits

- **`DOCUMENT_CHANGE_DEBOUNCE_MS = 150`**
  - Debounces external file changes to reduce update frequency
  - Prevents excessive re-renders during rapid external edits (e.g., git operations)

- **`onUpdate` debounce (30ms, in `editor.ts`)**
  - Defers serialization + IPC so the browser can paint before heavy regex work
  - ~2 frames at 60fps — imperceptible delay, prevents flooding VS Code on rapid keystrokes

#### Update Flow Prevention Logic

Uses `lastUpdates` Map to track update sources:
- When webview sends update → mark as `source: 'webview'` with timestamp
- When document change fires → check if within cooldown window
- If within cooldown → assume echo, skip webview update
- If outside cooldown → treat as external edit, send to webview

### Message Protocol

Defined in `src/types.ts`:

**Extension → Webview:**
- `DocumentChangedMessage` - File content updated externally (includes `scrollTop` for scroll restore)
- `ConfigMessage` - Editor configuration (`showSyntaxOnFocus`)
- `ScrollRestoreLineMessage` - Restore scroll to a specific line `{ type: 'scrollRestoreLine'; line: number; totalLines: number }`

**Webview → Extension:**
- `UpdateMessage` - Editor content changed by user
- `ReadyMessage` - Editor initialized successfully
- `ErrorMessage` - Editor error occurred
- `ScrollSyncMessage` - Current scroll position `{ scrollTop, scrollHeight, viewportHeight }`

### Markdown Processing Pipeline

#### Parsing (Markdown → Editor)
- Tiptap's `@tiptap/markdown` extension converts to ProseMirror schema
- **Blank line navigation:** `addBlankLinePlaceholders()` inserts ZWS (`\u200B`) paragraph nodes for each blank line so ProseMirror creates navigable nodes. ZWS is stripped on save by `serializeMarkdown()`.
  - **Known limitation:** Files containing literal `\u200B` characters will have them stripped on the next save cycle.
- **Security:** Link extension uses `validateLinkHref()` (`src/utils/linkValidator.ts`) — allows only `https://`, `http://`, `mailto:` (case-insensitive); blocks `javascript:`, `mailto:javascript:`, `data:`, null bytes, newlines.
- **Size limit:** `MAX_CONTENT_SIZE_BYTES = 10MB` enforced in constants

#### Serialization (Editor → Markdown)
Located in `src/utils/markdownSerializer.ts`:

- `serializeMarkdown()` - Main entry point; calls both steps below in order
- `postprocessMarkdown()` - Strips ZWS placeholders, removes `&nbsp;`, normalizes CRLF, trims trailing whitespace, ensures POSIX trailing newline
- `collapseParagraphGaps()` - Collapses all `\n\n` → `\n` outside fenced code blocks. Single Enter → `splitBlock` → Tiptap `\n\n` → collapsed to `\n`. Double Enter → empty paragraph → 4 raw newlines → collapsed to `\n\n` (one blank line). Math: K blank lines via ZWS → 2*(K+1) raw newlines → K+1 newlines after collapse = K blank lines preserved.

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
  - User edits → `onUpdate` (30ms debounce) → `serializeMarkdown()` → `postMessage('update')`
  - Extension message → `handleDocumentChanged` → content equality check → `setContent({ emitUpdate: false })` + scroll restore (only when content actually changed)
- **Heading margins (Notion-like, visual only):** `media/webview/styles.css` sets `margin-top`/`margin-bottom` on `h1`–`h6` inside `.ProseMirror` to create visual spacing between sections. First child has `margin-top: 0`. The visual spacing is CSS-only; `collapseParagraphGaps()` in the serializer removes Tiptap's injected `\n\n` so the file stores `# Heading\ntext` (no blank line).
- **`SoftBreaksExtension`** (priority 150): overrides Enter key
  - Enter in a top-level heading → `splitBlock({ keepMarks: false })` + clears stored marks (new paragraph, no mark carry-over)
  - Enter in a top-level paragraph → `splitBlock({ keepMarks: false })` + clears stored marks; Tiptap emits `\n\n` which `collapseParagraphGaps` collapses to `\n` (single Enter = no blank line in file)
  - Double Enter → second Enter in empty paragraph → another `splitBlock`; the empty paragraph in Tiptap emits 4 raw newlines → collapsed to `\n\n` = one blank line in file
  - Enter in list items, blockquotes (depth 2+) → default behavior (unchanged)
  - Mark clearing: `tr.setStoredMarks([])` prevents bold/italic from carrying over to the next typed character after Enter

### Security

1. **Content Security Policy (CSP):**
   - Located in `MarkdownEditorProvider.getHtmlForWebview()`
   - Strict CSP with cryptographic nonces (`crypto.randomBytes(16)`, 128-bit entropy)
   - `default-src 'none'` - deny all by default
   - `'unsafe-inline'` required for `style-src` due to ProseMirror inline style generation (documented accepted risk)

2. **XSS Prevention:**
   - `validateLinkHref()` in `src/utils/linkValidator.ts`: allowlist-only (`https?://`, `mailto:`), case-insensitive, blocks `mailto:javascript:` via negative lookahead, rejects null bytes / newlines
   - No raw HTML passthrough in markdown parser

3. **Input Validation:**
   - `MAX_CONTENT_SIZE_BYTES = 10MB` enforced in both extension host and webview
   - `isValidScrollDimension()` in `providerUtils.ts`: rejects NaN, Infinity, negative scroll values
   - NaN/Infinity guards in `scrollUtils.ts` (`scrollStateToLine`, `lineToScrollState`)
   - `scrollRestoreLine` message: `line` and `totalLines` validated before use
   - `formatBytes()` validates non-negative finite numbers

### Configuration

Extension settings in `package.json` → `contributes.configuration`:
- `showSyntaxOnFocus` (boolean, default: true) - Show markdown syntax when editing
- `autoReloadOnExternalChanges` (boolean, default: true) - Auto-reload on external edits
- `virtualizationThreshold` (number, default: 512000) - Performance threshold for large files

### Key Files

**Extension Host (Node.js):**
- `src/extension.ts` - Extension activation/deactivation
- `src/providers/markdownEditorProvider.ts` - Custom editor provider
- `src/utils/debounce.ts` - Debouncing utility

**Webview (Browser):**
- `src/editor/webview/editor.ts` - Tiptap init, `SoftBreaksExtension`, scroll sync
- `media/webview/styles.css` - Editor styling (all block elements `margin: 0`)

**Utilities (Shared concepts, separate bundles):**
- `src/constants.ts` - Centralized constants, `formatBytes()`
- `src/utils/markdownSerializer.ts` - `serializeMarkdown`, `postprocessMarkdown`, `collapseParagraphGaps`
- `src/utils/blankLinePlaceholders.ts` - `addBlankLinePlaceholders` (ZWS paragraph insertion)
- `src/utils/scrollUtils.ts` - `scrollStateToLine`, `lineToScrollState` (with NaN/Infinity guards)
- `src/utils/providerUtils.ts` - `isWithinCooldown`, `isEchoContent`, `isValidScrollDimension`
- `src/utils/linkValidator.ts` - `validateLinkHref` (URL allowlist, `mailto:javascript:` guard)
- `src/utils/debounce.ts` - Debouncing utility
- `src/types.ts` - Message type definitions

**Tests:**
- `test/setup.ts` - JSDOM setup for testing Tiptap in Node.js
- `test/roundtrip.test.ts` - Round-trip fidelity tests (32 tests, 13 expected raw-Tiptap failures)
- `test/link-image.test.ts` - Link and image handling tests
- `test/constants.test.ts` - Utility function tests (14 tests)
- `test/markdownSerializer.test.ts` - Serializer pipeline tests (24 tests)
- `test/blankLinePlaceholders.test.ts` - ZWS placeholder insertion tests (13 tests)
- `test/blank-line-navigation.test.ts` - Integration: blank line structure + round-trip (9 tests)
- `test/scrollUtils.test.ts` - Scroll conversion tests incl. NaN/Infinity (22 tests)
- `test/providerUtils.test.ts` - Provider pure utility tests incl. scroll validation (16 tests)
- `test/linkValidator.test.ts` - URL validation tests (15 tests)

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

2. **Webview Bundle Size:** ~452KB (exceeds webpack recommendation of 244KB) - acceptable for rich text editor with Tiptap dependencies.

3. **ZWS Character Stripping:** `postprocessMarkdown()` strips all `\u200B` (zero-width space) characters on save. Files that legitimately contain `\u200B` (e.g., East Asian typography) will have them removed silently.

4. **Fenced Code Block Detection:** `addBlankLinePlaceholders()` tracks fence type (`\`` vs `~`) but does not handle indented fences (up to 3 spaces per CommonMark spec). Indented fences are uncommon in practice.

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
