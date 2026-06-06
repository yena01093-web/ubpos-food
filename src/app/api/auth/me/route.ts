// GET /api/auth/me
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const user = await queryOne<{
      id: string; email: string; name: string; phone: string | null; role: string;
    }>(
      `SELECT id, email, name, phone, role FROM users WHERE id = $1`,
      [auth!.userId]
    );

    return ok({ user, storeIds: auth!.storeIds });
  } catch (err) {
    return serverError(err);
  }
}
