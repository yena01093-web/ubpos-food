// GET /api/debug-categories — 현재 카테고리/메뉴 현황 확인용 (임시)
import { query } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET() {
  try {
    const stores = await query<{ id: string; slug: string; name: string }>(
      `SELECT id, slug, name FROM stores WHERE slug = 'supercrispy-jc'`
    );
    if (stores.length === 0) return ok({ error: 'store not found' });

    const storeId = stores[0].id;

    // 모든 카테고리 (비활성 포함)
    const categories = await query<{ id: string; name: string; sort_order: number; is_active: boolean }>(
      `SELECT id, name, sort_order, is_active FROM categories
       WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );

    // 모든 메뉴 (비활성 포함)
    const menus = await query<{ id: string; name: string; category_id: string | null; is_active: boolean }>(
      `SELECT id, name, category_id, is_active FROM menus
       WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );

    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      menus: menus
        .filter(m => m.category_id === cat.id)
        .map(m => `${m.name}${m.is_active ? '' : ' [비활성]'}`),
    }));

    // 카테고리 없는 메뉴 (미분류)
    const catIds = new Set(categories.map(c => c.id));
    const orphaned = menus
      .filter(m => m.category_id === null || !catIds.has(m.category_id!))
      .map(m => `${m.name} (cat_id=${m.category_id})${m.is_active ? '' : ' [비활성]'}`);

    return ok({ categories: result, orphaned_menus: orphaned });
  } catch (err) {
    return serverError(err);
  }
}
