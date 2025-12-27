/**
 * Effect 테스트 유틸리티
 *
 * Effect를 테스트에서 쉽게 사용할 수 있도록 하는 헬퍼 함수들
 */
import { Effect } from "effect";
/**
 * Effect를 Promise로 변환하여 테스트에서 사용
 * Requirements(R)가 없는 Effect만 처리
 */
export declare const runEffect: <A, E>(effect: Effect.Effect<A, E, never>) => Promise<A>;
/**
 * Effect를 동기적으로 실행 (동기 Effect만)
 */
export declare const runEffectSync: <A, E>(effect: Effect.Effect<A, E>) => A;
/**
 * Effect 실패를 기대하는 헬퍼
 * Effect가 실패하면 에러를 반환하고, 성공하면 테스트 실패
 * Requirements(R)가 없는 Effect만 처리
 */
export declare const expectEffectToFail: <E>(effect: Effect.Effect<unknown, E, never>) => Promise<E>;
/**
 * Effect 결과를 검증하는 헬퍼
 * Requirements(R)가 없는 Effect만 처리
 */
export declare const expectEffect: <A, E>(effect: Effect.Effect<A, E, never>, matcher: (value: A) => void | Promise<void>) => Promise<void>;
//# sourceMappingURL=effect-helpers.d.ts.map