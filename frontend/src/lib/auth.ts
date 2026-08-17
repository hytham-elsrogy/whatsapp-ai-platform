import { api, refreshAccessToken } from '@/lib/api';
import { AuthUser, useAuthStore } from '@/store/auth-store';

let inFlightBootstrap: Promise<boolean> | null = null;

// The refresh token is single-use (rotated on every call), so two concurrent
// callers — e.g. React Strict Mode's double effect invocation in dev — must
// share one request instead of racing two, or the loser gets a stale token
// and 401s even though the winner succeeded.
export function bootstrapSession(): Promise<boolean> {
  if (!inFlightBootstrap) {
    inFlightBootstrap = doBootstrap().finally(() => {
      inFlightBootstrap = null;
    });
  }
  return inFlightBootstrap;
}

async function doBootstrap(): Promise<boolean> {
  const refreshed = await refreshAccessToken();
  if (!refreshed) return false;

  try {
    const user = await api.get<AuthUser>('/auth/me');
    useAuthStore.getState().setUser(user);
    return true;
  } catch {
    return false;
  }
}
