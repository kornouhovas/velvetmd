# Velvet MD Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement four practical improvements: serializer refactor, config reading, bidirectional scroll sync, and extracted provider unit tests.

**Architecture:** TDD throughout. Four independent tasks committed separately. All changes stay within the existing dual-bundle webpack setup (Node.js extension host + browser webview).

**Tech Stack:** TypeScript, VS Code Extension API, Tiptap/ProseMirror, Node.js built-in test runner (`node:test`), `npx tsx` for running tests.

---

## Task 1: Fix `serializeMarkdown` — remove duplicate processing

**Files:**
- Modify: `src/utils/markdownSerializer.ts`
- Create: `test/markdownSerializer.test.ts`

**Context:** `postprocessMarkdown` and `normalizeMarkdownWhitespace` both normalize CRLF and trailing whitespace. After the refactor, `normalizeMarkdownWhitespace` will only do paragraph spacing (its unique responsibility). Behavior stays identical: max 1 blank line between paragraphs, POSIX trailing newline, no `&nbsp;`.

---

**Step 1: Write the failing tests**

Create `test/markdownSerializer.test.ts`:

```typescript
import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  postprocessMarkdown,
  normalizeMarkdownWhitespace,
  serializeMarkdown
} from '../src/utils/markdownSerializer';

describe('postprocessMarkdown', () => {
  test('removes &nbsp; entities', () => {
    assert.strictEqual(postprocessMarkdown('hello&nbsp;'), 'hello\n');
    assert.strictEqual(postprocessMarkdown('line&nbsp;\nother'), 'line\nother\n');
  });

  test('normalizes CRLF to LF', () => {
    assert.strictEqual(postprocessMarkdown('a\r\nb'), 'a\nb\n');
  });

  test('removes trailing whitespace from lines', () => {
    assert.strictEqual(postprocessMarkdown('hello   \nworld'), 'hello\nworld\n');
  });

  test('collapses 4+ consecutive newlines to 3', () => {
    assert.strictEqual(postprocessMarkdown('a\n\n\n\nb'), 'a\n\n\nb\n');
  });

  test('adds POSIX trailing newline', () => {
    assert.strictEqual(postprocessMarkdown('hello'), 'hello\n');
  });

  test('returns empty string for empty/invalid input', () => {
    assert.strictEqual(postprocessMarkdown(''), '');
    assert.strictEqual(postprocessMarkdown('   '), '');
  });
});

describe('normalizeMarkdownWhitespace', () => {
  test('collapses 3+ consecutive newlines to 2 (1 blank line)', () => {
    assert.strictEqual(normalizeMarkdownWhitespace('a\n\n\nb'), 'a\n\nb');
  });

  test('does not change content with single blank line', () => {
    assert.strictEqual(normalizeMarkdownWhitespace('a\n\nb'), 'a\n\nb');
  });

  test('returns empty string for empty/invalid input', () => {
    assert.strictEqual(normalizeMarkdownWhitespace(''), '');
  });
});

describe('serializeMarkdown', () => {
  test('full pipeline: removes &nbsp;, CRLF, trailing whitespace, normalizes blanks', () => {
    const input = 'para 1  \r\n\n\n\npara 2&nbsp;';
    const result = serializeMarkdown(input);
    assert.strictEqual(result, 'para 1\n\npara 2\n');
  });

  test('returns empty string for empty input', () => {
    assert.strictEqual(serializeMarkdown(''), '');
  });

  test('preserves inline code', () => {
    assert.strictEqual(serializeMarkdown('`code`'), '`code`\n');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx tsx test/markdownSerializer.test.ts
```

Expected: tests for `normalizeMarkdownWhitespace` will fail (it currently still has CRLF and trailing-whitespace steps, so inputs like `'a\n\n\nb'` pass through without issue — but the "only collapses newlines" assertion may pass incidentally). Run to confirm the current behavior before changing.

**Step 3: Refactor `src/utils/markdownSerializer.ts`**

Replace `normalizeMarkdownWhitespace` to remove duplicate steps:

```typescript
/**
 * Normalize markdown whitespace
 *
 * Single responsibility: paragraph spacing only.
 * CRLF normalization and trailing whitespace removal
 * are handled upstream by postprocessMarkdown.
 */
export function normalizeMarkdownWhitespace(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Normalize paragraph spacing (ensure max one blank line between paragraphs)
  return markdown.replace(/\n{3,}/g, '\n\n');
}
```

