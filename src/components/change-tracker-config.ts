/**
 * ChangeTracker 설정
 * 
 * 프로덕션 환경에서 검증을 스킵하여 성능을 최적화할 수 있습니다.
 */

export interface ChangeTrackerConfig {
  /**
   * 검증 활성화 여부
   * - true: Zod 검증과 Effect를 사용한 type-safe 에러 처리
   * - false: 검증 없이 직접 Map 접근만 수행 (더 빠름)
   * 
   * 기본값: true (개발 환경에서는 검증 활성화 권장)
   */
  readonly enableValidation?: boolean;
}

/**
 * 기본 설정
 * 
 * Vite를 사용하므로 `import.meta.env.PROD`를 사용하여 프로덕션 환경을 감지합니다.
 * - 개발 환경: 검증 활성화 (type-safe 에러 처리)
 * - 프로덕션 환경: 검증 비활성화 (최고 성능)
 */
export const defaultConfig: ChangeTrackerConfig = {
  enableValidation: !import.meta.env.PROD, // 프로덕션에서는 기본적으로 비활성화
};

