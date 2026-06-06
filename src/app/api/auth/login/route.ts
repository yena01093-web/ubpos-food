// POST /api/auth/login
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryOne, query } from '@/lib/db';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { ok, fail, serverError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return fail('이메일과 비밀번호를 입력해주세요');
    }

    // 사용자 조회
    const user = await queryOne<{
      id: string; email: string; password_hash: string;
      name: string; role: string; is_active: boolean;
    }>(
      `SELECT id, email, password_hash, name, role, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (!user || !user.is_active) {
      return fail('이메일 또는 비밀번호가 올바르지 않습니다', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return fail('이메일 또는 비밀번호가 올바르지 않습니다', 401);
    }

    // 접근 가능한 가맹점 목록
    const stores = await query<{ store_id: string }>(
      `SELECT store_id FROM store_staff WHERE user_id = $1
       UNION
       SELECT id AS store_id FROM stores WHERE owner_id = $1`,
      [user.id]
    );
    const storeIds = stores.map(s => s.store_id);

    const payload = {
      userId: user.id,
      role: user.role as 'admin' | 'owner' | 'staff',
      storeIds,
    };

    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id });

    return ok({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    return serverError(err);
  }
}