**Step 4: Run tests to verify they pass**

```bash
npx tsx test/markdownSerializer.test.ts
```

Expected: all tests pass.

**Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add src/utils/markdownSerializer.ts test/markdownSerializer.test.ts
git commit -m "refactor: remove duplicate CRLF/whitespace processing from normalizeMarkdownWhitespace"
```

---

## Task 2: Read VS Code configuration settings

**Files:**
- Modify: `src/types.ts`
- Modify: `src/providers/markdownEditorProvider.ts`

**Context:** Two settings exist in `package.json` → `contributes.configuration` but are never read:
- `velvetMd.autoReloadOnExternalChanges` (boolean, default true) — skip webview reload on external edits if false
- `velvetMd.showSyntaxOnFocus` (boolean, default true) — forward to webview via config message

---

**Step 1: Add `ConfigMessage` and `ScrollSyncMessage` placeholder to `src/types.ts`**

(Adding both now so the webview types are complete for Task 3.)

Replace the entire `src/types.ts`:

```typescript
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
}

export type WebviewMessage = UpdateMessage | ReadyMessage | ErrorMessage | ScrollSyncMessage;
export type ExtensionMessage = DocumentChangedMessage | ConfigMessage | ScrollRestoreLineMessage;
```

**Step 2: Run typecheck to see what breaks**

```bash
npm run typecheck
```

Expected: errors in `markdownEditorProvider.ts` and `editor.ts` because `ExtensionMessage` union changed. Note the errors — we'll fix them in subsequent steps.

**Step 3: Add config reading to `markdownEditorProvider.ts`**

Add a private helper method near the top of the class body (after the `log` method):

```typescript
private getConfig(): { autoReloadOnExternalChanges: boolean; showSyntaxOnFocus: boolean } {
  const cfg = vscode.workspace.getConfiguration('velvetMd');
  return {
    autoReloadOnExternalChanges: cfg.get('autoReloadOnExternalChanges', true),
    showSyntaxOnFocus: cfg.get('showSyntaxOnFocus', true)
  };
}

private sendConfigToWebview(webview: vscode.Webview): void {
  const { showSyntaxOnFocus } = this.getConfig();
  webview.postMessage({ type: 'config', showSyntaxOnFocus } satisfies ConfigMessage);
}
```

Add `import { ConfigMessage, WebviewMessage } from '../types';` — update existing types import to include `ConfigMessage`.

**Step 4: Gate external reload on `autoReloadOnExternalChanges`**

In `setupDocumentChangeHandling`, inside the debouncedUpdate callback, BEFORE `sendDocumentToWebview`, add:

```typescript
// Genuine external change
this.lastUpdates.delete(doc.uri.toString());
this.lastWebviewContent.delete(doc.uri.toString());

if (!this.getConfig().autoReloadOnExternalChanges) {
  this.log('INFO', 'autoReloadOnExternalChanges disabled, skipping reload');
  return;
}

this.log('INFO', 'External change detected, updating webview');
this.sendDocumentToWebview(doc, webviewPanel.webview);
```

**Step 5: Send config on editor open and on config change**

In `resolveCustomTextEditor`, after `sendDocumentToWebview(document, webviewPanel.webview)`, add:

```typescript
// Send initial config
this.sendConfigToWebview(webviewPanel.webview);

// Re-send config when VS Code settings change
const configSubscription = vscode.workspace.onDidChangeConfiguration(e => {
  if (e.affectsConfiguration('velvetMd')) {
    this.sendConfigToWebview(webviewPanel.webview);
  }
});
```

And in `webviewPanel.onDidDispose`, add `configSubscription.dispose()`.

**Step 6: Handle `config` message in webview `editor.ts`**

In `setupMessageListener`, add a case to the switch:

```typescript
case 'config':
  // Store config for future use (showSyntaxOnFocus Tiptap extension is a separate feature)
  state.showSyntaxOnFocus = message.showSyntaxOnFocus;
  break;
