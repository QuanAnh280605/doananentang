type JwtPayload = {
  exp?: number;
  sub?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');

  if (parts.length < 2) {
    return null;
  }

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');

  if (typeof atob !== 'function') {
    return null;
  }

  try {
    const raw = atob(padded);
    return JSON.parse(raw) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtTokenValid(token: string | null): boolean {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}

export function getCurrentUserIdFromToken(token: string | null): number | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);

  if (!payload?.sub) {
    return null;
  }

  const userId = parseInt(payload.sub, 10);
  return isNaN(userId) ? null : userId;
}
