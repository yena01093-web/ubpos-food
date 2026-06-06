import { NextRequest } from 'next/server';
import { verifyAccessToken, JwtPayload } from './jwt';
import { unauthorized } from './response';

/** Request에서 JWT 파싱 → payload 반환, 실패 시 null */
export function getAuth(req: NextRequest): JwtPayload | null {
  try {
    const header = req.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/** 인증 필수 래퍼 — 미인증 시 401 반환 */
export function requireAuth(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return { auth: null, error: unauthorized() };
  return { auth, error: null };
}

/** 특정 가맹점 접근 권한 확인 */
export function requireStoreAccess(auth: JwtPayload, storeId: string) {
  if (auth.role === 'admin') return true;
  return auth.storeIds.includes(storeId);
}
