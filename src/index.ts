/**
 * LocaleEditor - Excel-like i18n translation editor
 * 
 * Main entry point for the package
 */

// Main classes
export { VirtualTableDiv } from "./components/virtual-table-div";
export type { VirtualTableDivOptions } from "./components/virtual-table-div";
export { ChangeTracker } from "./components/change-tracker";

// Types
export type {
  Translation,
  TranslationChange,
} from "./types/translation";

export type {
  ChangeTrackerConfig,
} from "./components/change-tracker-config";

export type {
  ChangeTrackerError,
  LocaleEditorError,
  ValidationError,
  ChangeTrackerErrorCode,
  LocaleEditorErrorCode,
} from "./types/errors";

// Styles (CSS import - users need to import this manually if using CSS)
// Note: Styles are automatically included in the bundle when imported

