// GET  /api/bulk-upload?secret=xxx  → 전체 메뉴 목록 반환
// POST /api/bulk-upload?secret=xxx  FormData: file, menuId → Vercel Blob 업로드 + DB 갱신
// 임시 엔드포인트 — 이미지 업로드 완료 후 삭제할 것
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { query, queryOne } from '@/lib/db';
import { ok, fail, serverError } from '@/lib/response';

const SECRET = 'ubpos2024bulk';

function checkSecret(req: NextRequest) {
  return req.nextUrl.searchParams.get('secret') === SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) return new Response('Unauthorized', { status: 401 });
  try {
    const menus = await query<{ id: string; name: string; image_url: string | null }>(
      `SELECT m.id, m.name, m.image_url
       FROM menus m
       JOIN stores s ON s.id = m.store_id
       WHERE s.slug = 'supercrispy-jc'
       ORDER BY m.name`
    );
    return ok({ menus });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) return new Response('Unauthorized', { status: 401 });
  try {
    const formData = await req.formData();
    const file   = formData.get('file')   as File   | null;
    const menuId = formData.get('menuId') as string | null;

    if (!file)   return fail('file 필요');
    if (!menuId) return fail('menuId 필요');

    const menu = await queryOne<{ id: string; name: string }>(
      `SELECT m.id, m.name FROM menus m
       JOIN stores s ON s.id = m.store_id
       WHERE s.slug = 'supercrispy-jc' AND m.id = $1`,
      [menuId]
    );
    if (!menu) return fail(`메뉴 없음: ${menuId}`);

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `menus/${menu.id}.${ext}`;
    await put(filename, file, { access: 'private', allowOverwrite: true });

    const imageUrl = `/api/img/${filename}`;
    await query(`UPDATE menus SET image_url = $1 WHERE id = $2`, [imageUrl, menu.id]);

    return ok({ name: menu.name, imageUrl });
  } catch (err) {
    return serverError(err);
  }
}