```

Add `showSyntaxOnFocus: boolean` to the `EditorState` interface (default `true`):

```typescript
interface EditorState {
  editor: Editor | null;
  messageHandler: ((event: MessageEvent<ExtensionMessage>) => void) | null;
  showSyntaxOnFocus: boolean;
}
```

Initialize in `createEditorManager`:
```typescript
const state: EditorState = {
  editor: null,
  messageHandler: null,
  showSyntaxOnFocus: true
};
```

**Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

**Step 8: Commit**

```bash
git add src/types.ts src/providers/markdownEditorProvider.ts src/editor/webview/editor.ts
git commit -m "feat: read autoReloadOnExternalChanges and showSyntaxOnFocus from VS Code configuration"
```

---

## Task 3: Bidirectional scroll sync

**Files:**
- Modify: `src/utils/scrollUtils.ts`
- Modify: `test/scrollUtils.test.ts`
- Modify: `src/providers/markdownEditorProvider.ts`
- Modify: `src/editor/webview/editor.ts`
- Modify: `src/extension.ts`

**Context:** `scrollUtils.ts` has `scrollStateToLine` (webview scroll → line number) but lacks the inverse. We wire up scroll events in the webview, store scroll state in the extension, restore scroll on content reload, and capture the text editor's line when switching via `openWithVelvet`.

---

### Task 3a: Add `lineToScrollState` to `scrollUtils.ts`

**Step 1: Write the failing tests**

Append to `test/scrollUtils.test.ts`:

```typescript
import { scrollStateToLine, lineToScrollState } from '../src/utils/scrollUtils';

// ... existing tests above ...

