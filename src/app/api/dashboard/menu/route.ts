// GET  /api/dashboard/menu?storeId=
// POST /api/dashboard/menu
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, fail, forbidden, serverError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) return fail('storeId가 필요합니다');
    if (!requireStoreAccess(auth!, storeId)) return forbidden();

    const store = await queryOne<{ slug: string }>(
      `SELECT slug FROM stores WHERE id = $1`, [storeId]
    );
    const categories = await query(
      `SELECT id, name, sort_order, image_url FROM categories
       WHERE store_id = $1 AND is_active = true ORDER BY sort_order`,
      [storeId]
    );
    const menus = await query(
      `SELECT id, category_id, name, description, price,
              image_url, is_soldout, is_active, sort_order, tags
       FROM menus WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );

    return ok({ categories, menus, storeSlug: store?.slug ?? '' });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const { storeId, categoryId, name, description, price, imageUrl, tags } = body;

    if (!storeId || !name || price === undefined) {
      return fail('storeId, name, price는 필수입니다');
    }
    if (!requireStoreAccess(auth!, storeId)) return forbidden();

    const menu = await queryOne(
      `INSERT INTO menus (store_id, category_id, name, description, price, image_url, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, price`,
      [storeId, categoryId ?? null, name, description ?? null, price, imageUrl ?? null, tags ?? []]
    );

    return ok({ menu }, 201);
  } catch (err) {
    return serverError(err);
  }
}
