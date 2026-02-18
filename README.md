# Velvet MD

> Live preview editor for Markdown in VS Code

## Status

🚧 **Early Development** - v0.2.0

This extension is in active development. Features and API may change.

## Features

**Velvet MD** brings a WYSIWYG-style editing experience to Markdown files in VS Code.

- **Live Preview Editing** - See formatted text as you type with instant visual feedback
- **Supported Markdown Elements:**
  - Headings (H1-H6)
  - Text formatting (bold, italic, strikethrough)
  - Links and images
  - Code blocks with syntax highlighting
  - Tables
  - Task lists with checkboxes
  - Blockquotes
  - Horizontal rules
  - Ordered and unordered lists
- **Bidirectional Sync** - Changes sync seamlessly between the editor and file system
- **Scroll Position Sync** - Scroll position is preserved when switching between Velvet MD and Text Editor
- **Focus Mode** - Show markdown syntax only when editing a block
- **Large File Support** - Optimized for files up to 10MB

## Usage

### Opening Files

Right-click any `.md` file in VS Code and select:
- **"Open With..."** → **"Velvet MD"**

Or set Velvet MD as the default editor for Markdown files:
1. Right-click a `.md` file
2. Select **"Open With..."**
3. Choose **"Velvet MD"**
4. Click **"Configure default editor for '*.md'..."**

### Switching Between Editors

Toggle between Velvet MD and the standard Text Editor in the same tab:

- **`$(book)` icon** - Click the book icon in the editor title bar when viewing a `.md` file in the Text Editor to switch to Velvet MD
- **`$(code)` icon** - Click the code icon when in Velvet MD to switch back to the Text Editor

Both buttons switch editors in-place without opening new tabs.

### Editing

- Click anywhere to start editing
- Press Escape to exit focus mode
- Changes save automatically to the file

## Configuration

Configure the extension in VS Code settings (File → Preferences → Settings):

- **`velvetMd.showSyntaxOnFocus`** (default: `true`)
  Show markdown syntax when cursor is in a block

- **`velvetMd.autoReloadOnExternalChanges`** (default: `true`)
  Automatically reload file when it changes externally (e.g., git operations)

- **`velvetMd.virtualizationThreshold`** (default: `512000`)
  File size threshold in bytes for enabling virtualization (500KB)

## Development

### Prerequisites

- VS Code 1.80 or higher
- Node.js 20 or higher
- npm

### Commands

```bash
# Install dependencies
npm install

# Development with watch mode (auto-recompile on changes)
npm run watch

# Type checking (required before commits)
npm run typecheck

# Linting
npm run lint

# Production build
npm run compile

# Full build pipeline (typecheck + lint + compile)
npm run build

# Run tests
npx tsx test/constants.test.ts
npx tsx test/roundtrip.test.ts
npx tsx test/link-image.test.ts
npx tsx test/scrollUtils.test.ts
npx tsx test/providerUtils.test.ts
npx tsx test/markdownSerializer.test.ts
```

### Building & Installation

Package the extension into a `.vsix` file:

```bash
# Install vsce (VS Code Extension CLI)
npm install -g @vscode/vsce

# Package the extension
vsce package
```

Install the generated `.vsix` file:

```bash
code --install-extension velvet-md-0.2.0.vsix
```

Or in VS Code: Extensions → `⋯` menu → "Install from VSIX..."

### Testing in VS Code

1. Open this project in VS Code
2. Press F5 to launch Extension Development Host
3. Open any `.md` file
4. Right-click → "Open With..." → "Velvet MD"

## Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Release history
- [CLAUDE.md](./CLAUDE.md) - Architecture and implementation details

## License

MIT - See [LICENSE](./LICENSE) file for details

---

Built with [Claude Code](https://claude.ai/code)
