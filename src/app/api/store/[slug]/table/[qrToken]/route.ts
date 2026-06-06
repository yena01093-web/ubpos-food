// GET /api/store/[slug]/table/[qrToken]
import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { ok, notFound, serverError } from '@/lib/response';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; qrToken: string } }
) {
  try {
    const table = await queryOne<{
      id: string; table_number: string; status: string; seat_count: number;
    }>(
      `SELECT t.id, t.table_number, t.status, t.seat_count
       FROM tables t
       JOIN stores s ON s.id = t.store_id
       WHERE s.slug = $1 AND t.qr_token = $2 AND t.is_active = true`,
      [params.slug, params.qrToken]
    );

    if (!table) return notFound('유효하지 않은 테이블입니다');

    return ok({ table });
  } catch (err) {
    return serverError(err);
  }
}
