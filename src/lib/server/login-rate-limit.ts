type Attempt = { failures: number; blockedUntil: number };

const attempts = new Map<string, Attempt>();
const MAX_FAILURES = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

export function isLoginRateLimited(key: string) {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (attempt.blockedUntil <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return attempt.failures >= MAX_FAILURES;
}

export function registerFailedLogin(key: string) {
  const current = attempts.get(key) ?? { failures: 0, blockedUntil: 0 };
  const failures = current.failures + 1;
  attempts.set(key, {
    failures,
    blockedUntil: failures >= MAX_FAILURES ? Date.now() + BLOCK_DURATION_MS : 0,
  });
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
