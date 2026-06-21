// GET /api/img/[...path] — private Vercel Blob → public proxy
import { NextRequest } from 'next/server';
import { head } from '@vercel/blob';

// BLOB_STORE_ID = "store_WP..." → domain = "wpt7gs5zy..." (remove store_, lowercase)
const rawStoreId = process.env.BLOB_STORE_ID ?? '';
const blobDomain = rawStoreId.replace(/^store_/i, '').toLowerCase() || 'wpt7gs5zyisfzioz';
const BLOB_BASE  = `https://${blobDomain}.private.blob.vercel-storage.com`;

// @vercel/blob v2: uses VERCEL_OIDC_TOKEN + BLOB_STORE_ID when no BLOB_READ_WRITE_TOKEN
const OIDC_TOKEN = process.env.VERCEL_OIDC_TOKEN ?? '';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const blobPath = params.path.join('/');
    const blobUrl  = `${BLOB_BASE}/${blobPath}`;

    // head() uses OIDC internally — get the download URL
    const info = await head(blobUrl);

    // Fetch blob content server-side using OIDC token
    const fetchHeaders: Record<string, string> = {};
    if (OIDC_TOKEN) {
      fetchHeaders['Authorization'] = `Bearer ${OIDC_TOKEN}`;
      fetchHeaders['x-vercel-store-id'] = rawStoreId;
    }

    const imgRes = await fetch(info.url, { headers: fetchHeaders });

    if (!imgRes.ok) {
      // Fallback: try downloadUrl
      const imgRes2 = await fetch(info.downloadUrl, { headers: fetchHeaders });
      if (!imgRes2.ok) {
        return new Response(
          JSON.stringify({ error: `fetch ${imgRes.status}/${imgRes2.status}`, hasOidc: !!OIDC_TOKEN }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const data2 = await imgRes2.arrayBuffer();
      return new Response(data2, {
        headers: { 'Content-Type': info.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const data = await imgRes.arrayBuffer();
    return new Response(data, {
      headers: { 'Content-Type': info.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg, blobDomain, hasOidc: !!OIDC_TOKEN }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
