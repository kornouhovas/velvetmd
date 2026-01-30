# Implementation Plan: Phase 1 - Core Editor (Markdown Live Editor)

## Executive Summary

**Цель:** Создать функциональный MVP VS Code расширения с live preview редактированием Markdown, фокус-режимом и production-ready performance для файлов до 1MB.

**Timeline:** 2-3 недели (10-15 рабочих дней)

**Критерий успеха:** Комфортное редактирование обычных Markdown документов без таблиц с сохранением форматирования и производительностью < 800ms для файлов 1MB.

---

## Архитектура решения

### Компоненты системы

```
┌─────────────────────────────────────────┐
│ VS Code Extension Host                  │
│ - extension.ts (activation)             │
│ - MarkdownEditorProvider                │
│ - Command handlers                      │
│ - File watcher                          │
├─────────────────────────────────────────┤
│          Message Bus (postMessage)       │
├─────────────────────────────────────────┤
│ Webview (Isolated JS context)          │
│ - Tiptap Editor                         │
│ - Live Preview renderer                 │
│ - Focus mode logic                      │
│ - Markdown serializer                   │
└─────────────────────────────────────────┘
         ↕ Sync (300ms debounce)
┌─────────────────────────────────────────┐
│ VS Code TextDocument (source of truth)  │
└─────────────────────────────────────────┘
```

### Ключевые технические решения

1. **CustomTextEditorProvider** (не CustomEditorProvider)
   - VS Code управляет сохранением и undo/redo
   - Проще интеграция, меньше кода

2. **Tiptap** (обертка над Prosemirror)
   - Встроенная поддержка Markdown bidirectional conversion
   - Быстрый старт для MVP

3. **Debounced sync (300ms)**
   - Предотвращение update loops
   - Оптимизация производительности

4. **Виртуализация при > 500KB**
   - Только если baseline benchmarks не пройдут
   - Опционально для Phase 1

---

## План реализации (12 задач)

### Week 1: Foundation (Days 1-5)

#### Task 1: Project Setup & Infrastructure (Day 1)
**Цель:** Bootstrap проекта с tooling

**Шаги:**
1. Инициализировать npm проект
2. Установить dependencies:
   - Runtime: `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`, `@tiptap/extension-link`, `markdown-it`
   - DevDeps: `@types/vscode`, `typescript`, `webpack`, `webpack-cli`, `ts-loader`, `eslint`, `@vscode/test-electron`
3. Создать `tsconfig.json` (ES2020, strict mode)
4. Настроить Webpack:
   - Entry 1: `src/extension.ts` → `dist/extension.js`
   - Entry 2: `src/editor/webview/editor.ts` → `dist/webview.js`
   - Separate bundles для extension host и webview
5. Настроить ESLint (TypeScript, no console.log, max 50 lines/function)
6. Создать структуру директорий:
   ```
   src/
   ├── extension.ts
   ├── providers/markdownEditorProvider.ts
   ├── editor/
   │   ├── extensions/
   │   │   ├── livePreview.ts
   │   │   └── markdown.ts
   │   └── webview/
   │       ├── index.html
   │       ├── editor.ts
   │       └── styles.css
   ├── commands/formatText.ts
   └── utils/
       ├── markdownParser.ts
       ├── markdownSerializer.ts
       └── fileWatcher.ts
   ```
7. Создать базовый `package.json` manifest:
   ```json
   {
     "activationEvents": ["onCustomEditor:markdownLiveEditor.editor"],
     "contributes": {
       "customEditors": [{
         "viewType": "markdownLiveEditor.editor",
         "selector": [{ "filenamePattern": "*.md" }],
         "priority": "default"
       }]
     }
   }
   ```

**Verification:**
- `npm run compile` успешно
- `npm run lint` проходит
- VS Code Extension Development Host запускается

---

#### Task 2: Custom Editor Provider Skeleton (Days 2-3)
**Цель:** Базовая интеграция с VS Code Custom Editor API

**Шаги:**
1. Создать класс `MarkdownEditorProvider implements CustomTextEditorProvider`:
   ```typescript
   resolveCustomTextEditor(
     document: vscode.TextDocument,
     webviewPanel: vscode.WebviewPanel,
     _token: vscode.CancellationToken
   ): Promise<void>
   ```
