/**
 * Command Palette Fuzzy Find 모듈
 * 
 * Command Palette의 fuzzy find 관련 로직 (입력 파싱, 스타일링, 결과 렌더링)
 */

export interface FuzzyFindMatch {
  rowIndex: number;
  translation: any;
  score: number;
  matchedFields: Array<{
    field: string;
    matchedText: string;
    matchType: "exact" | "contains" | "fuzzy";
  }>;
}

export interface FuzzyFindInputParserResult {
  isFuzzyFindMode: boolean;
  fuzzyFindQuery: string;
  quoteChar: '"' | "'" | null;
}

/**
 * 입력 파싱 (fuzzy find 모드 감지)
 * " 또는 ' 이후 텍스트는 검색 키워드로 처리
 * 닫는 따옴표가 있으면 제거 (검색 키워드에는 포함하지 않음)
 */
export function parseFuzzyFindInput(query: string): FuzzyFindInputParserResult {
  const trimmed = query.trim();

  // "goto "로 시작하는지 확인
  if (!trimmed.startsWith("goto ") && !trimmed.startsWith("go to ")) {
    return { isFuzzyFindMode: false, fuzzyFindQuery: "", quoteChar: null };
  }

  // "goto " 또는 "go to " 이후 부분 추출
  const afterGoto = trimmed.startsWith("goto ")
    ? trimmed.slice(5)
    : trimmed.slice(6);

  // " 또는 '로 시작하는지 확인
  let quoteChar: '"' | "'" | null = null;
  if (afterGoto.startsWith('"')) {
    quoteChar = '"';
  } else if (afterGoto.startsWith("'")) {
    quoteChar = "'";
  } else {
    return { isFuzzyFindMode: false, fuzzyFindQuery: "", quoteChar: null };
  }

  // 따옴표 이후 부분 추출
  const afterQuote = afterGoto.slice(1);

  // 닫는 따옴표가 있으면 제거 (검색 키워드에는 포함하지 않음)
  let searchQuery = afterQuote;
  if (afterQuote.endsWith(quoteChar)) {
    searchQuery = afterQuote.slice(0, -1);
  }

  return {
    isFuzzyFindMode: true,
    fuzzyFindQuery: searchQuery,
    quoteChar,
  };
}

/**
 * 입력 필드 스타일링 업데이트 (따옴표 이후 텍스트를 bold/italic로 표시)
 */
export function updateInputStyling(
  input: HTMLInputElement,
  query: string,
  parsed: FuzzyFindInputParserResult
): HTMLElement | null {
  // 기존 오버레이 제거
  const existingOverlay = input.parentElement?.querySelector(
    ".command-palette-input-overlay"
  );
  if (existingOverlay) {
    existingOverlay.remove();
  }

  if (!parsed.isFuzzyFindMode || !parsed.quoteChar) {
    // 일반 모드: 스타일링 없음
    return null;
  }

  // 오버레이 생성 (input 위에 텍스트 렌더링)
  const overlay = document.createElement("div");
  overlay.className = "command-palette-input-overlay";
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    padding: 12px 16px;
    font-size: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    white-space: pre;
    overflow: hidden;
    box-sizing: border-box;
    line-height: 1.5;
    border: none;
    background: transparent;
  `;

  // 텍스트 파싱 및 스타일링
  const quoteIndex = query.indexOf(parsed.quoteChar);
  const beforeQuote = query.substring(0, quoteIndex + 1);
  const afterQuote = parsed.fuzzyFindQuery;

  // 따옴표 이전 텍스트 (일반 스타일)
  const beforeText = document.createTextNode(beforeQuote);
  const beforeSpan = document.createElement("span");
  beforeSpan.style.cssText = `color: #1e293b;`;
  beforeSpan.appendChild(beforeText);
  overlay.appendChild(beforeSpan);

  // 따옴표 이후 텍스트 (bold + italic)
  if (afterQuote) {
    const styledSpan = document.createElement("span");
    styledSpan.style.cssText = `
      font-weight: bold;
      font-style: italic;
      color: #1e293b;
    `;
    styledSpan.textContent = afterQuote;
    overlay.appendChild(styledSpan);
  }

  // input의 부모(wrapper)에 오버레이 추가
  if (input.parentElement) {
    input.parentElement.appendChild(overlay);
  }

  return overlay;
}

/**
 * Fuzzy find 결과 리스트 UI 생성
 */
export function createFuzzyFindList(
  listContainer: HTMLElement,
  fuzzyFindQuery: string,
  fuzzyFindResults: FuzzyFindMatch[],
  selectedIndex: number,
  onItemClick: (index: number) => void
): void {
  listContainer.innerHTML = "";

  // 검색 중 표시 (따옴표 이후 텍스트가 없을 때)
  if (!fuzzyFindQuery || fuzzyFindQuery.trim() === "") {
    const emptyItem = document.createElement("div");
    emptyItem.className = "command-palette-item command-palette-item-empty";
    emptyItem.textContent = "Type to search...";
    listContainer.appendChild(emptyItem);
    return;
  }

  // 검색 결과가 없는 경우
  if (fuzzyFindResults.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "command-palette-item command-palette-item-empty";
    emptyItem.textContent = "No matches found";
    listContainer.appendChild(emptyItem);
    return;
  }

  // 검색 결과 헤더
  const headerItem = document.createElement("div");
  headerItem.className = "command-palette-item command-palette-item-empty";
  headerItem.textContent = `Search Results (${fuzzyFindResults.length})`;
  listContainer.appendChild(headerItem);

  // 검색 결과 항목들
  fuzzyFindResults.forEach((result, index) => {
    const item = document.createElement("div");
    item.className = "command-palette-item";
    item.setAttribute("role", "option");
    item.setAttribute(
      "aria-selected",
      (index === selectedIndex).toString()
    );

    if (index === selectedIndex) {
      item.classList.add("command-palette-item-selected");
    }

    // 매칭된 필드 정보 표시
    const label = document.createElement("div");
    label.className = "command-palette-item-label";

    // Key, Context, 또는 Value 중 매칭된 필드 표시
    const translation = result.translation;
    let displayText = "";
    if (result.matchedFields && result.matchedFields.length > 0) {
      const matchedField = result.matchedFields[0];
      if (matchedField.field === "key") {
        displayText = `Key: ${translation.key}`;
      } else if (matchedField.field === "context") {
        displayText = `Context: ${translation.context || ""}`;
      } else if (matchedField.field.startsWith("values.")) {
        const lang = matchedField.field.replace("values.", "");
        displayText = `${lang.toUpperCase()}: ${translation.values?.[lang] || ""}`;
      } else {
        displayText = translation.key || "";
      }
    } else {
      displayText = translation.key || "";
    }

    label.textContent = displayText;

    // Description (Row 번호)
    const desc = document.createElement("div");
    desc.className = "command-palette-item-description";
    desc.textContent = `Row ${result.rowIndex + 1}`;
    item.appendChild(desc);

    item.appendChild(label);

    // 클릭 이벤트
    item.addEventListener("click", () => {
      onItemClick(index);
    });

    listContainer.appendChild(item);
  });
}



