# PRD: VS Code Markdown Live Editor
## Overview
Плагин для VS Code, обеспечивающий редактирование Markdown файлов в режиме live preview с WYSIWYG-подобным интерфейсом, аналогичным Obsidian.
## Problem Statement
Стандартный редактор Markdown в VS Code требует переключения между режимами редактирования и предпросмотра. Это создает разрыв между написанием и визуализацией контента. Пользователи Obsidian привыкли к seamless-редактированию, где форматирование применяется мгновенно.
## Goals
- Создать единый интерфейс редактирования/просмотра Markdown
- Обеспечить интерактивное редактирование таблиц
- Минимизировать отображение raw-синтаксиса Markdown
## Target Users
- Разработчики, ведущие документацию
- Технические писатели
- Пользователи, мигрирующие с Obsidian
---
## Functional Requirements
### FR-1: Live Preview Mode
**Описание:** Редактор отображает отформатированный текст в реальном времени.
| Элемент                                                                               | Поведение                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Заголовки (`#`, `##`, etc.)                                                           | Отображаются как стилизованные заголовки, символы `#` скрыты |
| Жирный текст (`**text**`)                                                             | Отображается жирным, маркеры скрыты                          |
| Курсив (`*text*`)                                                                     | Отображается курсивом, маркеры скрыты                        |
| Ссылки (`[text](url)`)                                                                | Отображается как кликабельная ссылка                         |
| Изображения (`![alt](url)`)                                                           | Отображаются inline                                          |
| Код (`code`)                                                                          | Отображается с фоновой подсветкой                            |
| Блоки кода (`````)                                                                    | Подсветка синтаксиса, копирование одной кнопкой              |
| Списки (`-`, `1.`)                                                                    | Визуальные маркеры/нумерация                                 |
| Чекбоксы (`- [ ]`)                                                                    | Интерактивные чекбоксы                                       |
| Цитаты (`>`)                                                                          | Стилизованные блоки цитат                                    |
| Вложенные списки                                                                      | Поддержка многоуровневой вложенности                         |
| Горизонтальные линии (`---`)                                                          | Визуальный разделитель                                       |
| **При фокусе на элементе:** Markdown-синтаксис становится видимым для редактирования. | &nbsp;                                                       |
### FR-2: Интерактивное редактирование таблиц
**Описание:** Таблицы редактируются через визуальный интерфейс без отображения Markdown-синтаксиса.
**Возможности:**
- Добавление/удаление строк и столбцов через контекстное меню
- Drag-and-drop для изменения порядка столбцов/строк
- Редактирование ячеек по двойному клику
- Автоматическое выравнивание столбцов
- Resize столбцов мышью
- Сортировка по столбцам
- Копирование таблицы (Markdown / HTML / CSV)
**Toolbar таблицы:**
- Кнопка "Добавить строку"
- Кнопка "Добавить столбец"
- Выравнивание (лево/центр/право)
- Удалить таблицу
### FR-3: Создание таблицы
**Триггеры:**
- Команда палитры: `Markdown: Insert Table`
- Шорткат: `Ctrl+Shift+T` / `Cmd+Shift+T`
- Автокомплит при вводе `|`
**Диалог создания:**
- Указание количества строк и столбцов
- Опция "Добавить заголовок"
### FR-4: Интеграция с VS Code
- Открытие `.md` файлов в live-режиме по умолчанию (настраиваемо)
- Команда для переключения между raw Markdown и live preview
- Поддержка стандартных шорткатов VS Code
- Синхронизация с outline/minimap
- Поддержка Find & Replace
### FR-5: Форматирование через шорткаты
| Действие         | Windows/Linux  | macOS         |
| ---------------- | -------------- | ------------- |
| Жирный           | `Ctrl+B`       | `Cmd+B`       |
| Курсив           | `Ctrl+I`       | `Cmd+I`       |
| Код              | `Ctrl+`        | `Cmd+`        |
| Ссылка           | `Ctrl+K`       | `Cmd+K`       |
| Заголовок        | `Ctrl+1..6`    | `Cmd+1..6`    |
| Список           | `Ctrl+Shift+L` | `Cmd+Shift+L` |
| Чекбокс          | `Ctrl+Shift+C` | `Cmd+Shift+C` |
| Вставить таблицу | `Ctrl+Shift+T` | `Cmd+Shift+T` |
### FR-6: Clipboard & Paste
**Описание:** Интеллектуальная обработка вставки контента из буфера обмена.
**Поддерживаемые форматы:**
- **Plain text** - Вставка как есть, с сохранением форматирования Markdown
- **HTML (из браузера)** - Автоматическая конвертация в Markdown
  - Таблицы → GFM таблицы
  - Списки → Markdown списки
  - Форматирование → Markdown синтаксис
- **Изображения** - Автоматическое сохранение в проект
  - Prompt для выбора директории
  - Генерация уникального имени
  - Вставка `![](path)` синтаксиса
- **URL изображений** - Выбор: embed или download
**Поведение:**
- `Ctrl+V` / `Cmd+V` - Стандартная вставка с автоопределением формата
- `Ctrl+Shift+V` / `Cmd+Shift+V` - Вставка как plain text (без конвертации)
### FR-7: File Watching & Sync
**Описание:** Автоматическая синхронизация при внешних изменениях файла.
**Сценарии:**
1. **Внешнее изменение файла** (Git pull, другой редактор)
  - Обнаружение изменений через FileSystemWatcher
  - Если нет локальных несохраненных изменений → Auto-reload
  - Если есть несохраненные изменения → Показать conflict dialog
2. **Conflict Resolution Dialog:**
  ```
   Файл был изменен снаружи
   [Использовать версию на диске]  [Сохранить мою версию]  [Показать diff]
  ```
3. **VS Code Live Share:**
  - Базовая поддержка (readonly mode для гостей)
  - Phase 4: Полная collaborative editing
### FR-8: Validation & Linting
**Описание:** Встроенная валидация Markdown и интеграция с markdownlint.
**Возможности:**
- Подсветка ошибок синтаксиса Markdown
- Интеграция с markdownlint (если установлен)
- Warnings для:
  - Битые ссылки
  - Отсутствующие изображения
  - Некорректные таблицы
- Quick fixes для частых проблем
---
## Non-Functional Requirements
### NFR-1: Performance
**Метрики производительности:**
| Метрика                        | Целевое значение | Измерение                    |
| ------------------------------ | ---------------- | ---------------------------- |
| Время открытия файла (< 100KB) | < 200ms          | First render                 |
| Время открытия файла (< 1MB)   | < 800ms          | First render                 |
| Время открытия файла (> 1MB)   | < 2000ms         | First render + виртуализация |
| Input latency (печать)         | < 16ms (60 FPS)  | Keystroke → render           |
| Scroll performance             | 60 FPS           | Плавная прокрутка            |
| Memory footprint               | < 100MB          | Для файла 1MB                |
| **Оптимизации:**               | &nbsp;           | &nbsp;                       |
- **Виртуализация** для файлов > 500KB (Phase 1)
- **Lazy loading** изображений (загрузка при скролле в viewport)
- **Debounced sync** Document ↔ Webview (300ms)
- **Web Worker** для парсинга больших файлов
- **Incremental parsing** при редактировании
### NFR-2: Compatibility
- VS Code версии 1.80+
- Поддержка тем VS Code (light/dark)
- CommonMark + GFM (GitHub Flavored Markdown)
### NFR-3: Accessibility
**WCAG 2.1 Level AA Compliance:**
| Критерий                   | Требование                    | Реализация                              |
| -------------------------- | ----------------------------- | --------------------------------------- |
| 1.4.3 Contrast             | Минимум 4.5:1                 | Поддержка тем VS Code                   |
| 2.1.1 Keyboard             | Полная навигация с клавиатуры | Tab navigation, шорткаты                |
| 2.4.7 Focus Visible        | Видимый фокус                 | Outline на всех интерактивных элементах |
| 4.1.2 Name, Role, Value    | ARIA атрибуты                 | Semantic HTML + ARIA labels             |
| 4.1.3 Status Messages      | Screen reader announcements   | Live regions для изменений              |
| **Конкретные требования:** | &nbsp;                        | &nbsp;                                  |
- Screen reader поддержка (NVDA, JAWS, VoiceOver)
- Все функции доступны с клавиатуры (без мыши)
- High contrast режим
- Respects `prefers-reduced-motion`
- Keyboard shortcuts конфигурируемы
---
## Technical Architecture
### Stack
`┌─────────────────────────────────────────┐ │ VS Code Extension API │ ├─────────────────────────────────────────┤ │ Custom Editor Provider │ │ (CustomTextEditorProvider) │ ├─────────────────────────────────────────┤ │ Webview Panel │ ├──────────────┬──────────────────────────┤ │ Markdown │ Table Editor │ │ Parser │ (Prosemirror / │ │ (markdown- │ Tiptap) │ │ it + ext) │ │ ├──────────────┴──────────────────────────┤ │ State Synchronization │ │ (Document <-> Webview bidirectional) │ └─────────────────────────────────────────┘`
### Key Components
1. **Extension Host** - Регистрация `CustomTextEditorProvider` - Обработка команд - Синхронизация с файловой системой
2. **Webview** - Рендеринг live preview - Обработка пользовательского ввода - Table editor component
3. **Parser/Serializer** - Markdown -> AST -> DOM - DOM -> AST -> Markdown - Сохранение форматирования при round-trip
### Libraries (рекомендации)
| Компонент          | Библиотека                 | Обоснование                                                    |
| ------------------ | -------------------------- | -------------------------------------------------------------- |
| Rich text editor   | **Tiptap** (рекомендуется) | Высокоуровневая обертка над Prosemirror, проще в использовании |
| &nbsp;             | Prosemirror (альтернатива) | Больше контроля, но сложнее learning curve                     |
| Markdown parsing   | markdown-it                | Быстрый, расширяемый, отличная поддержка GFM                   |
| Table manipulation | prosemirror-tables         | Нативная интеграция с Prosemirror                              |
| Virtualization     | @tanstack/virtual          | Производительный virtual scrolling                             |
| State management   | Zustand / Vanilla          | Простота, минимальный размер бандла                            |
---
## File Structure
```
markdown-live-editor/
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .eslintrc.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── extension.ts              # Entry point
│   ├── providers/
│   │   └── markdownEditorProvider.ts
│   ├── editor/
│   │   ├── editor.ts             # Tiptap/Prosemirror setup
│   │   ├── extensions/
│   │   │   ├── table.ts          # Table extension
│   │   │   ├── livePreview.ts    # Syntax hiding
│   │   │   ├── markdown.ts       # MD serialization
│   │   │   └── image.ts          # Image handling
│   │   └── webview/
│   │       ├── index.html
│   │       ├── editor.ts         # Webview logic
│   │       └── styles.css
│   ├── commands/
│   │   ├── insertTable.ts
│   │   ├── insertImage.ts
│   │   ├── formatText.ts
│   │   └── togglePreview.ts
│   └── utils/
│       ├── markdownParser.ts
│       ├── markdownSerializer.ts
│       └── fileWatcher.ts
├── media/
│   ├── icons/
│   │   ├── icon.png
│   │   └── icon.svg
│   └── screenshots/
├── test/
│   ├── extension.test.ts
│   ├── roundtrip.test.ts         # Critical: MD preservation tests
│   └── performance.test.ts
└── docs/
    ├── README.md
    ├── CHANGELOG.md
    └── CONTRIBUTING.md
```
---
## Settings
```jsonc
{
  // Открывать .md файлы в live-режиме по умолчанию
  "markdownLiveEditor.defaultEditor": true,
  // Показывать синтаксис при фокусе на элементе
  "markdownLiveEditor.showSyntaxOnFocus": true,
  // Ширина редактора (px или %)
  "markdownLiveEditor.editorWidth": "800px",
  // Шрифт
  "markdownLiveEditor.fontFamily": "inherit",
  "markdownLiveEditor.fontSize": 16,
  // Автосохранение
  "markdownLiveEditor.autoSave": true,
  "markdownLiveEditor.autoSaveDelay": 1000,
  // Performance
  "markdownLiveEditor.virtualizationThreshold": 500, // KB
  "markdownLiveEditor.lazyLoadImages": true,
  // Validation
  "markdownLiveEditor.enableLinting": true,
  "markdownLiveEditor.validateLinks": true
}
```
---
## Commands
| Command ID                          | Title                 | Description                |
| ----------------------------------- | --------------------- | -------------------------- |
| `markdownLiveEditor.open`           | Open with Live Editor | Открыть файл в live-режиме |
| `markdownLiveEditor.toggle`         | Toggle Preview Mode   | Переключить raw/live       |
| `markdownLiveEditor.insertTable`    | Insert Table          | Вставить таблицу           |
| `markdownLiveEditor.insertImage`    | Insert Image          | Вставить изображение       |
| `markdownLiveEditor.exportHtml`     | Export as HTML        | Экспорт в HTML             |
| `markdownLiveEditor.exportPdf`      | Export as PDF         | Экспорт в PDF              |
| `markdownLiveEditor.showSource`     | Show Markdown Source  | Показать исходный Markdown |
| `markdownLiveEditor.formatDocument` | Format Document       | Форматировать документ     |
---
## package.json (Extension Manifest)
```json
{
  "name": "markdown-live-editor",
  "displayName": "Markdown Live Editor",
  "description": "Obsidian-like live preview editor for Markdown",
  "version": "0.1.0",
  "publisher": "your-publisher",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onCustomEditor:markdownLiveEditor.editor"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "customEditors": [
      {
        "viewType": "markdownLiveEditor.editor",
        "displayName": "Markdown Live Editor",
        "selector": [
          {
            "filenamePattern": "*.md"
          }
        ],
        "priority": "default"
      }
    ],
    "commands": [
      {
        "command": "markdownLiveEditor.open",
        "title": "Open with Live Editor"
      },
      {
        "command": "markdownLiveEditor.toggle",
        "title": "Toggle Preview Mode"
      },
      {
        "command": "markdownLiveEditor.insertTable",
        "title": "Insert Table"
      },
      {
        "command": "markdownLiveEditor.insertImage",
        "title": "Insert Image"
      }
    ],
    "configuration": {
      "title": "Markdown Live Editor",
      "properties": {
        "markdownLiveEditor.defaultEditor": {
          "type": "boolean",
          "default": true,
          "description": "Use Live Editor as default for .md files"
        },
        "markdownLiveEditor.showSyntaxOnFocus": {
          "type": "boolean",
          "default": true,
          "description": "Show markdown syntax when element is focused"
        },
        "markdownLiveEditor.editorWidth": {
          "type": "string",
          "default": "800px",
          "description": "Editor width (px or %)"
        },
        "markdownLiveEditor.autoSave": {
          "type": "boolean",
          "default": true,
          "description": "Auto-save changes"
        },
        "markdownLiveEditor.autoSaveDelay": {
          "type": "number",
          "default": 1000,
          "description": "Auto-save delay in milliseconds"
        }
      }
    },
    "keybindings": [
      {
        "command": "markdownLiveEditor.insertTable",
        "key": "ctrl+shift+t",
        "mac": "cmd+shift+t",
        "when": "activeCustomEditorId == markdownLiveEditor.editor"
      },
      {
        "command": "markdownLiveEditor.toggle",
        "key": "ctrl+shift+p",
        "mac": "cmd+shift+p",
        "when": "activeCustomEditorId == markdownLiveEditor.editor"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "test": "node ./out/test/runTest.js",
    "lint": "eslint src --ext ts"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@types/node": "^20.0.0",
    "@types/markdown-it": "^13.0.7",
    "@vscode/test-electron": "^2.3.8",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "ts-loader": "^9.5.1"
  },
  "dependencies": {
    "@tiptap/core": "^2.1.0",
    "@tiptap/pm": "^2.1.0",
    "@tiptap/starter-kit": "^2.1.0",
    "@tiptap/extension-table": "^2.1.0",
    "@tiptap/extension-table-row": "^2.1.0",
    "@tiptap/extension-table-cell": "^2.1.0",
    "@tiptap/extension-table-header": "^2.1.0",
    "@tiptap/extension-image": "^2.1.0",
    "@tiptap/extension-link": "^2.1.0",
    "markdown-it": "^14.0.0"
  }
}
```
---
## Milestones
### Phase 1: Core Editor (2-3 недели)
**Цель:** Функциональный MVP с базовым live preview и production-ready performance.
- [ ] Custom Editor Provider setup
- [ ] Tiptap/Prosemirror интеграция
- [ ] **Виртуализация для больших файлов** (> 500KB)
- [ ] Live preview для всех базовых элементов:
  - [ ] Заголовки (h1-h6)
  - [ ] Форматирование (bold, italic, code)
  - [ ] Списки (ordered, unordered, nested)
  - [ ] Ссылки
  - [ ] Цитаты
  - [ ] Горизонтальные линии
- [ ] Фокус-режим (показ синтаксиса при редактировании)
- [ ] Базовые шорткаты (Ctrl+B, Ctrl+I, Ctrl+K)
- [ ] Round-trip Markdown (сохранение форматирования)
- [ ] Performance baseline: < 800ms для файлов 1MB
- [ ] File watching и auto-reload
**Критерий успеха:** Комфортное редактирование обычных Markdown документов без таблиц.
### Phase 2: Rich Editing (2 недели)
**Цель:** Полнофункциональный редактор с таблицами и медиа.
- [ ] Таблицы (визуализация + базовое редактирование)
  - [ ] Rendering GFM таблиц
  - [ ] Редактирование ячеек
  - [ ] Добавление/удаление строк и столбцов
  - [ ] Выравнивание столбцов
- [ ] Изображения
  - [ ] Inline отображение
  - [ ] Paste изображений с автосохранением
  - [ ] Lazy loading
- [ ] Блоки кода с syntax highlighting
- [ ] Интерактивные чекбоксы
- [ ] Clipboard & Paste (HTML → Markdown конвертация)
- [ ] Все шорткаты из FR-5
**Критерий успеха:** Паритет функций с Obsidian для обычного использования.
### Phase 3: Advanced Tables & UX (1-2 недели)
**Цель:** Профессиональный инструмент для работы с таблицами.
- [ ] Drag-and-drop строк/столбцов
- [ ] Resize столбцов мышью
- [ ] Контекстное меню для таблиц
- [ ] Копирование таблицы (Markdown / HTML / CSV)
- [ ] Сортировка по столбцам
- [ ] Table toolbar
- [ ] Command palette для вставки таблиц
- [ ] Validation & Linting (FR-8)
- [ ] Подсветка ошибок
**Критерий успеха:** Работа с таблицами удобнее, чем в raw Markdown.
### Phase 4: Polish & Distribution (1-2 недели)
**Цель:** Production-ready расширение для публикации.
- [ ] Полная настройка (все settings из документа)
- [ ] Экспорт HTML/PDF
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (достижение всех целей NFR-1)
- [ ] Unit tests (coverage > 80%)
- [ ] E2E tests (критические сценарии)
- [ ] Документация (README, CHANGELOG)
- [ ] Marketplace assets (иконки, скриншоты, видео)
- [ ] Beta-тестирование
## **Критерий успеха:** Готовность к публикации в VS Code Marketplace.
## Pre-Development: Proof of Concept
**⚠️ КРИТИЧЕСКИ ВАЖНО:** Перед началом Phase 1 необходимо валидировать технические риски через PoC.
### PoC #1: Round-trip Markdown Preservation (Приоритет: КРИТИЧЕСКИЙ)
**Срок:** 2-3 дня
**Цель:** Проверить, что Tiptap/Prosemirror может сохранять исходное форматирование Markdown при редактировании.
**Задачи:**
1. Создать минимальный Tiptap editor
2. Реализовать Markdown → Prosemirror → Markdown pipeline
3. Тестовые случаи:
  ```markdown
   # Тест 1: Пробелы и переносы строк
   Параграф 1.
   Параграф 2.
   Параграф 3 (два перевода строки сверху).
   # Тест 2: Вложенные списки
   - Item 1
     - Nested 1.1
       - Nested 1.1.1
   - Item 2
   # Тест 3: Таблицы с выравниванием
   | Left | Center | Right |
   |:-----|:------:|------:|
   | A    | B      | C     |
   # Тест 4: Комбинированное форматирование
   **Bold _and italic_** text with `code`.
  ```
4. **Критерий успеха:** Все тесты проходят без изменения форматирования
**Возможные результаты:**
- ✅ **Успех** → Переходим к Phase 1
- ⚠️ **Частичный успех** → Документируем ограничения, добавляем warning пользователям
- ❌ **Провал** → Пересматриваем архитектуру (рассмотреть альтернативы: CodeMirror 6, Monaco Editor)
### PoC #2: Performance Baseline (Приоритет: ВЫСОКИЙ)
**Срок:** 1-2 дня
**Цель:** Проверить производительность на больших файлах.
**Задачи:**
1. Создать тестовые Markdown файлы:
  - 100 KB (baseline)
  - 500 KB (виртуализация threshold)
  - 1 MB (stress test)
  - 5 MB (edge case)
2. Измерить:
  - Initial render time
  - Typing latency (keystroke → screen)
  - Scroll performance (FPS)
  - Memory usage
3. **Критерий успеха:**
  - 1 MB файл открывается < 2 сек
  - Typing latency < 50ms
  - Scroll 60 FPS
**Возможные результаты:**
- ✅ **Цели достигнуты** → Виртуализация может подождать до Phase 2
- ⚠️ **Близко к целям** → Виртуализация обязательна в Phase 1
- ❌ **Далеко от целей** → Нужен Web Worker + виртуализация с самого начала
### PoC #3: VS Code Integration (Приоритет: СРЕДНИЙ)
**Срок:** 1 день
**Цель:** Проверить интеграцию CustomTextEditorProvider + Webview.
**Задачи:**
1. Создать базовый Custom Editor
2. Реализовать Document ↔ Webview sync
3. Тестировать:
  - Открытие файла
  - Редактирование
  - Сохранение
  - External file changes
4. **Критерий успеха:** Базовый flow работает без глюков
## **Общий срок PoC:** 4-6 дней
**Решение GO/NO-GO:** После завершения всех PoC принимается решение о начале Phase 1.
## Risks & Mitigations
| Risk                                 | Вероятность | Impact      | Mitigation                                                                                                                        | Статус          |
| ------------------------------------ | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Round-trip Markdown сохранение**   | ВЫСОКАЯ     | КРИТИЧЕСКИЙ | • Proof-of-concept перед Phase 1 • Хранение оригинального AST • Unit tests для edge cases • Fallback на raw editing при конфликте | 🔴 Requires PoC |
| **Performance на файлах > 1MB**      | СРЕДНЯЯ     | ВЫСОКИЙ     | • Виртуализация с Phase 1 • Web Worker для парсинга • Incremental rendering • Performance бюджет в CI                             | 🟡 Planned      |
| **Конфликт с встроенным MD preview** | СРЕДНЯЯ     | СРЕДНИЙ     | • Priority "default" с настройкой • Четкая документация переключения • Command для toggle режима                                  | 🟢 Mitigated    |
| **Prosemirror complexity**           | СРЕДНЯЯ     | СРЕДНИЙ     | • Использовать Tiptap (высокоуровневая обертка) • Поэтапное освоение API • Консультации с community                               | 🟢 Mitigated    |
| **Браузерные ограничения Webview**   | НИЗКАЯ      | СРЕДНИЙ     | • Тестирование на всех платформах • Fallback для unsupported features                                                             | 🟢 Acceptable   |
| **Конкурентные расширения**          | СРЕДНЯЯ     | НИЗКИЙ      | • Уникальное USP: таблицы + live preview • Фокус на UX качество                                                                   | 🟢 Acceptable   |
| **Scope creep**                      | ВЫСОКАЯ     | СРЕДНИЙ     | • Строгое следование milestones • MVP-first подход • Feature freeze после Phase 2                                                 | 🟡 Monitoring   |
### Легенда статусов:
- 🔴 **Requires action** - Требуется действие перед началом разработки
- 🟡 **Planned** - Mitigation запланирована в roadmap
- 🟢 **Mitigated** - Риск под контролем
---
## Success Metrics
### Launch Targets (Месяц 1)
| Метрика                | Минимальная цель | Целевая | Stretch |
| ---------------------- | ---------------- | ------- | ------- |
| **Установки**          | 500              | 1,000   | 3,000   |
| **Rating**             | 4.0+ ⭐           | 4.5+ ⭐  | 4.8+ ⭐  |
| **Active Users (DAU)** | 200              | 500     | 1,000   |
| **Retention (D30)**    | 40%              | 60%     | 75%     |
| **Critical Bugs**      | < 15             | < 10    | < 5     |
| **Reviews**            | 10+              | 30+     | 50+     |
### Growth Targets (Месяц 3)
| Метрика             | Целевое значение    |
| ------------------- | ------------------- |
| Установки           | 5,000+              |
| Rating              | 4.5+ ⭐              |
| Weekly Active Users | 2,000+              |
| GitHub Stars        | 100+                |
| Feature requests    | 50+ (валидация PMF) |
### Quality Metrics (Continuous)
| Метрика                     | SLA                    |
| --------------------------- | ---------------------- |
| **Crash-free rate**         | > 99.5%                |
| **Performance compliance**  | 95% соответствие NFR-1 |
| **Support response time**   | < 48 hours             |
| **Bug fix time (critical)** | < 72 hours             |
| **Bug fix time (normal)**   | < 2 weeks              |
### User Satisfaction Indicators
- **NPS (Net Promoter Score):** > 40
- **Feature adoption (Tables):** > 30% пользователей
- **Positive reviews ratio:** > 80%
- **Uninstall rate:** < 20% (месяц 1)
---
## References
### Documentation
- [VS Code Custom Editors API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [Tiptap Documentation](https://tiptap.dev/)
- [Prosemirror Guide](https://prosemirror.net/docs/guide/)
- [markdown-it](https://github.com/markdown-it/markdown-it)
- [prosemirror-tables](https://github.com/ProseMirror/prosemirror-tables)
### Inspiration
- [Obsidian Live Preview](https://obsidian.md/)
- [Typora](https://typora.io/)
- [Mark Text](https://github.com/marktext/marktext)
### Competitive Analysis
| Extension                     | USP                                  | Limitations                          |
| ----------------------------- | ------------------------------------ | ------------------------------------ |
| **Markdown All in One**       | Comprehensive MD features            | No live preview                      |
| **Markdown Preview Enhanced** | Powerful preview                     | Separate pane, not WYSIWYG           |
| **Foam**                      | Note-taking focus                    | Complex, overkill for simple editing |
| **This Extension**            | 🎯 Live preview + Interactive tables | New, needs validation                |
---
## Next Steps
### 1. Stakeholder Review (1 неделя)
- [ ] Technical review с архитектором/senior developer
- [ ] UX review с дизайнером (если есть)
- [ ] Business review (приоритеты, ресурсы)
- [ ] Approve/Revise PRD
### 2. Proof of Concept (1 неделя)
- [ ] Выполнить PoC #1: Round-trip Markdown
- [ ] Выполнить PoC #2: Performance
- [ ] Выполнить PoC #3: VS Code Integration
- [ ] **GO/NO-GO Decision**
### 3. Setup Project (3-5 дней)
Если GO:
- [ ] Создать GitHub repo
- [ ] Setup project structure (согласно File Structure)
- [ ] Configure TypeScript, Webpack, ESLint
- [ ] Setup CI/CD (GitHub Actions)
- [ ] Create initial issues/tasks для Phase 1
### 4. Phase 1 Kick-off
- [ ] Sprint planning
- [ ] Assign tasks
- [ ] Начать разработку 🚀
---
## Appendix
### Alternative Approaches Considered
**1. CodeMirror 6 вместо Prosemirror**
- ✅ Pros: Отличная performance, современный API
- ❌ Cons: Менее подходит для WYSIWYG, больше для code editing
**2. Monaco Editor (VS Code editor)**
- ✅ Pros: Native интеграция с VS Code
- ❌ Cons: Очень тяжелый, не для live preview
**3. Полностью custom решение**
- ✅ Pros: Полный контроль
- ❌ Cons: Огромный scope, reinventing the wheel
**Выбор:** Tiptap/Prosemirror - оптимальный баланс между функциональностью и complexity.
### Open Questions
Требуют решения в Phase 1:
1. **Sync strategy:** Debounce 300ms или on-demand?
2. **Table editing:** Context menu vs toolbar vs inline controls?
3. **Image storage:** Relative paths vs absolute vs configurable?
4. **Undo/Redo:** VS Code native vs Prosemirror history?
---
**Версия PRD:** 2.0
**Последнее обновление:** 2026-01-30
**Статус:** ✅ Ready for Review