/**
 * Fuzzy Search 모듈
 * 
 * 명령 팔레트에서 명령어를 검색하기 위한 fuzzy search 알고리즘
 * fuse.js 라이브러리를 사용하여 안정적인 검색 기능 제공
 */

import Fuse from "fuse.js";
import type { Command } from "./command-registry";

export interface SearchResult {
  command: Command;
  score: number;
  matchedIndices: number[];
}

/**
 * 명령어 검색 (fuse.js 사용)
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

  // fuse.js 설정
  // 여러 필드를 검색: label, keywords, id
  // "search Welcome" 같은 경우 첫 단어로도 매칭되도록 threshold 조정
  const fuse = new Fuse(commands, {
    keys: [
      { name: "label", weight: 0.5 },
      { name: "keywords", weight: 0.3 },
      { name: "id", weight: 0.2 },
    ],
    threshold: 0.6, // 0.6 이하면 매칭 (낮을수록 엄격, 높을수록 관대)
    includeScore: true,
    includeMatches: true,
    // 공백으로 분리된 쿼리의 첫 단어로도 매칭되도록
    ignoreLocation: false,
    minMatchCharLength: 1,
    // "search Welcome"에서 "search"만으로도 매칭되도록
    findAllMatches: false,
    // 약어 매칭을 위해 더 관대한 설정
    shouldSort: true,
    // 거리 계산 방식 조정
    distance: 100,
  });

  // 검색 실행
  const fuseResults = fuse.search(query);

  // SearchResult 형식으로 변환
  const results: SearchResult[] = fuseResults.map((result) => {
    // fuse.js의 score는 0(완벽한 매칭) ~ 1(매칭 없음) 범위
    // 우리는 0(매칭 없음) ~ 1(완벽한 매칭) 범위로 변환
    const normalizedScore = result.score !== undefined ? 1 - result.score : 0;

    // 매칭된 인덱스 추출
    const matchedIndices: number[] = [];
    if (result.matches) {
      for (const match of result.matches) {
        if (match.indices) {
          for (const [start, end] of match.indices) {
            for (let i = start; i <= end; i++) {
              matchedIndices.push(i);
            }
          }
        }
      }
    }

    return {
      command: result.item,
      score: normalizedScore,
      matchedIndices: Array.from(new Set(matchedIndices)).sort((a, b) => a - b),
    };
  });

  // 점수 순으로 정렬 (높은 점수 먼저) - fuse.js가 이미 정렬하지만, 사용 횟수 고려
  results.sort((a, b) => {
    // 점수가 비슷하면 사용 횟수로 정렬
    if (Math.abs(a.score - b.score) < 0.01) {
      const aUsage = a.command.usageCount ?? 0;
      const bUsage = b.command.usageCount ?? 0;
      return bUsage - aUsage;
    }
    return b.score - a.score;
  });

  return results;
}
