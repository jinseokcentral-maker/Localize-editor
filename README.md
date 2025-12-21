# LocaleEditor

Excel-like i18n translation editor built with AG Grid Community (Vanilla TypeScript).

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
import { LocaleEditor } from 'localeeditor';
import 'localeeditor/dist/index.css'; // Import styles

const editor = new LocaleEditor({
  container: document.getElementById('editor')!,
  translations: [
    {
      id: '1',
      key: 'common.buttons.submit',
      values: { en: 'Submit', ko: '제출' },
      context: 'Submit button text',
    },
  ],
  languages: ['en', 'ko'],
  defaultLanguage: 'en',
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
  onCellChange: (id, lang, value) => {
    console.log(`Changed: ${id} - ${lang} = ${value}`);
  },
});

editor.render();

// Get all changes
const changes: TranslationChange[] = editor.getChanges();
console.log('Changes:', changes);

// Clear changes
editor.clearChanges();
```

## API

### LocaleEditor

Main editor class for managing translations.

#### Constructor

```typescript
new LocaleEditor(options: LocaleEditorOptions)
```

#### Methods

- `render()`: Render the grid
- `getGridApi()`: Get the AG Grid API instance
- `getColumnDefs()`: Get column definitions
- `getChanges()`: Get all tracked changes
- `clearChanges()`: Clear all tracked changes
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
  onCellChange?: (id: string, lang: string, value: string) => void;
  onSave?: (changes: TranslationChange[]) => Promise<void>;
  onSearch?: (query: string) => Promise<Translation[]>;
}

interface TranslationChange {
  id: string;
  key: string;
  lang: string;
  oldValue: string;
  newValue: string;
}
```

## Features

- ✅ Excel-like spreadsheet interface
- ✅ Virtual scrolling (handles large datasets)
- ✅ Cell editing with change tracking
- ✅ Multi-language support
- ✅ Context column for translator notes
- ✅ Performance optimized (validations disabled in production)

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
```

## License

MIT