2. Настроить webview:
   - `enableScripts: true`
   - Restrictive CSP с nonces
   - Load assets из `dist/` через `webview.asWebviewUri()`
3. Зарегистрировать provider в `extension.ts`:
   ```typescript
   vscode.window.registerCustomEditorProvider(
     'markdownLiveEditor.editor',
     provider,
     { webviewOptions: { retainContextWhenHidden: true } }
   )
   ```
4. Создать HTML template (`src/editor/webview/index.html`):
   ```html
   <div id="editor"></div>
   <script src="{scriptUri}"></script>
   ```
5. Реализовать bidirectional message passing:
   - **Webview → Extension:** `vscode.postMessage({ type: 'update', content })`
   - **Extension → Webview:** `webview.postMessage({ type: 'documentChanged', content })`
6. Обработка изменений документа:
   ```typescript
   vscode.workspace.onDidChangeTextDocument(e => {
     if (e.document.uri.toString() === document.uri.toString()) {
       updateWebview(e.document, webview);
     }
   });
   ```
7. Обработка изменений из webview:
   ```typescript
   webview.onDidReceiveMessage(async (message) => {
     if (message.type === 'update') {
       const edit = new vscode.WorkspaceEdit();
       edit.replace(document.uri, fullRange, message.content);
       await vscode.workspace.applyEdit(edit);
     }
   });
   ```
8. **Критично:** Implement debounce (300ms) с metadata tracking для предотвращения update loops

**Verification:**
- Открытие `.md` файла запускает custom editor
- Typing в webview обновляет TextDocument
- Внешние изменения файла отражаются в webview
- Нет infinite loops

---

#### Task 3: Tiptap Editor Integration (Days 3-4)
**Цель:** Embed Tiptap в webview

**Шаги:**
1. Создать editor initialization (`src/editor/webview/editor.ts`):
   ```typescript
   import { Editor } from '@tiptap/core'
   import StarterKit from '@tiptap/starter-kit'
   import Link from '@tiptap/extension-link'

   const editor = new Editor({
     element: document.getElementById('editor'),
     extensions: [
       StarterKit.configure({
         heading: { levels: [1, 2, 3, 4, 5, 6] },
         codeBlock: true,
         horizontalRule: true,
         blockquote: true,
         bulletList: true,
         orderedList: true
       }),
       Link.configure({ openOnClick: false })
     ],
     content: '',
     onUpdate: ({ editor }) => {
       vscode.postMessage({
         type: 'update',
         content: editor.getText() // Временно, позже markdown
       });
     }
   })
   ```
2. Setup message handler для updates:
   ```typescript
   window.addEventListener('message', event => {
     if (event.data.type === 'documentChanged') {
       editor.commands.setContent(event.data.content, { emitUpdate: false });
     }
   });
   ```
3. Стилизация (`src/editor/webview/styles.css`):
   - Использовать VS Code CSS variables: `var(--vscode-editor-foreground)`
   - Typography для заголовков, параграфов
   - Code blocks с monospace font
   - Поддержка light/dark тем
4. Initial content loading:
   - Отправить initial document content при создании webview
   - Wait for editor ready signal

**Verification:**
- Tiptap рендерится в webview
- Можно печатать и форматировать (bold, italic)
- Изменения синхронизируются с TextDocument
- Работает в light и dark темах

---

#### Task 4: Markdown Parser & Serializer (Day 5)
**Цель:** Round-trip Markdown conversion (MD → Tiptap → MD)

**Шаги:**
1. Установить `@tiptap/extension-markdown`
2. Добавить в editor extensions:
   ```typescript
   import Markdown from '@tiptap/extension-markdown'

   extensions: [
     Markdown.configure({
       html: true,
       tightLists: false,
       breaks: false
     }),
     // ... other extensions
   ]
   ```
3. Update initialization для markdown:
   ```typescript
   editor.commands.setContent(markdownContent, {
     contentType: 'markdown',
     emitUpdate: false
   });
   ```
4. Update serialization:
   ```typescript
   onUpdate: ({ editor }) => {
     const markdown = editor.getMarkdown();
     vscode.postMessage({ type: 'update', content: markdown });
   }
   ```
