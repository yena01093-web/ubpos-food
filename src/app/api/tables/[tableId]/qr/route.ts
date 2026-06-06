// POST /api/tables/[tableId]/qr  — QR 토큰 재발급
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, forbidden, notFound, serverError } from '@/lib/response';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const table = await queryOne<{ id: string; store_id: string; table_number: string }>(
      `SELECT id, store_id, table_number FROM tables WHERE id = $1`, [params.tableId]
    );
    if (!table) return notFound('테이블을 찾을 수 없습니다');
    if (!requireStoreAccess(auth!, table.store_id)) return forbidden();

    const newToken = randomUUID();
    await queryOne(
      `UPDATE tables SET qr_token = $1 WHERE id = $2 RETURNING qr_token`,
      [newToken, table.id]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const store  = await queryOne<{ slug: string }>(
      `SELECT slug FROM stores WHERE id = $1`, [table.store_id]
    );

    return ok({
      tableId:      table.id,
      tableNumber:  table.table_number,
      qrToken:      newToken,
      qrUrl:        `${appUrl}/order/${store?.slug}/${newToken}`,
    });
  } catch (err) {
    return serverError(err);
  }
}
