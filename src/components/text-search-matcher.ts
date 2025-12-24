/**
 * 텍스트 검색 매처 (Text Search Matcher)
 * 
 * Translation 데이터에서 텍스트를 검색하고 매칭하는 로직
 */

import type { Translation } from "@/types/translation";

export interface SearchMatch {
  rowIndex: number;
  translation: Translation;
  score: number;
  matchedFields: Array<{
    field: string;
    matchedText: string;
    matchType: "exact" | "contains" | "fuzzy";
  }>;
}

export interface TextSearchMatcherOptions {
  translations: readonly Translation[];
  languages: readonly string[];
}

/**
 * 텍스트 검색 매처 클래스
 */
export class TextSearchMatcher {
  constructor(private options: TextSearchMatcherOptions) {}

  /**
   * 텍스트로 매치 찾기 (fuzzy find)
   * @param keyword 검색 키워드
   * @returns 매치 결과 배열 (점수 순으로 정렬)
   */
  findMatches(keyword: string): SearchMatch[] {
    if (!keyword.trim()) {
      return [];
    }

    const searchKeyword = keyword.toLowerCase().trim();
    const matches: SearchMatch[] = [];

    this.options.translations.forEach((translation, index) => {
      let score = 0;
      const matchedFields: Array<{
        field: string;
        matchedText: string;
        matchType: "exact" | "contains" | "fuzzy";
      }> = [];

      // Key 검색
      const keyLower = translation.key.toLowerCase();
      if (keyLower === searchKeyword) {
        score += 50;
        matchedFields.push({
          field: "key",
          matchedText: translation.key,
          matchType: "exact",
        });
      } else if (keyLower.includes(searchKeyword)) {
        score += 30;
        matchedFields.push({
          field: "key",
          matchedText: translation.key,
          matchType: "contains",
        });
      } else if (this.fuzzyMatch(keyLower, searchKeyword)) {
        score += 15;
        matchedFields.push({
          field: "key",
          matchedText: translation.key,
          matchType: "fuzzy",
        });
      }

      // Context 검색
      if (translation.context) {
        const contextLower = translation.context.toLowerCase();
        if (contextLower === searchKeyword) {
          score += 20;
          matchedFields.push({
            field: "context",
            matchedText: translation.context,
            matchType: "exact",
          });
        } else if (contextLower.includes(searchKeyword)) {
          score += 20;
          matchedFields.push({
            field: "context",
            matchedText: translation.context,
            matchType: "contains",
          });
        } else if (this.fuzzyMatch(contextLower, searchKeyword)) {
          score += 10;
          matchedFields.push({
            field: "context",
            matchedText: translation.context,
            matchType: "fuzzy",
          });
        }
      }

      // Language values 검색
      this.options.languages.forEach((lang) => {
        const value = translation.values[lang] || "";
        const valueLower = value.toLowerCase();
        if (valueLower === searchKeyword) {
          score += 10;
          matchedFields.push({
            field: `values.${lang}`,
            matchedText: value,
            matchType: "exact",
          });
        } else if (valueLower.includes(searchKeyword)) {
          score += 10;
          matchedFields.push({
            field: `values.${lang}`,
            matchedText: value,
            matchType: "contains",
          });
        } else if (this.fuzzyMatch(valueLower, searchKeyword)) {
          score += 5;
          matchedFields.push({
            field: `values.${lang}`,
            matchedText: value,
            matchType: "fuzzy",
          });
        }
      });

      // 매치가 있으면 결과에 추가
      if (score > 0) {
        matches.push({
          rowIndex: index,
          translation,
          score,
          matchedFields,
        });
      }
    });

    // 정렬: 점수 높은 순 → 행 번호 낮은 순
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.rowIndex - b.rowIndex;
    });

    return matches;
  }

  /**
   * 간단한 fuzzy match (부분 일치)
   * @param text 검색 대상 텍스트
   * @param pattern 검색 패턴
   * @returns 매치 여부
   */
  private fuzzyMatch(text: string, pattern: string): boolean {
    if (pattern.length === 0) return true;
    if (pattern.length > text.length) return false;

    let patternIndex = 0;
    for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
      if (text[i] === pattern[patternIndex]) {
        patternIndex++;
      }
    }
    return patternIndex === pattern.length;
  }
}

