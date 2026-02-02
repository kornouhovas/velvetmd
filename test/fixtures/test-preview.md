# Test Document for Live Preview

This document tests all basic Markdown elements for the live preview feature.

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Inline Formatting

This is **bold text** and this is *italic text*.

You can also use __bold__ and _italic_ with underscores.

Here is some `inline code` in a sentence.

You can combine **bold and *italic* together**.

This text has ~~strikethrough~~ applied.

---

## Lists

### Unordered Lists

- Item 1
- Item 2
- Item 3
  - Nested item 1
  - Nested item 2
    - Deeply nested item
- Item 4

### Ordered Lists

1. First item
2. Second item
3. Third item
   1. Nested item 1
   2. Nested item 2
      1. Deeply nested item
4. Fourth item

### Mixed Lists

1. First ordered item
2. Second ordered item
   - Nested unordered item
   - Another nested item
3. Third ordered item

---

## Blockquotes

> This is a simple blockquote.
> It can span multiple lines.

> This is a blockquote with **bold** and *italic* text.

> First level quote
>> Second level quote
>>> Third level quote

---

## Code Blocks

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

greet('World');
```

```python
def calculate(x, y):
    return x + y

result = calculate(5, 3)
print(f"Result: {result}")
```

```
Plain code block without language
supports multiple lines
and preserves formatting
```

---

## Links

Here is a [link to Google](https://www.google.com).

Here is a [link with title](https://www.github.com "GitHub Homepage").

This is an autolink: https://www.example.com

---

## Horizontal Rules

You can create horizontal rules with three or more hyphens:

---

Or with asterisks:

***

Or with underscores:

___

---

## Combined Elements

Here's a paragraph with **bold**, *italic*, `code`, and a [link](https://example.com) all together.

> This is a blockquote with:
> - A **bold** statement
> - Some `code`
> - A [link](https://example.com)
>
> And multiple paragraphs!

### Complex Nested List

1. **First item** with bold
   - Nested item with *italic*
   - Another nested item with `code`
     1. Deep nested ordered
     2. With **combined** *formatting*
2. **Second item**
   > With a blockquote inside
   >
   > That has multiple lines
3. **Third item**
   ```javascript
   // With a code block
   console.log('Hello');
   ```

---

## Edge Cases

### Empty Blockquote
>

### Single Item List
- Just one item

### Consecutive Code Blocks

```
First block
```

```
Second block
```

### Multiple Horizontal Rules in a Row

---
---
---

### Mixed Emphasis

This has **bold with *nested italic* inside**.

This has *italic with **nested bold** inside*.

This has ***bold and italic together***.

---

## Performance Test Section

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

- Point 1: Lorem ipsum dolor sit amet
- Point 2: Consectetur adipiscing elit
- Point 3: Sed do eiusmod tempor incididunt
- Point 4: Ut labore et dolore magna aliqua
- Point 5: Ut enim ad minim veniam

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

1. First paragraph with some `code` and **bold** text
2. Second paragraph with *italic* and [a link](https://example.com)
3. Third paragraph with ~~strikethrough~~ text
4. Fourth paragraph with ***all emphasis*** combined

---

**End of test document**
