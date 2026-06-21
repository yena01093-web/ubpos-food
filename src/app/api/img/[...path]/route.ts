// GET /api/img/[...path] — private Vercel Blob → public proxy
import { NextRequest } from 'next/server';
import { head } from '@vercel/blob';

// BLOB_STORE_ID = "store_WPt7gs5zyisfzioz"
// blob domain  = "wpt7gs5zyisfzioz"  (remove "store_", lowercase)
const storeId  = (process.env.BLOB_STORE_ID ?? '').replace('store_', '').toLowerCase();
const BLOB_BASE = `https://${storeId || 'wpt7gs5zyisfzioz'}.private.blob.vercel-storage.com`;

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const blobPath = params.path.join('/');
    const blobUrl  = `${BLOB_BASE}/${blobPath}`;

    const info   = await head(blobUrl);
    const imgRes = await fetch(info.downloadUrl);

    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `blob ${imgRes.status}` }), {
        status: imgRes.status, headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await imgRes.arrayBuffer();
    return new Response(data, {
      headers: {
        'Content-Type': info.contentType ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg, base: BLOB_BASE }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