5. Создать utility wrappers:
   - `src/utils/markdownParser.ts`: markdown-it parsing с custom rules
   - `src/utils/markdownSerializer.ts`: AST → Markdown с preservation
6. **Критично:** Implement round-trip tests (`test/roundtrip.test.ts`):
   - Whitespace preservation
   - Nested lists
   - Combined formatting (**bold _italic_**)
   - Table alignment (для будущего)
   - 20+ edge cases

**Verification:**
- Все round-trip тесты проходят
- Markdown форматирование сохраняется после редактирования
- Нет потери данных при сохранении

---

### Week 2: Core Features (Days 6-10)

#### Task 5: Live Preview Elements (Days 6-7)
**Цель:** Рендеринг всех базовых MD элементов из FR-1

**Шаги:**
1. Стилизация заголовков (h1-h6):
   ```css
   .ProseMirror h1 { font-size: 2em; font-weight: bold; }
   .ProseMirror h2 { font-size: 1.5em; font-weight: bold; }
   /* ... h3-h6 */
   ```
2. Inline форматирование:
   ```css
   .ProseMirror strong { font-weight: bold; }
   .ProseMirror em { font-style: italic; }
   .ProseMirror code {
     background: var(--vscode-textCodeBlock-background);
     padding: 2px 4px;
     border-radius: 3px;
   }
   ```
3. Списки:
   ```css
   .ProseMirror ul { list-style-type: disc; padding-left: 2em; }
   .ProseMirror ol { list-style-type: decimal; padding-left: 2em; }
   ```
4. Blockquotes:
   ```css
   .ProseMirror blockquote {
     border-left: 4px solid var(--vscode-textBlockQuote-border);
     padding-left: 1em;
   }
   ```
5. Horizontal rules:
   ```css
   .ProseMirror hr {
     border-top: 2px solid var(--vscode-panel-border);
   }
   ```
6. Links:
   ```css
   .ProseMirror a {
     color: var(--vscode-textLink-foreground);
     text-decoration: underline;
   }
   ```
7. Тестирование каждого элемента с test.md файлом

**Verification:**
- Все элементы из FR-1 рендерятся корректно
- Preview соответствует GitHub/Obsidian рендерингу
- VS Code theme colors применяются

---

#### Task 6: Focus Mode - Syntax Visibility (Day 8)
**Цель:** Показывать markdown синтаксис при фокусе, скрывать иначе

**Шаги:**
1. Создать Tiptap extension (`src/editor/extensions/livePreview.ts`):
   ```typescript
   import { Extension } from '@tiptap/core'
   import { Plugin, PluginKey } from 'prosemirror-state'

   export const LivePreview = Extension.create({
     name: 'livePreview',
     addProseMirrorPlugins() {
       return [
         new Plugin({
           key: new PluginKey('livePreview'),
           props: {
             decorations(state) {
               // Скрыть маркеры для unfocused nodes
               // Показать для focused node
             }
           }
         })
       ]
     }
   })
   ```
2. Implement decoration logic:
   - Detect cursor position → focused node
   - Hide markers: `**`, `*`, `#`, `>`, `- ` для unfocused
   - Show markers при cursor в node
3. CSS для hidden syntax:
   ```css
   .ProseMirror .syntax-hidden { display: none; }
   .ProseMirror .node-focused .syntax-hidden {
     display: inline;
     opacity: 0.5;
   }
   ```
4. Edge cases:
   - Empty headings показывают `#`
   - Links показывают `[text](url)` при фокусе
5. Setting:
   ```json
   "markdownLiveEditor.showSyntaxOnFocus": {
     "type": "boolean",
     "default": true
   }
   ```

**Verification:**
- Синтаксис скрыт по умолчанию
- Синтаксис появляется при входе курсора
- Smooth transitions
- Respects user setting

---

#### Task 7: Keyboard Shortcuts (Day 9)
**Цель:** Форматирование через shortcuts (FR-5)

