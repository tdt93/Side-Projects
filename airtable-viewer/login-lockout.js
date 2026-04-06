/** @typedef {{ stage: "striking" | "post_first_lock" | "post_second_lock" | "post_third_lock", strikes: number, lockUntil: number }} LockState */

const MS_15M = 15 * 60 * 1000;
const MS_1H = 60 * 60 * 1000;
const MS_24H = 24 * 60 * 60 * 1000;

/** @type {Map<string, LockState>} */
const loginLockState = new Map();

export function loginLockoutKey(req, emailNorm) {
  const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
  return `${ip}|${emailNorm}`;
}

/**
 * @param {import("express").Request} req
 * @param {string} emailNorm
 * @returns {{ locked: true, lockUntil: number } | { locked: false }}
 */
export function recordLoginFailure(req, emailNorm) {
  const key = loginLockoutKey(req, emailNorm);
  const now = Date.now();
  /** @type {LockState} */
  let st = loginLockState.get(key) || { stage: "striking", strikes: 0, lockUntil: 0 };

  if (now < st.lockUntil) {
    return { locked: true, lockUntil: st.lockUntil };
  }

  if (st.stage === "striking") {
    st.strikes += 1;
    if (st.strikes >= 3) {
      st.lockUntil = now + MS_15M;
      st.strikes = 0;
      st.stage = "post_first_lock";
      loginLockState.set(key, st);
      return { locked: true, lockUntil: st.lockUntil };
    }
    loginLockState.set(key, st);
    return { locked: false };
  }

  if (st.stage === "post_first_lock") {
    st.lockUntil = now + MS_1H;
    st.stage = "post_second_lock";
    loginLockState.set(key, st);
    return { locked: true, lockUntil: st.lockUntil };
  }

  if (st.stage === "post_second_lock") {
    st.lockUntil = now + MS_24H;
    st.stage = "post_third_lock";
    loginLockState.set(key, st);
    return { locked: true, lockUntil: st.lockUntil };
  }

  st.lockUntil = now + MS_24H;
  loginLockState.set(key, st);
  return { locked: true, lockUntil: st.lockUntil };
}

/** @param {import("express").Request} req
 * @param {string} emailNorm */
export function clearLoginLockout(req, emailNorm) {
  loginLockState.delete(loginLockoutKey(req, emailNorm));
}

/**
 * @param {import("express").Request} req
 * @param {string} emailNorm
 * @returns {{ locked: true, lockUntil: number } | { locked: false }}
 */
export function checkLoginLocked(req, emailNorm) {
  const key = loginLockoutKey(req, emailNorm);
  const st = loginLockState.get(key);
  const now = Date.now();
  if (st && now < st.lockUntil) {
    return { locked: true, lockUntil: st.lockUntil };
  }
  return { locked: false };
}
