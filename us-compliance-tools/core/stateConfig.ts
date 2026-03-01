export const STATES = ["california", "texas", "florida", "newyork"] as const;

export function isValidState(state: string) {
  return STATES.includes(state as (typeof STATES)[number]);
}