**Шаги:**
1. Зарегистрировать keybindings в `package.json`:
   ```json
   "keybindings": [
     {
       "command": "markdownLiveEditor.formatBold",
       "key": "ctrl+b",
       "mac": "cmd+b",
       "when": "activeCustomEditorId == markdownLiveEditor.editor"
     },
     {
       "command": "markdownLiveEditor.formatItalic",
       "key": "ctrl+i",
       "mac": "cmd+i",
       "when": "activeCustomEditorId == markdownLiveEditor.editor"
     },
     {
       "command": "markdownLiveEditor.formatCode",
       "key": "ctrl+`",
       "mac": "cmd+`",
       "when": "activeCustomEditorId == markdownLiveEditor.editor"
     },
     {
       "command": "markdownLiveEditor.insertLink",
       "key": "ctrl+k",
       "mac": "cmd+k",
       "when": "activeCustomEditorId == markdownLiveEditor.editor"
     }
   ]
   ```
2. Создать command handlers (`src/commands/formatText.ts`):
   ```typescript
   vscode.commands.registerCommand('markdownLiveEditor.formatBold', () => {
     webview.postMessage({ command: 'formatBold' });
   })
   ```
3. Webview command handling:
   ```typescript
   window.addEventListener('message', event => {
     switch (event.data.command) {
       case 'formatBold':
         editor.chain().focus().toggleBold().run();
         break;
       case 'formatItalic':
         editor.chain().focus().toggleItalic().run();
         break;
       case 'formatCode':
         editor.chain().focus().toggleCode().run();
         break;
       case 'insertLink':
         const url = prompt('Enter URL:');
         if (url) editor.chain().focus().setLink({ href: url }).run();
         break;
     }
   });
   ```
4. Тестирование всех shortcuts

**Verification:**
- Все FR-5 shortcuts работают
- Commands в Command Palette
- Работает с selection и cursor

---

#### Task 8: Bidirectional Sync Robustness (Day 10)
**Цель:** Стабильная синхронизация с debouncing и conflict resolution

**Шаги:**
1. Implement debounce utility (`src/utils/debounce.ts`):
   ```typescript
   export function debounce<T extends (...args: any[]) => any>(
     fn: T,
     delay: number
   ): (...args: Parameters<T>) => void {
     let timeoutId: NodeJS.Timeout | null = null;
     return (...args) => {
       if (timeoutId) clearTimeout(timeoutId);
       timeoutId = setTimeout(() => fn(...args), delay);
     };
   }
   ```
2. Change source tracking:
   ```typescript
   interface UpdateMetadata {
     source: 'webview' | 'external';
     timestamp: number;
   }
   let lastUpdate: UpdateMetadata | null = null;
   ```
3. Prevent update loops:
   ```typescript
   const debouncedUpdate = debounce((document) => {
     if (lastUpdate?.source === 'webview') {
       lastUpdate = null;
       return; // Skip, came from webview
     }
     webview.postMessage({ type: 'documentChanged', content: document.getText() });
   }, 300);
   ```
4. Concurrent edits handling:
   - Если version changed → show conflict dialog
   - Options: "Keep mine" | "Use file" | "Show diff"
5. Logging для debugging:
   ```typescript
   const logger = vscode.window.createOutputChannel('Markdown Live Editor');
   logger.appendLine(`[${timestamp}] Update: source=${source}`);
   ```

**Verification:**
- Быстрая печать без lag
- Внешние изменения (Git) синхронизируются
- Нет infinite loops
- Conflict dialog при реальных конфликтах

---

### Week 3: Performance & Quality (Days 11-15)

#### Task 9: Performance Optimization (Days 11-12)
**Цель:** NFR-1 targets + optional virtualization

**Шаги:**
1. Создать performance tests (`test/performance.test.ts`):
   ```typescript
   test('opens 100KB in < 200ms', async () => {
     const start = Date.now();
     await openFile('test-100kb.md');
     expect(Date.now() - start).toBeLessThan(200);
   });
   test('opens 1MB in < 800ms', async () => { /* ... */ });
   ```
2. Measure baseline:
   - File opening time (100KB, 500KB, 1MB)
   - Typing latency
   - Memory usage
3. Virtualization threshold:
   ```typescript
   const fileSize = document.getText().length;
   const threshold = 500 * 1024; // 500KB
   if (fileSize > threshold) {
     initializeVirtualizedEditor();
   }
   ```
4. Optimize Tiptap config для больших файлов:
   ```typescript
   editor = new Editor({
     enableInputRules: fileSize < threshold,
     enablePasteRules: fileSize < threshold,
     editorProps: {
       attributes: {
         spellcheck: fileSize < 100*1024 ? 'true' : 'false'
       }
     }
   });
   ```
5. Incremental parsing:
   - Только re-parse измененные параграфы
   - Cache parsed AST nodes
6. Performance monitoring:
   ```typescript
   if (renderDuration > 200) {
     logger.warn(`SLOW RENDER: ${renderDuration}ms for ${fileSize} bytes`);
   }
   ```

**Verification:**
- Performance tests проходят
- Smooth scrolling 60 FPS
- Нет UI freezes
- Memory < 100MB для 1MB

---

#### Task 10: File Watching & Auto-Reload (Day 13)
**Цель:** Обработка внешних изменений (FR-7)

**Шаги:**
1. Create FileWatcher (`src/utils/fileWatcher.ts`):
   ```typescript
   export class FileWatcher {
     watch(uri: vscode.Uri, onChange: () => void): void {
       const watcher = vscode.workspace.createFileSystemWatcher(
         new vscode.RelativePattern(uri, '*')
       );
       watcher.onDidChange(() => onChange());
     }
   }
   ```
2. Detect external changes:
   ```typescript
   watcher.watch(document.uri, () => {
     if (document.isDirty) {
       showConflictDialog();
     } else {
       reloadDocument();
     }
   });
   ```
3. Conflict dialog:
   ```typescript
   const choice = await vscode.window.showWarningMessage(
     'File changed externally.',
     'Use File Version',
     'Keep My Changes',
     'Show Diff'
   );
   ```
4. Auto-reload:
   ```typescript
   function reloadDocument(document: vscode.TextDocument): void {
     webview.postMessage({
       type: 'documentChanged',
       content: document.getText()
     });
   }
   ```
5. Setting:
   ```json
   "markdownLiveEditor.autoReloadOnExternalChanges": {
     "type": "boolean",
     "default": true
   }
   ```

**Verification:**
- External changes обнаруживаются
- Auto-reload без локальных edits
- Conflict dialog при edits
- Diff view работает

---

#### Task 11: Testing Suite (Day 14)
**Цель:** 80%+ coverage

**Шаги:**
1. Setup test infrastructure:
   ```typescript
   // test/suite/index.ts
   import { runTests } from '@vscode/test-electron';
   await runTests({
     extensionDevelopmentPath,
     extensionTestsPath
   });
   ```
2. Unit tests:
   - `markdownParser.test.ts`: Парсинг edge cases
   - `markdownSerializer.test.ts`: Сериализация
   - `debounce.test.ts`: Debounce logic
   - `fileWatcher.test.ts`: Watcher lifecycle
3. Integration tests:
   ```typescript
   describe('MarkdownEditorProvider', () => {
     test('opens markdown file', async () => { /* ... */ });
     test('syncs edits to document', async () => { /* ... */ });
   });
   ```
4. Round-trip tests (20+ patterns)
5. Performance tests (benchmarks)
6. Configure coverage:
   ```json
   "scripts": {
     "test:coverage": "nyc npm test"
   }
   ```

**Verification:**
- Все tests проходят
- Coverage > 80%
- Нет flaky tests

---

#### Task 12: Documentation & Polish (Day 15)
**Цель:** Finalize Phase 1

**Шаги:**
1. Update README.md:
   - Installation
   - Features с screenshots
   - Keyboard shortcuts table
   - Known limitations
   - Troubleshooting
2. Create CHANGELOG.md:
   ```markdown
   ## [0.1.0] - 2026-XX-XX
   ### Added
   - Live preview для базовых элементов
   - Focus mode
   - Keyboard shortcuts
   - File watching
   - Performance optimization до 1MB
   ```
3. Добавить все settings:
   ```json
   "markdownLiveEditor.showSyntaxOnFocus": { ... },
   "markdownLiveEditor.autoReloadOnExternalChanges": { ... },
   "markdownLiveEditor.virtualizationThreshold": { ... }
   ```
4. User-facing commands:
   ```json
   "commands": [
     { "command": "markdownLiveEditor.togglePreview", "title": "Toggle Live Preview" },
     { "command": "markdownLiveEditor.showSource", "title": "Show Markdown Source" }
   ]
   ```
5. Icon и branding (128x128 PNG)
6. Polish error handling:
   - User-friendly messages
   - Graceful degradation
7. Final QA checklist:
   - [ ] All FR-1 elements render
   - [ ] Shortcuts work
   - [ ] File watching functional
   - [ ] Performance targets met
   - [ ] No console errors

**Verification:**
- Extension готов к alpha testing
- Все Phase 1 criteria выполнены

---

## Critical Files to Modify/Create

### 5 наиболее критичных файлов:

1. **`src/providers/markdownEditorProvider.ts`** (NEW)
   - Core интеграция VS Code ↔ webview
   - Document sync, lifecycle management
   - Message passing coordinator

2. **`src/editor/webview/editor.ts`** (NEW)
   - Tiptap initialization
   - Webview message handling
   - User interactions

3. **`src/utils/markdownSerializer.ts`** (NEW)
   - Tiptap → Markdown conversion
   - Round-trip preservation критичен
   - Custom serialization rules

4. **`src/editor/extensions/livePreview.ts`** (NEW)
   - Focus mode (show/hide syntax)
   - ProseMirror decorations
   - Core UX differentiator

5. **`webpack.config.js`** (NEW)
   - Dual bundle: extension + webview
   - Asset handling, CSP compliance
   - Dev vs prod builds

---

## Verification & Testing Strategy

### End-to-End Verification Steps

После завершения всех задач:

1. **Functional Testing:**
   ```bash
   # 1. Открыть VS Code Extension Development Host
   # 2. Создать test.md со всеми элементами FR-1
   # 3. Открыть файл → должен запуститься custom editor
   # 4. Протестировать:
   - [ ] Все элементы рендерятся корректно
   - [ ] Focus mode показывает/скрывает синтаксис
   - [ ] Ctrl+B/I/K shortcuts работают
   - [ ] Внешние изменения синхронизируются
   - [ ] Сохранение сохраняет форматирование
   ```

2. **Performance Testing:**
   ```bash
   npm run test:performance
   # Verify:
   - [ ] 100KB opens in < 200ms
   - [ ] 1MB opens in < 800ms
   - [ ] Typing latency < 16ms
   - [ ] Memory < 100MB
   ```

3. **Round-trip Testing:**
   ```bash
   npm run test:roundtrip
   # Verify:
   - [ ] All 20+ test cases pass
   - [ ] No formatting loss
   ```

4. **Cross-platform Testing:**
   - [ ] Windows 10/11
   - [ ] macOS (Intel + Apple Silicon)
   - [ ] Linux (Ubuntu)

5. **Theme Testing:**
   - [ ] Light theme корректно
   - [ ] Dark theme корректно
   - [ ] High contrast режим

### Test Coverage Targets

- **Unit Tests:** 40% coverage
  - Utilities (parser, serializer, debounce)
  - Command handlers
  - Focus mode logic

- **Integration Tests:** 30% coverage
  - Provider lifecycle
  - Document ↔ Webview sync
  - File watching

- **Performance Tests:** 10% coverage
  - Benchmarks всех NFR-1 метрик

- **Manual QA:** 20% coverage
  - User workflows
  - Cross-platform
  - Theme compatibility

**Total Target:** 80%+ coverage

---

## Success Criteria Checklist

### Functional Requirements (Phase 1)

- [ ] Custom editor opens для `.md` files
- [ ] Live preview renders all FR-1 elements:
  - [ ] Headings (h1-h6)
  - [ ] Bold, italic, code
  - [ ] Lists (ordered, unordered, nested)
  - [ ] Links
  - [ ] Blockquotes
  - [ ] Horizontal rules
- [ ] Focus mode shows/hides syntax
- [ ] Keyboard shortcuts functional (Ctrl+B/I/K)
- [ ] Round-trip markdown: 95%+ fidelity
- [ ] File watching detects external changes
- [ ] Auto-reload works без conflicts

### Performance Requirements (NFR-1)

- [ ] 100KB file: < 200ms open time
- [ ] 1MB file: < 800ms open time
- [ ] Typing latency: < 16ms (60 FPS)
- [ ] Scroll: 60 FPS
- [ ] Memory: < 100MB для 1MB file

### Quality Requirements

- [ ] Test coverage > 80%
- [ ] All tests pass
- [ ] No critical bugs
- [ ] Documentation complete
- [ ] Code style: immutability, small functions
- [ ] ESLint passes

### User Experience

- [ ] Clear installation instructions
- [ ] Helpful error messages
- [ ] Respects VS Code themes
- [ ] Settings work as documented

---

## Risks & Mitigation

### Risk 1: Round-trip Markdown Preservation
**Probability:** HIGH | **Impact:** CRITICAL

**Mitigation:**
- Comprehensive test suite (20+ edge cases) в Task 4
- Early validation Day 5
- Document known limitations
- Fallback: "Show source" command

**Status:** 🔴 Requires validation in Task 4

---

### Risk 2: Performance on Large Files
**Probability:** MEDIUM | **Impact:** HIGH

**Mitigation:**
- Performance benchmarks в Task 9
- Virtualization готова если baseline fails
- Incremental parsing
- Web Worker option для Phase 2

**Status:** 🟡 Monitored via benchmarks

---

### Risk 3: Update Loop Edge Cases
**Probability:** MEDIUM | **Impact:** MEDIUM

**Mitigation:**
- Change source tracking (Task 8)
- 300ms debounce с metadata
- Extensive integration testing
- Logging для debugging

**Status:** 🟢 Mitigated by design

---

## Post-Phase 1 Handoff

### Deliverables

1. **Codebase:** Complete Phase 1 implementation
2. **Tests:** 80%+ coverage suite
3. **Documentation:** README, CHANGELOG, comments
4. **Performance Report:** Benchmark results vs NFR-1
5. **Known Issues:** Documented limitations

### Phase 2 Readiness

**Blockers Resolved:**
- ✅ Custom editor foundation stable
- ✅ Markdown round-trip proven
- ✅ Performance baseline established

**Ready for Phase 2:**
- Tables (visual editing)
- Images (inline, paste)
- Code blocks с syntax highlighting
- Interactive checkboxes
- Advanced clipboard

---

## Timeline Summary

```
Week 1 (Days 1-5): Foundation
├─ Day 1: Project Setup
├─ Days 2-3: Custom Editor Provider
├─ Days 3-4: Tiptap Integration
└─ Day 5: Markdown Parser/Serializer