describe('lineToScrollState', () => {
  // AT-SC-009
  test('AT-SC-009: line=0 → scrollTop=0', () => {
    assert.strictEqual(lineToScrollState(0, 100, 2000, 800), 0);
  });

  // AT-SC-010
  test('AT-SC-010: last line → scrollTop=scrollableHeight', () => {
    // scrollableHeight = 2000 - 800 = 1200; line=99, maxLine=99 → percent=1 → 1200
    assert.strictEqual(lineToScrollState(99, 100, 2000, 800), 1200);
  });

  // AT-SC-011
  test('AT-SC-011: middle line → scrollTop=50% of scrollableHeight', () => {
    // line=50, maxLine=100 → percent=0.5 → 0.5 * 1200 = 600
    assert.strictEqual(lineToScrollState(50, 101, 2000, 800), 600);
  });

  // AT-SC-012
  test('AT-SC-012: scrollHeight=viewportHeight (no scroll) → 0', () => {
    assert.strictEqual(lineToScrollState(50, 100, 800, 800), 0);
  });

  // AT-SC-013
  test('AT-SC-013: totalLines=1 → always 0', () => {
    assert.strictEqual(lineToScrollState(0, 1, 2000, 800), 0);
  });

  // AT-SC-014
  test('AT-SC-014: totalLines=0 → always 0', () => {
    assert.strictEqual(lineToScrollState(0, 0, 2000, 800), 0);
  });

  // AT-SC-015
  test('AT-SC-015: line > totalLines-1 (clamped to scrollableHeight)', () => {
    assert.strictEqual(lineToScrollState(200, 100, 2000, 800), 1200);
  });

  // AT-SC-016: round-trip: lineToScrollState ∘ scrollStateToLine ≈ identity
  test('AT-SC-016: round-trip: scrollStateToLine(lineToScrollState(line)) ≈ line', () => {
    const line = 42;
    const scrollTop = lineToScrollState(line, 100, 2000, 800);
    const recovered = scrollStateToLine(scrollTop, 2000, 800, 100);
    assert.strictEqual(recovered, line);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx tsx test/scrollUtils.test.ts
```

Expected: `lineToScrollState is not a function` (or equivalent import error).

**Step 3: Implement `lineToScrollState` in `src/utils/scrollUtils.ts`**

Append to the file:

```typescript
/**
 * Converts a target line number to a webview scrollTop offset.
 *
 * Inverse of scrollStateToLine. Maps a 0-based line index to the
 * pixel offset needed to restore an equivalent scroll position.
 *
 * @param line           - Target line index (0-based)
 * @param totalLines     - Total number of lines in the document
 * @param scrollHeight   - Total scrollable height (px) of webview document
 * @param viewportHeight - Visible viewport height (px)
 * @returns scrollTop value (px), clamped to [0, scrollableHeight]
 */
export function lineToScrollState(
  line: number,
  totalLines: number,
  scrollHeight: number,
  viewportHeight: number
): number {
  if (totalLines <= 1) { return 0; }

  const scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
  if (scrollableHeight === 0) { return 0; }

  const maxLine = totalLines - 1;
  const linePercent = Math.max(0, Math.min(line / maxLine, 1));
  return Math.round(linePercent * scrollableHeight);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx tsx test/scrollUtils.test.ts
```

Expected: all 16 tests pass (AT-SC-001 through AT-SC-016).

**Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add src/utils/scrollUtils.ts test/scrollUtils.test.ts
git commit -m "feat: add lineToScrollState — inverse of scrollStateToLine"
```

---

### Task 3b: Extension host — store scroll state, restore on reload

**Step 1: Add scroll state storage to `markdownEditorProvider.ts`**

Add a new private field to the class (alongside existing Maps):

```typescript
private readonly lastScrollTop = new Map<string, number>();
```

**Step 2: Handle `scrollSync` messages from webview**

In `setupMessageHandling`, add a case to the switch (after the `'error'` case):

```typescript
case 'scrollSync': {
  const { scrollTop, scrollHeight, viewportHeight } = message as ScrollSyncMessage;
  if (
    typeof scrollTop === 'number' &&
    typeof scrollHeight === 'number' &&
    typeof viewportHeight === 'number'
  ) {
    this.lastScrollTop.set(document.uri.toString(), scrollTop);
  }
  break;
}
```

Add `ScrollSyncMessage` to the import from `'../types'`.

Update `isValidWebviewMessage` to also accept `'scrollSync'`:

```typescript
private isValidWebviewMessage(message: unknown): message is WebviewMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (
      message.type === 'update' ||
      message.type === 'ready' ||
      message.type === 'error' ||
      message.type === 'scrollSync'
    )
  );
}
```

**Step 3: Send scroll restore alongside `documentChanged`**

Update `sendDocumentToWebview` to include the stored scrollTop:

```typescript
private sendDocumentToWebview(
  document: vscode.TextDocument,
  webview: vscode.Webview
): void {
  const scrollTop = this.lastScrollTop.get(document.uri.toString());
  webview.postMessage({
    type: 'documentChanged',
    content: document.getText(),
    ...(scrollTop !== undefined ? { scrollTop } : {})
  });
}
```

**Step 4: Clean up scroll state on dispose**

In `webviewPanel.onDidDispose`, add:

```typescript
this.lastScrollTop.delete(document.uri.toString());
```

**Step 5: Expose a method for setting pending scroll line (used by openWithVelvet)**

Add to the class:

```typescript
public setPendingScrollLine(uri: string, line: number): void {
  this.pendingScrollLines.set(uri, line);
}

private readonly pendingScrollLines = new Map<string, number>();
```

And in `resolveCustomTextEditor`, in the `'ready'` case of `setupMessageHandling`:

```typescript
case 'ready':
  this.log('INFO', 'Webview ready');
  this.sendDocumentToWebview(document, webview);
  this.sendConfigToWebview(webview);
  // Restore scroll position from text editor if set
  const pendingLine = this.pendingScrollLines.get(document.uri.toString());
  if (pendingLine !== undefined) {
    this.pendingScrollLines.delete(document.uri.toString());
    webview.postMessage({ type: 'scrollRestoreLine', line: pendingLine });
  }
  break;
```

**Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

---

### Task 3c: Extension entry — capture text editor scroll on `openWithVelvet`

**Step 1: Update `src/extension.ts` to capture visible line before switching**

Replace the `openWithVelvetCommand` registration:

```typescript
const openWithVelvetCommand = vscode.commands.registerCommand(
  'velvetMd.openWithVelvet',
  async () => {
    const textEditor = vscode.window.activeTextEditor;
    if (textEditor) {
      const line = textEditor.visibleRanges[0]?.start.line ?? 0;
      provider.setPendingScrollLine(textEditor.document.uri.toString(), line);
    }
    await vscode.commands.executeCommand('reopenActiveEditorWith', 'velvetMd.editor');
  }
);
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

---

### Task 3d: Webview — emit scroll events and handle restore

**Step 1: Add scroll sync and restore to `src/editor/webview/editor.ts`**

Add the import for `lineToScrollState`:

```typescript
import { lineToScrollState } from '../../utils/scrollUtils';
```

Add scroll listener setup as a new function:

```typescript
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
```

Add `scrollCleanup` to `EditorState`:

```typescript
interface EditorState {
  editor: Editor | null;
  messageHandler: ((event: MessageEvent<ExtensionMessage>) => void) | null;
  showSyntaxOnFocus: boolean;
  scrollCleanup: (() => void) | null;
}
```

Initialize in `createEditorManager`:

```typescript
const state: EditorState = {
  editor: null,
  messageHandler: null,
  showSyntaxOnFocus: true,
  scrollCleanup: null
};
```

In `initializeEditor`, after `setupMessageListener(state)`:

```typescript
state.scrollCleanup = setupScrollSync();
```

In `cleanupEditor`:

```typescript
if (state.scrollCleanup) {
  state.scrollCleanup();
  state.scrollCleanup = null;
}
```

**Step 2: Handle `scrollRestore` and `scrollRestoreLine` in `setupMessageListener`**

Update `handleDocumentChanged` to optionally restore scroll. Update `DocumentChangedMessage` handler:

```typescript
case 'documentChanged':
  handleDocumentChanged(state, message.content);
  if (typeof message.scrollTop === 'number') {
    const scrollTop = message.scrollTop;
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollTop, behavior: 'instant' });
    });
  }
  break;
```

Add a new case:

```typescript
case 'scrollRestoreLine': {
  const el = document.documentElement;
  const scrollTop = lineToScrollState(
    message.line,
    el.scrollHeight,  // totalLines not available; use line as fraction of scrollHeight
    el.scrollHeight,
    el.clientHeight
  );
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollTop, behavior: 'instant' });
  });
  break;
}
```

> **Note:** `scrollRestoreLine` doesn't have access to `totalLines` in the webview. The best approximation is to treat the line as a fractional position using an estimated line height (e.g., 24px). Alternative: the extension sends `totalLines` from `document.lineCount`.

**Alternative (recommended) — have the extension send `totalLines`:**

Update `ScrollRestoreLineMessage` in `types.ts`:
```typescript
export interface ScrollRestoreLineMessage {
  type: 'scrollRestoreLine';
  line: number;
  totalLines: number;
}
```

In `markdownEditorProvider.ts`, update the ready handler:
```typescript
webview.postMessage({
  type: 'scrollRestoreLine',
  line: pendingLine,
  totalLines: document.lineCount
});
```

In `editor.ts`:
```typescript
case 'scrollRestoreLine': {
  const el = document.documentElement;
  const scrollTop = lineToScrollState(
    message.line,
    message.totalLines,
    el.scrollHeight,
    el.clientHeight
  );
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollTop, behavior: 'instant' });
  });
  break;
}
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

