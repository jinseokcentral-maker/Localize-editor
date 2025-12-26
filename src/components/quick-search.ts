/**
 * 빠른 검색 (Quick Search) 모듈
 * 
 * `/` 키로 검색 모드 진입
 * 실시간 하이라이트
 * 컬럼별 검색 지원 (/key:keyword, /en:keyword 등)
 */

import type { Translation } from "@/types/translation";

export interface SearchQuery {
  keyword: string;
  column?: string; // 'key', 'context', 'en', 'ko' 등
}

export interface QuickSearchMatch {
  rowIndex: number;
  columnId: string;
  matchedText: string;
  matchIndices: number[]; // 하이라이트할 문자 인덱스
}

export interface QuickSearchOptions {
  translations: readonly Translation[];
  languages: readonly string[];
}

/**
 * 검색어 파싱
 * 
 * @param query 검색어 (예: "keyword", "key:keyword", "en:keyword")
 * @returns 파싱된 검색 쿼리 또는 null
 */
export function parseSearchQuery(query: string): SearchQuery | null {
  if (!query || !query.trim()) {
    return null;
  }

  const trimmed = query.trim();

  // 컬럼별 검색 파싱 (예: "key:keyword", "en:keyword")
  const columnMatch = trimmed.match(/^(\w+):(.+)$/);
  if (columnMatch) {
    const [, column, keyword] = columnMatch;
    if (keyword.trim()) {
      return {
        keyword: keyword.trim(),
        column: column.toLowerCase(),
      };
    }
  }

  // 일반 검색
  return {
    keyword: trimmed,
  };
}

/**
 * 텍스트에서 검색어 매칭 인덱스 찾기
 * 
 * @param text 검색 대상 텍스트
 * @param keyword 검색 키워드
 * @returns 매칭된 문자 인덱스 배열
 */
export function findMatchIndices(text: string, keyword: string): number[] {
  if (!text || !keyword) {
    return [];
  }

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const indices: number[] = [];

  let startIndex = 0;
  while (true) {
    const index = lowerText.indexOf(lowerKeyword, startIndex);
    if (index === -1) {
      break;
    }
    for (let i = 0; i < lowerKeyword.length; i++) {
      indices.push(index + i);
    }
    startIndex = index + 1;
  }

  return indices;
}

/**
 * 빠른 검색 클래스
 */
export class QuickSearch {
  private options: QuickSearchOptions;

  constructor(options: QuickSearchOptions) {
    this.options = options;
  }

  /**
   * 검색 실행
   * 
   * @param query 검색 쿼리
   * @returns 검색 결과 매칭 배열
   */
  findMatches(query: SearchQuery): QuickSearchMatch[] {
    if (!query.keyword) {
      return [];
    }

    const matches: QuickSearchMatch[] = [];
    const keyword = query.keyword.toLowerCase();

    this.options.translations.forEach((translation, rowIndex) => {
      // 컬럼별 검색
      if (query.column) {
        const columnId = this.getColumnIdForSearch(query.column);
        if (columnId) {
          const value = this.getCellValue(translation, columnId);
          if (value && value.toLowerCase().includes(keyword)) {
            const matchIndices = findMatchIndices(value, query.keyword);
            matches.push({
              rowIndex,
              columnId,
              matchedText: value,
              matchIndices,
            });
          }
        }
        return;
      }

      // 전체 컬럼 검색
      const columns = [
        "key",
        "context",
        ...this.options.languages.map((lang) => `values.${lang}`),
      ];

      columns.forEach((columnId) => {
        const value = this.getCellValue(translation, columnId);
        if (value && value.toLowerCase().includes(keyword)) {
          const matchIndices = findMatchIndices(value, query.keyword);
          matches.push({
            rowIndex,
            columnId,
            matchedText: value,
            matchIndices,
          });
        }
      });
    });

    return matches;
  }

  /**
   * 검색 컬럼 이름을 컬럼 ID로 변환
   * 
   * @param column 검색 컬럼 이름 ('key', 'context', 'en', 'ko' 등)
   * @returns 컬럼 ID 또는 null
   */
  private getColumnIdForSearch(column: string): string | null {
    const lowerColumn = column.toLowerCase();

    if (lowerColumn === "key") {
      return "key";
    }
    if (lowerColumn === "context") {
      return "context";
    }

    // 언어 코드 확인
    if (this.options.languages.includes(lowerColumn)) {
      return `values.${lowerColumn}`;
    }

    return null;
  }

  /**
   * 셀 값 가져오기
   * 
   * @param translation 번역 객체
   * @param columnId 컬럼 ID
   * @returns 셀 값 또는 null
   */
  private getCellValue(
    translation: Translation,
    columnId: string
  ): string | null {
    if (columnId === "key") {
      return translation.key || null;
    }
    if (columnId === "context") {
      return translation.context || null;
    }
    if (columnId.startsWith("values.")) {
      const lang = columnId.replace("values.", "");
      return translation.values?.[lang] || null;
    }
    return null;
  }

  /**
   * 텍스트에 하이라이트 적용
   * 
   * @param text 원본 텍스트
   * @param indices 하이라이트할 문자 인덱스 배열
   * @returns HTML 문자열
   */
  static highlightText(text: string, indices: number[]): string {
    if (!text || indices.length === 0) {
      return escapeHtml(text);
    }

    const sortedIndices = [...new Set(indices)].sort((a, b) => a - b);
    const parts: string[] = [];
    let lastIndex = 0;
    let highlightStart: number | null = null;

    sortedIndices.forEach((index, i) => {
      const isConsecutive =
        highlightStart !== null && index === sortedIndices[i - 1] + 1;

      if (!isConsecutive) {
        // 이전 하이라이트 구간 종료
        if (highlightStart !== null) {
          const highlightEnd = sortedIndices[i - 1] + 1;
          parts.push(
            `<mark class="quick-search-highlight">${escapeHtml(
              text.substring(highlightStart, highlightEnd)
            )}</mark>`
          );
          lastIndex = highlightEnd;
        }

        // 하이라이트 전 텍스트
        if (index > lastIndex) {
          parts.push(escapeHtml(text.substring(lastIndex, index)));
        }

        highlightStart = index;
      }
    });

    // 마지막 하이라이트 구간
    if (highlightStart !== null) {
      const highlightEnd = sortedIndices[sortedIndices.length - 1] + 1;
      parts.push(
        `<mark class="quick-search-highlight">${escapeHtml(
          text.substring(highlightStart, highlightEnd)
        )}</mark>`
      );
      lastIndex = highlightEnd;
    }

    // 마지막 부분
    if (lastIndex < text.length) {
      parts.push(escapeHtml(text.substring(lastIndex)));
    }

    return parts.join("");
  }
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

