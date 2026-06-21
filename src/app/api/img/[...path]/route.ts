// GET /api/img/[...path] — private Vercel Blob → public proxy
import { NextRequest } from 'next/server';
import { head } from '@vercel/blob';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const storeId  = process.env.BLOB_STORE_ID ?? '';
    const blobPath = params.path.join('/');

    // Debug: show the constructed URL and store ID prefix
    const blobUrl = `https://${storeId}.private.blob.vercel-storage.com/${blobPath}`;

    // Test: add diagnostics before calling head()
    const diag = {
      storeIdLength: storeId.length,
      storeIdPrefix: storeId.substring(0, 6),
      blobUrlPrefix:  blobUrl.substring(0, 60),
    };

    const info = await head(blobUrl);

    const imgRes = await fetch(info.downloadUrl);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `download ${imgRes.status}` }), {
        status: imgRes.status, headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await imgRes.arrayBuffer();
    return new Response(data, {
      headers: {
        'Content-Type': info.contentType ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Debug': JSON.stringify(diag),
      },
    });
  } catch (err) {
    const storeId = process.env.BLOB_STORE_ID ?? '';
    const blobPath = params.path.join('/');
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({
      error: msg,
      storeIdLength: storeId.length,
      storeIdPrefix: storeId.substring(0, 8),
      blobPath,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
