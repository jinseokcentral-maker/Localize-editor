# LocaleEditor

Excel-like i18n translation editor with virtual scrolling (Vanilla TypeScript).

## Installation

```bash
npm install localeeditor
# or
pnpm add localeeditor
# or
yarn add localeeditor
```

## Usage

### Basic Example

```typescript
import { LocaleEditor } from "localeeditor";
import "localeeditor/dist/index.css"; // Import styles

const editor = new LocaleEditor({
  container: document.getElementById("editor")!,
  translations: [
    {
      id: "1",
      key: "common.buttons.submit",
      values: { en: "Submit", ko: "제출" },
      context: "Submit button text",
    },
  ],
  languages: ["en", "ko"],
  defaultLanguage: "en",
});

editor.render();
```

### With Change Tracking

```typescript
import { LocaleEditor, type TranslationChange } from 'localeeditor';
import 'localeeditor/dist/index.css';

const editor = new LocaleEditor({
  container: document.getElementById('editor')!,
  translations: [...],
  languages: ['en', 'ko'],
  defaultLanguage: 'en',
  onCellChange: (id, columnId, value) => {
    console.log(`Changed: ${id} - ${columnId} = ${value}`);
  },
});

editor.render();

// Get all changes
const changes: TranslationChange[] = editor.getChanges();
console.log('Changes:', changes);

// Clear changes
editor.clearChanges();
```

## Features

### Core Features
- Virtual scrolling (handles 10,000+ rows smoothly)
- Cell editing with Undo/Redo support
- Multi-language column support
- Change tracking with dirty cell highlighting
- Empty translation highlighting
- Column resizing

### Keyboard Navigation
- Arrow keys for cell navigation
- Tab/Shift+Tab for horizontal navigation
- Enter for editing (language columns: move down after edit)
- Escape to cancel editing
- F2 to start editing

### Multi-cell Selection
- Click to select single cell
- Ctrl/Cmd+Click to toggle selection
- Shift+Click for range selection
- Shift+Arrow keys to extend selection

### Vim Mode
- `:` to open command line
- `:goto top` / `:goto bottom` - Jump to first/last row
- `:goto <n>` - Jump to row number
- `:goto "keyword"` - Search and jump to matching row
- `:goto next` / `:goto prev` - Navigate between matches
- Command history with Arrow Up/Down

### Command Palette
- `Cmd/Ctrl+K` to open
- Fuzzy search for commands
- Quick access to all editor functions

### Quick Search
- `/` to start quick search
- `n` / `N` for next/previous match
- Real-time highlighting

### Find & Replace
- `Cmd/Ctrl+F` for Find
- `Cmd/Ctrl+H` for Find & Replace
- Replace single or replace all

## API

### LocaleEditor

Main editor class for managing translations.

#### Constructor

```typescript
new LocaleEditor(options: LocaleEditorOptions)
```

#### Methods

- `render()`: Render the grid
- `getChanges()`: Get all tracked changes
- `clearChanges()`: Clear all tracked changes
- `undo()`: Undo last change
- `redo()`: Redo last undone change
- `focusCell(rowIndex, columnId)`: Focus a specific cell
- `getSelectedValues()`: Get values of selected cells
- `destroy()`: Clean up the editor

### Types

```typescript
interface Translation {
  id: string;
  key: string;
  values: Record<string, string>;
  context?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface LocaleEditorOptions {
  translations: readonly Translation[];
  languages: readonly string[];
  defaultLanguage: string;
  container: HTMLElement;
  readOnly?: boolean;
  onCellChange?: (id: string, columnId: string, value: string) => void;
}

interface TranslationChange {
  id: string;
  key: string;
  lang: string;
  oldValue: string;
  newValue: string;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e
```

## License

MIT
