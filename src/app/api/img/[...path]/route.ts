// GET /api/img/[...path] — private Vercel Blob → public proxy (signed redirect)
import { NextRequest } from 'next/server';
import { head } from '@vercel/blob';

// Store ID from private blob URL: wpt7gs5zyisfzioz.private.blob.vercel-storage.com
const STORE_ID = 'wpt7gs5zyisfzioz';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const blobPath = params.path.join('/');
    const blobUrl  = `https://${STORE_ID}.private.blob.vercel-storage.com/${blobPath}`;

    const info = await head(blobUrl);
    return Response.redirect(info.downloadUrl, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
