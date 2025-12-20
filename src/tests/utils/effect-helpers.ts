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
export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<A> => {
  return Effect.runPromise(effect);
};

/**
 * Effect를 동기적으로 실행 (동기 Effect만)
 */
export const runEffectSync = <A, E>(effect: Effect.Effect<A, E>): A => {
  return Effect.runSync(effect);
};

/**
 * Effect 실패를 기대하는 헬퍼
 * Effect가 실패하면 에러를 반환하고, 성공하면 테스트 실패
 * Requirements(R)가 없는 Effect만 처리
 */
export const expectEffectToFail = async <E>(
  effect: Effect.Effect<unknown, E, never>
): Promise<E> => {
  return Effect.runPromise(Effect.flip(effect));
};

/**
 * Effect 결과를 검증하는 헬퍼
 * Requirements(R)가 없는 Effect만 처리
 */
export const expectEffect = async <A, E>(
  effect: Effect.Effect<A, E, never>,
  matcher: (value: A) => void | Promise<void>
): Promise<void> => {
  const result = await runEffect(effect);
  await matcher(result);
};