Week 2 (Days 6-10): Core Features
├─ Days 6-7: Live Preview Elements
├─ Day 8: Focus Mode
├─ Day 9: Keyboard Shortcuts
└─ Day 10: Sync Robustness

Week 3 (Days 11-15): Performance & Quality
├─ Days 11-12: Performance Optimization
├─ Day 13: File Watching
├─ Day 14: Testing Suite (80%+ coverage)
└─ Day 15: Documentation & Polish

Total: 10-15 working days
```

---

## Dependencies & Prerequisites

### External Dependencies
- VS Code 1.80+ (engine requirement)
- Node.js 20+ (TypeScript 5.3)
- npm/yarn для package management

### Internal Dependencies
- Task 2 зависит от Task 1 (setup)
- Task 3 зависит от Task 2 (provider)
- Task 4 зависит от Task 3 (Tiptap)
- Tasks 5-7 зависят от Task 4 (markdown)
- Task 8 зависит от Tasks 2, 4 (sync)
- Task 9 зависит от Task 8 (performance)
- Task 10 зависит от Task 8 (file watching)
- Task 11 зависит от всех previous tasks (testing)
- Task 12 зависит от Task 11 (finalization)

---

## Technical Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Editor Framework | Tiptap | ^2.1.0 | High-level API, markdown support |
| Markdown Parser | markdown-it | ^14.0.0 | Fast, extensible, GFM compatible |
| Build Tool | Webpack | ^5.89.0 | Dual bundle support (extension + webview) |
| Language | TypeScript | ^5.3.0 | Type safety, VS Code integration |
| Testing | @vscode/test-electron | ^2.3.8 | Official VS Code testing framework |

---

## Open Questions (to clarify with user)

Нет критических вопросов для начала реализации. План основан на детальном PRD и исследовании референсных примеров.

При возникновении технических блокеров (например, round-trip preservation issues) будут задаваться уточняющие вопросы в процессе реализации.
