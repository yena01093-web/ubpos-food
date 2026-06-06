// POST /api/auth/refresh
import { NextRequest } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { queryOne, query } from '@/lib/db';
import { ok, fail, serverError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return fail('refreshToken이 없습니다', 401);

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return fail('유효하지 않은 토큰입니다', 401);
    }

    const user = await queryOne<{ id: string; role: string; is_active: boolean }>(
      `SELECT id, role, is_active FROM users WHERE id = $1`,
      [payload.userId]
    );
    if (!user || !user.is_active) return fail('사용자를 찾을 수 없습니다', 401);

    const stores = await query<{ store_id: string }>(
      `SELECT store_id FROM store_staff WHERE user_id = $1
       UNION
       SELECT id AS store_id FROM stores WHERE owner_id = $1`,
      [user.id]
    );

    const jwtPayload = {
      userId: user.id,
      role: user.role as 'admin' | 'owner' | 'staff',
      storeIds: stores.map(s => s.store_id),
    };

    return ok({
      accessToken:  signAccessToken(jwtPayload),
      refreshToken: signRefreshToken({ userId: user.id }),
    });
  } catch (err) {
    return serverError(err);
  }
}
