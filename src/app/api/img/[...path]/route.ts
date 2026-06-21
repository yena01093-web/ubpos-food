// GET /api/img/[...path] — private Vercel Blob → public proxy (via signed redirect)
import { NextRequest } from 'next/server';
import { head } from '@vercel/blob';

// Store ID extracted from blob download URLs seen at runtime
const BLOB_STORE_BASE = process.env.BLOB_STORE_BASE_URL ?? '';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const blobPath = params.path.join('/');

    // Derive store base from token if not set explicitly
    const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';
    const parts  = token.split('_');
    const storeId = BLOB_STORE_BASE || (parts.length >= 4 ? parts[3] : '');

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'No store ID', tokenParts: parts.length, hasBlobStoreBase: !!BLOB_STORE_BASE }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const blobUrl = `https://${storeId}.private.blob.vercel-storage.com/${blobPath}`;
    const info    = await head(blobUrl);

    // Redirect to signed download URL (publicly accessible, time-limited)
    return Response.redirect(info.downloadUrl, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
