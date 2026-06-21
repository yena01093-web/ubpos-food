// POST /api/upload
// FormData: file (image), menuId or categoryId (string)
// Returns: { imageUrl: string }
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { requireAuth } from '@/lib/auth';
import { ok, fail, serverError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const formData   = await req.formData();
    const file       = formData.get('file')       as File   | null;
    const menuId     = formData.get('menuId')     as string | null;
    const categoryId = formData.get('categoryId') as string | null;

    if (!file)              return fail('파일이 없습니다');
    if (!menuId && !categoryId) return fail('menuId 또는 categoryId가 필요합니다');

    if (!file.type.startsWith('image/')) return fail('이미지 파일만 업로드할 수 있습니다');
    if (file.size > 5 * 1024 * 1024)    return fail('파일 크기는 5MB 이하여야 합니다');

    const ext      = file.name.split('.').pop() ?? 'jpg';
    const folder   = menuId ? 'menus' : 'categories';
    const targetId = menuId ?? categoryId;
    const filename = `${folder}/${targetId}.${ext}`;

    const blob = await put(filename, file, { access: 'public' });

    return ok({ imageUrl: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Upload Error]', err);
    return fail(`업로드 실패: ${msg}`, 500);
  }
}
