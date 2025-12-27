/**
 * Fuzzy Search 모듈
 *
 * 명령 팔레트에서 명령어를 검색하기 위한 fuzzy search 알고리즘
 * fuse.js 라이브러리를 사용하여 안정적인 검색 기능 제공
 */
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
export declare function searchCommands(query: string, commands: Command[]): SearchResult[];
//# sourceMappingURL=fuzzy-search.d.ts.map