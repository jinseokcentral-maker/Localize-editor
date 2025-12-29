/**
 * @packageDocumentation
 * LocaleEditor - Excel-like i18n translation editor
 *
 * A high-performance, virtual-scrolling translation editor for managing
 * internationalization (i18n) data. Features include:
 *
 * - **Virtual Scrolling**: Efficiently handles thousands of translation entries
 * - **Excel-like Editing**: Familiar spreadsheet-style interface
 * - **Keyboard Navigation**: Arrow keys, Tab, Enter for quick navigation
 * - **Undo/Redo**: Full history support with Ctrl+Z / Ctrl+Y
 * - **Search & Replace**: Find and replace across all translations
 * - **Command Palette**: Quick access to all features via Ctrl+K
 * - **Change Tracking**: Track all modifications for saving
 *
 * @example Basic Usage
 * ```typescript
 * import { VirtualTableDiv } from 'localeeditor';
 * import 'localeeditor/dist/index.css';
 *
 * const editor = new VirtualTableDiv({
 *   container: document.getElementById('editor')!,
 *   translations: [
 *     { id: '1', key: 'greeting', values: { en: 'Hello', ko: '안녕하세요' } },
 *     { id: '2', key: 'farewell', values: { en: 'Goodbye', ko: '안녕히가세요' } },
 *   ],
 *   languages: ['en', 'ko'],
 *   defaultLanguage: 'en',
 *   onCellChange: (id, columnId, value) => {
 *     console.log(`Cell changed: ${id}.${columnId} = ${value}`);
 *   },
 * });
 * ```
 *
 * @example Getting Changes
 * ```typescript
 * // Get all pending changes
 * const changes = editor.getChanges();
 *
 * // Save changes to your backend
 * await saveToBackend(changes);
 *
 * // Clear change tracking after save
 * editor.clearChanges();
 * ```
 *
 * @module localeeditor
 */
export { VirtualTableDiv } from "./components/virtual-table-div";
export type { VirtualTableDivOptions } from "./components/virtual-table-div";
export { ChangeTracker } from "./components/change-tracker";
export type { Translation, TranslationChange } from "./types/translation";
export type { ChangeTrackerConfig } from "./components/change-tracker-config";
export type { ChangeTrackerError, LocaleEditorError, ValidationError, ChangeTrackerErrorCode, LocaleEditorErrorCode, } from "./types/errors";
//# sourceMappingURL=index.d.ts.map