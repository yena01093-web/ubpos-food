// GET /api/migrate — production DB migration runner
// REMOVE THIS FILE after migrations are complete
import { query } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET() {
  try {
    const results: string[] = [];

    // 1. Add image_url to categories if not exists (idempotent)
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT`);
    results.push('categories.image_url: OK');

    // 2. Find store
    const stores = await query<{ id: string }>(
      `SELECT id FROM stores WHERE slug = 'supercrispy-jc'`
    );
    if (stores.length === 0) {
      results.push('store supercrispy-jc not found — skip category migration');
      return ok({ results });
    }
    const storeId = stores[0].id;
    results.push(`store: ${storeId}`);

    // 3. Get current categories
    const cats = await query<{ id: string; name: string; sort_order: number }>(
      `SELECT id, name, sort_order FROM categories WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );
    results.push(`현재 카테고리: ${cats.map(c => `${c.name}(${c.sort_order})`).join(', ')}`);

    // 4. Create 치킨 category if not exists
    let chickenCatId: string;
    const chickenCat = cats.find(c => c.name === '치킨');
    if (!chickenCat) {
      const newCat = await query<{ id: string }>(
        `INSERT INTO categories (store_id, name, sort_order, is_active)
         VALUES ($1, '치킨', 1, true) RETURNING id`,
        [storeId]
      );
      chickenCatId = newCat[0].id;
      results.push('치킨 카테고리 생성 완료');
    } else {
      chickenCatId = chickenCat.id;
      await query(`UPDATE categories SET sort_order = 1 WHERE id = $1`, [chickenCatId]);
      results.push('치킨 sort_order → 1 업데이트');
    }

    // 5. Update sort_orders: 버거=2, 세트=3, 사이드=4
    const orderMap: Record<string, number> = { '버거': 2, '세트': 3, '사이드': 4 };
    for (const cat of cats) {
      if (cat.name in orderMap) {
        await query(`UPDATE categories SET sort_order = $1 WHERE id = $2`, [orderMap[cat.name], cat.id]);
        results.push(`${cat.name} sort_order → ${orderMap[cat.name]}`);
      }
    }

    // 6. 음료 → 음료·소스 rename + sort_order=5
    const drinkCat = cats.find(c => c.name === '음료' || c.name === '음료·소스');
    if (drinkCat) {
      await query(
        `UPDATE categories SET name = '음료·소스', sort_order = 5 WHERE id = $1`,
        [drinkCat.id]
      );
      results.push(`${drinkCat.name} → 음료·소스 (sort_order=5)`);
    } else {
      await query(
        `INSERT INTO categories (store_id, name, sort_order, is_active) VALUES ($1, '음료·소스', 5, true)`,
        [storeId]
      );
      results.push('음료·소스 카테고리 생성');
    }

    // 7. 사이드에서 치킨 메뉴 이동 (이름에 치킨 포함 & 버거 미포함)
    const sideCat = cats.find(c => c.name === '사이드');
    if (sideCat) {
      const moved = await query<{ id: string; name: string }>(
        `UPDATE menus SET category_id = $1
         WHERE store_id = $2
           AND category_id = $3
           AND name ILIKE '%치킨%'
           AND name NOT ILIKE '%버거%'
         RETURNING id, name`,
        [chickenCatId, storeId, sideCat.id]
      );
      if (moved.length > 0) {
        results.push(`사이드 → 치킨 이동: ${moved.map(m => m.name).join(', ')}`);
      } else {
        results.push('사이드에서 이동할 치킨 메뉴 없음 (이미 이동됐거나 해당 없음)');
      }
    }

    // 8. category_id가 null인 치킨 관련 메뉴도 치킨으로
    const nullMoved = await query<{ id: string; name: string }>(
      `UPDATE menus SET category_id = $1
       WHERE store_id = $2
         AND category_id IS NULL
         AND name ILIKE '%치킨%'
         AND name NOT ILIKE '%버거%'
       RETURNING id, name`,
      [chickenCatId, storeId]
    );
    if (nullMoved.length > 0) {
      results.push(`미분류 → 치킨 이동: ${nullMoved.map(m => m.name).join(', ')}`);
    }

    return ok({ results });
  } catch (err) {
    return serverError(err);
  }
}
