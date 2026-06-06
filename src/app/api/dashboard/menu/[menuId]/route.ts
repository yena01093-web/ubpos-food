// PATCH /api/dashboard/menu/[menuId]
// DELETE /api/dashboard/menu/[menuId]
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { ok, forbidden, notFound, serverError } from '@/lib/response';

async function getMenuStore(menuId: string) {
  return queryOne<{ id: string; store_id: string }>(
    `SELECT id, store_id FROM menus WHERE id = $1`, [menuId]
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { menuId: string } }
) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const menu = await getMenuStore(params.menuId);
    if (!menu) return notFound('메뉴를 찾을 수 없습니다');
    if (!requireStoreAccess(auth!, menu.store_id)) return forbidden();

    const body = await req.json();
    const fields: string[] = [];
    const values: unknown[] = [];

    const allowed = ['name','description','price','image_url','is_soldout','is_active','category_id','sort_order'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        values.push(body[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }
    if (!fields.length) return ok({ message: '변경 없음' });

    values.push(params.menuId);
    const updated = await queryOne(
      `UPDATE menus SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, name, is_soldout`,
      values
    );

    return ok({ menu: updated });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { menuId: string } }
) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const menu = await getMenuStore(params.menuId);
    if (!menu) return notFound('메뉴를 찾을 수 없습니다');
    if (!requireStoreAccess(auth!, menu.store_id)) return forbidden();

    // 소프트 삭제 (주문 이력 보존)
    await query(`UPDATE menus SET is_active = false WHERE id = $1`, [params.menuId]);

    return ok({ deleted: params.menuId });
  } catch (err) {
    return serverError(err);
  }
}
