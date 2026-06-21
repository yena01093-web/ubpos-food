// GET /api/img/[...path] — private Vercel Blob → public proxy
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response('No token', { status: 500 });

  // Token format: vercel_blob_rw_<storeId>_<secret>
  const parts = token.split('_');
  const storeId = parts[3];
  if (!storeId) return new Response('Bad token format', { status: 500 });

  const blobPath = params.path.join('/');
  const blobUrl  = `https://${storeId}.private.blob.vercel-storage.com/${blobPath}`;

  const res = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return new Response('Not found', { status: res.status });

  const data = await res.arrayBuffer();
  return new Response(data, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