**Step 4: Commit all Task 3 changes**

```bash
git add \
  src/utils/scrollUtils.ts \
  test/scrollUtils.test.ts \
  src/types.ts \
  src/providers/markdownEditorProvider.ts \
  src/editor/webview/editor.ts \
  src/extension.ts
git commit -m "feat: add bidirectional scroll sync between webview and text editor"
```

---

## Task 4: Extract provider pure functions and add unit tests

**Files:**
- Create: `src/utils/providerUtils.ts`
- Create: `test/providerUtils.test.ts`
- Modify: `src/providers/markdownEditorProvider.ts`

**Context:** `markdownEditorProvider.ts` has complex echo-loop detection logic that can't be unit tested without VS Code API mocks. We extract two pure functions with zero dependencies and test them directly.

---

**Step 1: Write the failing tests**

Create `test/providerUtils.test.ts`:

```typescript
import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { isWithinCooldown, isEchoContent } from '../src/utils/providerUtils';

describe('isWithinCooldown', () => {
  test('returns true when within cooldown window', () => {
    assert.strictEqual(isWithinCooldown(1000, 1200, 500), true);
  });

  test('returns false when cooldown has expired', () => {
    assert.strictEqual(isWithinCooldown(1000, 1600, 500), false);
  });

  test('returns false when exactly at the cooldown boundary', () => {
    // timeSince = 500, cooldown = 500: NOT within (strict <)
    assert.strictEqual(isWithinCooldown(1000, 1500, 500), false);
  });

  test('returns true for very recent update (1ms ago)', () => {
    assert.strictEqual(isWithinCooldown(1000, 1001, 500), true);
  });

  test('returns false for zero-cooldown (always expired)', () => {
    assert.strictEqual(isWithinCooldown(1000, 1000, 0), false);
  });
});

describe('isEchoContent', () => {
  test('returns true when content exactly matches last webview content', () => {
    assert.strictEqual(isEchoContent('# Hello\n', '# Hello\n'), true);
  });

  test('returns false when content differs', () => {
    assert.strictEqual(isEchoContent('# Hello\n', '# World\n'), false);
  });

  test('returns false when current is empty and last is not', () => {
    assert.strictEqual(isEchoContent('', '# Hello\n'), false);
  });

  test('returns true when both are empty', () => {
    assert.strictEqual(isEchoContent('', ''), true);
  });

  test('returns false when last content is undefined (no previous webview update)', () => {
    assert.strictEqual(isEchoContent('# Hello\n', undefined), false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx tsx test/providerUtils.test.ts
```

