// PATCH /api/dashboard/category/[categoryId]
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, fail, serverError } from '@/lib/response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const { image_url } = body;

    if (image_url === undefined) return fail('image_url이 필요합니다');

    const category = await queryOne(
      `UPDATE categories SET image_url = $1 WHERE id = $2
       RETURNING id, name, image_url`,
      [image_url, params.categoryId]
    );

    return ok({ category });
  } catch (err) {
    return serverError(err);
  }
}
