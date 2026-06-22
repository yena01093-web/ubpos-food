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

    const categories = await query<{ id: string; name: string; sort_order: number }>(
      `SELECT id, name, sort_order FROM categories
       WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );

    const menus = await query<{ id: string; name: string; category_id: string | null; sort_order: number }>(
      `SELECT id, name, category_id, sort_order FROM menus
       WHERE store_id = $1 AND is_active = true ORDER BY sort_order`,
      [storeId]
    );

    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      sort_order: cat.sort_order,
      menus: menus
        .filter(m => m.category_id === cat.id)
        .map(m => m.name),
    }));

    const uncategorized = menus
      .filter(m => m.category_id === null || !categories.find(c => c.id === m.category_id))
      .map(m => m.name);

    return ok({ categories: result, uncategorized });
  } catch (err) {
    return serverError(err);
  }
}
