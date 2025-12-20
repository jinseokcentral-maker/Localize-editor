// Vitest 테스트 설정 파일
import { expect, afterEach } from "vitest";

// DOM 정리 (각 테스트 후)
afterEach(() => {
  // DOM 정리 로직 (필요시 추가)
  document.body.innerHTML = "";
});

// 전역 expect 사용 가능
export { expect };
