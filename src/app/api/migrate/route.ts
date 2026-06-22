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

    // 7. 치킨 ↔ 사이드 카테고리 내용 스왑
    //    (치킨에 사이드 메뉴가, 사이드에 치킨 메뉴가 들어간 상태 수정)
    const sideCat = cats.find(c => c.name === '사이드');
    if (sideCat) {
      const swapped = await query<{ id: string; name: string }>(
        `UPDATE menus
         SET category_id = CASE
           WHEN category_id = $1 THEN $2
           WHEN category_id = $2 THEN $1
           ELSE category_id
         END
         WHERE store_id = $3
           AND category_id IN ($1, $2)
         RETURNING id, name, category_id`,
        [chickenCatId, sideCat.id, storeId]
      );
      results.push(`치킨 ↔ 사이드 스왑 완료: ${swapped.length}개 메뉴`);
      results.push(swapped.map(m => m.name).join(', '));
    }

    return ok({ results });
  } catch (err) {
    return serverError(err);
  }
}
