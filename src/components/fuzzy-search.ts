/**
 * Fuzzy Search 모듈
 * 
 * 명령 팔레트에서 명령어를 검색하기 위한 fuzzy search 알고리즘
 */

import type { Command } from "./command-registry";

export interface SearchResult {
  command: Command;
  score: number;
  matchedIndices: number[];
}

/**
 * 간단한 fuzzy match 알고리즘
 * 
 * @param query 검색 쿼리
 * @param text 검색 대상 텍스트
 * @returns 매칭 점수 (0-1) 및 매칭된 인덱스
 */
function fuzzyMatch(
  query: string,
  text: string
): { score: number; matchedIndices: number[] } {
  if (!query) {
    return { score: 1, matchedIndices: [] };
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // 정확한 일치
  if (textLower === queryLower) {
    return { score: 1, matchedIndices: [] };
  }

  // 시작 부분 일치
  if (textLower.startsWith(queryLower)) {
    return { score: 0.9, matchedIndices: [] };
  }

  // 부분 문자열 일치
  const index = textLower.indexOf(queryLower);
  if (index !== -1) {
    const indices: number[] = [];
    for (let i = 0; i < queryLower.length; i++) {
      indices.push(index + i);
    }
    return { score: 0.7, matchedIndices: indices };
  }

  // Fuzzy match: 각 문자가 순서대로 나타나는지 확인
  let queryIndex = 0;
  let textIndex = 0;
  const matchedIndices: number[] = [];
  let consecutiveMatches = 0;
  let maxConsecutive = 0;

  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      matchedIndices.push(textIndex);
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }

  // 모든 문자가 매칭되었는지 확인
  if (queryIndex === queryLower.length) {
    // 연속 매칭이 많을수록 높은 점수
    const baseScore = 0.5;
    const consecutiveBonus = maxConsecutive / queryLower.length * 0.3;
    const positionBonus = matchedIndices[0] === 0 ? 0.1 : 0;
    const score = Math.min(1, baseScore + consecutiveBonus + positionBonus);
    return { score, matchedIndices };
  }

  return { score: 0, matchedIndices: [] };
}

/**
 * 명령어 검색
 * 
 * @param query 검색 쿼리
 * @param commands 검색할 명령어 목록
 * @returns 검색 결과 (점수 순으로 정렬)
 */
export function searchCommands(
  query: string,
  commands: Command[]
): SearchResult[] {
  if (!query.trim()) {
    return commands.map((cmd) => ({
      command: cmd,
      score: 1,
      matchedIndices: [],
    }));
  }

  const results: SearchResult[] = [];

  for (const command of commands) {
    // label 검색
    const labelMatch = fuzzyMatch(query, command.label);
    
    // keywords 검색
    let maxKeywordScore = 0;
    for (const keyword of command.keywords) {
      const keywordMatch = fuzzyMatch(query, keyword);
      maxKeywordScore = Math.max(maxKeywordScore, keywordMatch.score);
    }

    // id 검색
    const idMatch = fuzzyMatch(query, command.id);

    // 최고 점수 사용
    const maxScore = Math.max(
      labelMatch.score,
      maxKeywordScore,
      idMatch.score
    );

    if (maxScore > 0) {
      results.push({
        command,
        score: maxScore,
        matchedIndices: labelMatch.matchedIndices,
      });
    }
  }

  // 점수 순으로 정렬 (높은 점수 먼저)
  results.sort((a, b) => {
    // 점수가 같으면 사용 횟수로 정렬
    if (Math.abs(a.score - b.score) < 0.01) {
      const aUsage = a.command.usageCount ?? 0;
      const bUsage = b.command.usageCount ?? 0;
      return bUsage - aUsage;
    }
    return b.score - a.score;
  });

  return results;
}

