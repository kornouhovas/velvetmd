# Markdown Elements Test File
This file contains comprehensive examples of all supported markdown elements for testing the Live Preview editor.
## 1. Headings
# H1 Heading
## H2 Heading
### H3 **Heading**
#### H4 Heading
##### H5 Heading
###### H6 Heading
## 2. Text Formatting
**Bold text**
*Italic text*
~~Strikethrough~~
***Bold and italic combined***
***Another bold and** italic*
## 3. Links
[Inline link](https://example.com)
[Link with title](https://example.com)
[Link to a section](#5-lists)
## 4. Images
![Alt text](https://via.placeholder.com/150)![Image with title](https://via.placeholder.com/200 "Placeholder Image")
## 5. Lists
### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
    - Deeply nested item
- Item 3
### Ordered List
1. First item
2. Second item
  1. Nested 2.1
  2. Nested 2.2
    1. Deeply nested
3. Third item
### Mixed List
1. Ordered item
  - Unordered nested item
  - Another unordered nested item
2. Another ordered item
## 6. Task Lists
- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task
- [x] Another checked task
- [ ]
## 7. Code
Inline code: `const x = 42;`
Multiple inline code snippets: `let name = "test"` and `return true;`
### Fenced Code Block
```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
  return `Greeting sent to ${name}`;
}
const result = hello("World");
```
### Code Block with Different Language
```python
def greet(name):
    print(f"Hello, {name}!")
    return f"Greeting sent to {name}"
result = greet("World")
```
### Code Block without Language
```
Plain code block
No syntax highlighting
Just monospace text
```
## 8. Tables
### Simple Table
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
### Table with Alignment
| Left Aligned | Center Aligned | Right Aligned |
| ------------ | -------------- | ------------- |
| Left         | Center         | Right         |
| Text         | Text           | Text          |
| A            | B              | C             |
### Table with Rich Content
| Feature                     | Status     | Notes                  |
| --------------------------- | ---------- | ---------------------- |
| **Bold**                    | *Italic*   | `Code`                 |
| [Link](https://example.com) | ~~Strike~~ | Mixed ***formatting*** |
## 9. Blockquotes
> This is a blockquote
>
> Multiple lines in the same quote
> Single line blockquote
> Blockquote with **bold** and *italic*
>
> > Nested blockquote
> >
> > > Deeply nested blockquote
## 10. Horizontal Rules
---
---
---
## 11. Mixed Content Examples
This paragraph has **bold**, *italic*, ~~strikethrough~~, and `code` mixed together.
Here's a [link](https://example.com) and ![small image](https://via.placeholder.com/50) inline with text.
You can combine formatting like **bold with `code inside**` or *italic with [links](https://example.com)*.
## 12. Complex Nested Structures
1. First ordered item
  - Unordered nested item
  - Another item with **bold**
  1. Nested ordered
  2. Another nested ordered
    - Deep unordered
      - Very deep item
2. Second ordered item
  > With a blockquote
  >
  > That has multiple lines
  >  And a paragraph in between
  - And an unordered list
  - With multiple items
## 13. Edge Cases
### Empty Lines and Spacing
Paragraph 1
Paragraph 2 (multiple empty lines above)
### Special Characters
Escaping: not italic not a link
Symbols: & < > " ' / \
### Long Lines
This is a very long line of text that should wrap properly in the editor without breaking the layout or causing horizontal scrolling issues in the preview mode which is important for readability and user experience.
## 14. Practical Example
### Project README Structure
**Project Name**: Markdown Live Editor
**Description**: A VS Code extension providing Obsidian-like live preview editing for Markdown files.
**Features**:
- [x] Live preview mode
- [x] Interactive table editing
- [ ] Diagram support (planned)
- [ ] Custom themes (planned)
**Installation**:
1. Download from VS Code marketplace
2. Install extension
3. Open any `.md` file
4. Start editing!
**Code Example**:
```typescript
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
  console.log('Extension activated!');
}
```
## For more information, visit [our website](https://example.com).