Expected: module not found error.

**Step 3: Create `src/utils/providerUtils.ts`**

```typescript
/**
 * Pure utility functions extracted from MarkdownEditorProvider
 * for isolated unit testing without VS Code API dependencies.
 */

/**
 * Returns true if a webview update is still within the cooldown window.
 *
 * Used to detect echo: after a webview update triggers a document change,
 * the change event fires within WEBVIEW_UPDATE_COOLDOWN_MS. If we're still
 * within that window, the change is assumed to be an echo, not an external edit.
 *
 * @param lastUpdateTimestamp - Timestamp (ms) when the webview last sent an update
 * @param now                 - Current timestamp (ms)
 * @param cooldownMs          - Cooldown window in milliseconds
 */
export function isWithinCooldown(
  lastUpdateTimestamp: number,
  now: number,
  cooldownMs: number
): boolean {
  return now - lastUpdateTimestamp < cooldownMs;
}

/**
 * Returns true if the current document content matches the last content
 * sent by the webview, indicating a slow echo rather than an external edit.
 *
 * @param currentContent    - Current text of the VS Code document
 * @param lastWebviewContent - Last content string sent from webview (may be undefined)
 */
export function isEchoContent(
  currentContent: string,
  lastWebviewContent: string | undefined
): boolean {
  return lastWebviewContent !== undefined && currentContent === lastWebviewContent;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx tsx test/providerUtils.test.ts
```

Expected: all 10 tests pass.

**Step 5: Update `markdownEditorProvider.ts` to use the extracted functions**

Add import at the top:

```typescript
import { isWithinCooldown, isEchoContent } from '../utils/providerUtils';
```

In `setupDocumentChangeHandling`, replace the inline cooldown check:

```typescript
// Before:
if (timeSinceUpdate < MarkdownEditorProvider.WEBVIEW_UPDATE_COOLDOWN_MS) {

// After:
if (isWithinCooldown(lastUpdate.timestamp, Date.now(), MarkdownEditorProvider.WEBVIEW_UPDATE_COOLDOWN_MS)) {
```

Replace the inline echo content check:

```typescript
// Before:
const lastContent = this.lastWebviewContent.get(doc.uri.toString());
if (lastContent === doc.getText()) {

// After:
const lastContent = this.lastWebviewContent.get(doc.uri.toString());
if (isEchoContent(doc.getText(), lastContent)) {
```

Remove the now-redundant inline `timeSinceUpdate` variable:

```typescript
// Before:
const timeSinceUpdate = Date.now() - lastUpdate.timestamp;
if (timeSinceUpdate < MarkdownEditorProvider.WEBVIEW_UPDATE_COOLDOWN_MS) {
  this.log('INFO', `Skipping update - came from webview (${timeSinceUpdate}ms ago)`);

// After:
const timeSinceUpdate = Date.now() - lastUpdate.timestamp;
if (isWithinCooldown(lastUpdate.timestamp, Date.now(), MarkdownEditorProvider.WEBVIEW_UPDATE_COOLDOWN_MS)) {
  this.log('INFO', `Skipping update - came from webview (${timeSinceUpdate}ms ago)`);
```

(Keep `timeSinceUpdate` for the log message.)

**Step 6: Run typecheck and all tests**

```bash
npm run typecheck && npx tsx test/providerUtils.test.ts && npx tsx test/markdownSerializer.test.ts && npx tsx test/scrollUtils.test.ts && npx tsx test/constants.test.ts
```

Expected: zero type errors, all tests pass.

**Step 7: Commit**

```bash
git add src/utils/providerUtils.ts test/providerUtils.test.ts src/providers/markdownEditorProvider.ts
git commit -m "refactor: extract pure provider utils and add unit tests for cooldown and echo detection"
```

---

## Final Verification

Run the full build pipeline:

```bash
npm run build
```

Expected: typecheck passes, lint passes, webpack compiles both bundles without errors.

Run all tests:

```bash
npx tsx test/constants.test.ts && \
npx tsx test/markdownSerializer.test.ts && \
npx tsx test/scrollUtils.test.ts && \
npx tsx test/providerUtils.test.ts
```

Expected: all tests pass across all four test files.
