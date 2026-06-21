// GET /api/img/[...path] — private Vercel Blob → public proxy
// Uses @vercel/blob head() (which uses BLOB_STORE_ID + Vercel system auth)
// then fetches the signed downloadUrl server-side and streams it to the client
import { NextRequest } from 'next/server';
import { head } from '@vercel/blob';

const STORE_ID = process.env.BLOB_STORE_ID ?? 'wpt7gs5zyisfzioz';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const blobPath = params.path.join('/');
    const blobUrl  = `https://${STORE_ID}.private.blob.vercel-storage.com/${blobPath}`;

    // head() uses Vercel's internal auth (BLOB_STORE_ID mechanism)
    const info = await head(blobUrl);

    // Fetch downloadUrl server-side (within Vercel network - avoids public 403)
    const imgRes = await fetch(info.downloadUrl);
    if (!imgRes.ok) {
      return new Response(
        JSON.stringify({ error: `download ${imgRes.status}`, url: info.downloadUrl.substring(0, 80) }),
        { status: imgRes.status, headers: { 'Content-Type': 'application/json' } }
      );
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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
