// GET /api/store/[slug]/menu
import { NextRequest } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { ok, notFound, serverError } from '@/lib/response';

export const revalidate = 60; // 60초 캐시

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 1~2. 가맹점 + 배너 병렬 조회
    const [store, banners] = await Promise.all([
      queryOne<{
        id: string; name: string; logo_url: string | null;
        is_open: boolean; notice: string | null; phone: string | null;
      }>(
        `SELECT id, name, logo_url, is_open, notice, phone
         FROM stores WHERE slug = $1`,
        [params.slug]
      ),
      query<{ id: string; image_url: string; sort_order: number }>(
        `SELECT id, image_url, sort_order FROM banners
         WHERE store_id = (SELECT id FROM stores WHERE slug = $1)
         AND is_active = true ORDER BY sort_order`,
        [params.slug]
      ),
    ]);

    if (!store) return notFound('가맹점을 찾을 수 없습니다');

    // 3~4. 카테고리 + 메뉴 병렬 조회
    const [categories, menus] = await Promise.all([
      query<{ id: string; name: string; sort_order: number; image_url: string | null }>(
        `SELECT id, name, sort_order, image_url
         FROM categories
         WHERE store_id = $1 AND is_active = true
         ORDER BY sort_order`,
        [store.id]
      ),
      query<{
        menu_id: string; menu_name: string; description: string | null;
        price: number; image_url: string | null; is_soldout: boolean;
        sort_order: number; category_id: string | null;
        og_id: string | null; og_name: string | null;
        og_required: boolean | null; og_max: number | null; og_sort: number | null;
        opt_id: string | null; opt_name: string | null;
        opt_extra: number | null; opt_soldout: boolean | null; opt_sort: number | null;
      }>(
        `SELECT
           m.id           AS menu_id,
           m.name         AS menu_name,
           m.description,
           m.price,
           m.image_url,
           m.is_soldout,
           m.sort_order,
           m.category_id,
           og.id          AS og_id,
           og.name        AS og_name,
           og.is_required AS og_required,
           og.max_select  AS og_max,
           og.sort_order  AS og_sort,
           o.id           AS opt_id,
           o.name         AS opt_name,
           o.extra_price  AS opt_extra,
           o.is_soldout   AS opt_soldout,
           o.sort_order   AS opt_sort
         FROM menus m
         LEFT JOIN option_groups og ON og.menu_id = m.id
         LEFT JOIN options o        ON o.group_id = og.id
         WHERE m.store_id = $1 AND m.is_active = true
         ORDER BY m.sort_order, og.sort_order, o.sort_order`,
        [store.id]
      ),
    ]);

    // 메뉴 조립
    const menuMap = new Map<string, any>();
    for (const row of menus) {
      if (!menuMap.has(row.menu_id)) {
        menuMap.set(row.menu_id, {
          id: row.menu_id, name: row.menu_name,
          description: row.description, price: row.price,
          image_url: row.image_url, is_soldout: row.is_soldout,
          sort_order: row.sort_order, category_id: row.category_id,
          option_groups: new Map(),
        });
      }
      const menu = menuMap.get(row.menu_id)!;
      if (row.og_id && !menu.option_groups.has(row.og_id)) {
        menu.option_groups.set(row.og_id, {
          id: row.og_id, name: row.og_name!,
          is_required: row.og_required!, max_select: row.og_max!,
          sort_order: row.og_sort!, options: [],
        });
      }
      if (row.og_id && row.opt_id) {
        menu.option_groups.get(row.og_id)!.options.push({
          id: row.opt_id, name: row.opt_name!,
          extra_price: row.opt_extra!, is_soldout: row.opt_soldout!,
          sort_order: row.opt_sort!,
        });
      }
    }

    const result = categories.map(cat => ({
      ...cat,
      menus: [...menuMap.values()]
        .filter(m => m.category_id === cat.id)
        .map(m => ({ ...m, option_groups: [...m.option_groups.values()] }))
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    const response = ok({ store, categories: result, banners });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;

  } catch (err) {
    return serverError(err);
  }
}
