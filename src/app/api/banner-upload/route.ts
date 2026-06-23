// GET  /api/banner-upload?secret=xxx  → 현재 배너 목록
// POST /api/banner-upload?secret=xxx  FormData: file, slot(1~10) → Vercel Blob 업로드 + DB 저장
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { query, queryOne } from '@/lib/db';
import { ok, fail, serverError } from '@/lib/response';

const SECRET = 'ubpos2024bulk';

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET)
    return new Response('Unauthorized', { status: 401 });
  try {
    const store = await queryOne<{ id: string }>(
      `SELECT id FROM stores WHERE slug = 'supercrispy-jc'`
    );
    if (!store) return fail('store not found');
    const banners = await query<{ id: string; image_url: string; sort_order: number }>(
      `SELECT id, image_url, sort_order FROM banners WHERE store_id = $1 AND is_active = true ORDER BY sort_order`,
      [store.id]
    );
    return ok({ banners });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET)
    return new Response('Unauthorized', { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slot = Number(formData.get('slot'));

    if (!file)           return fail('file 필요');
    if (!slot || slot < 1) return fail('slot 필요 (1~10)');

    const store = await queryOne<{ id: string }>(
      `SELECT id FROM stores WHERE slug = 'supercrispy-jc'`
    );
    if (!store) return fail('store not found');

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `banners/${slot}.${ext}`;
    await put(filename, file, { access: 'private', allowOverwrite: true });

    const imageUrl = `/api/img/${filename}`;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM banners WHERE store_id = $1 AND sort_order = $2`,
      [store.id, slot]
    );
    if (existing) {
      await query(`UPDATE banners SET image_url = $1, is_active = true WHERE id = $2`, [imageUrl, existing.id]);
    } else {
      await query(
        `INSERT INTO banners (store_id, image_url, sort_order, is_active) VALUES ($1, $2, $3, true)`,
        [store.id, imageUrl, slot]
      );
    }

    return ok({ slot, imageUrl });
  } catch (err) {
    return serverError(err);
  }
}
