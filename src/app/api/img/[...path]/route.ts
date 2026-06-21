// GET /api/img/[...path] — private Vercel Blob → public proxy
// Uses x-vercel-oidc-token (injected by Vercel into each request header)
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

// BLOB_STORE_ID = "store_WPxxx" → storeId = "WPxxx" (no "store_" prefix)
const rawStoreId    = process.env.BLOB_STORE_ID ?? '';
const normalStoreId = rawStoreId.startsWith('store_') ? rawStoreId.slice(6) : rawStoreId;
const blobDomain    = normalStoreId.toLowerCase() || 'wpt7gs5zyisfzioz';
const BLOB_BASE     = `https://${blobDomain}.private.blob.vercel-storage.com`;

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // OIDC token is injected by Vercel into every serverless request header
    const hdrs      = await headers();
    const oidcToken = hdrs.get('x-vercel-oidc-token') ?? '';

    const blobPath = params.path.join('/');
    const blobUrl  = `${BLOB_BASE}/${blobPath}`;

    if (!oidcToken) {
      return new Response(
        JSON.stringify({ error: 'No OIDC token in headers', blobUrl }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch(blobUrl, {
      headers: {
        Authorization:          `Bearer ${oidcToken}`,
        'x-vercel-blob-store-id': normalStoreId,
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `blob ${res.status}`, blobUrl }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.arrayBuffer();
    return new Response(data, {
      headers: {
        'Content-Type':  res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
