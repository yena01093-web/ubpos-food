// GET  /api/setup — DB의 이메일 목록 반환 (비밀번호 제외)
// POST /api/setup — 비밀번호 재설정
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';
import { ok, fail, serverError } from '@/lib/response';

export async function GET() {
  try {
    const users = await query<{ email: string; role: string; is_active: boolean }>(
      'SELECT email, role, is_active FROM users'
    );
    return ok({ users });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json();
    if (!email || !newPassword) return fail('email, newPassword 필수');

    const hash = await bcrypt.hash(newPassword, 12);
    const user = await queryOne<{ id: string }>(
      `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id`,
      [hash, email]
    );
    if (!user) return fail('해당 이메일 없음', 404);

    return ok({ updated: user.id });
  } catch (err) {
    return serverError(err);
  }
}
