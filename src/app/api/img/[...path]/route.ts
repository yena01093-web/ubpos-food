// GET /api/img/[...path] — private Vercel Blob → public proxy
import { NextRequest } from 'next/server';

const STORE_ID = 'wpt7gs5zyisfzioz';

// @vercel/blob checks these env var names in order
const TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ??
  process.env.VERCEL_BLOB_READ_WRITE_TOKEN ??
  '';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Debug: find all BLOB-related env vars (names only, no values)
  const blobEnvKeys = Object.keys(process.env).filter(k =>
    k.toUpperCase().includes('BLOB')
  );

  if (!TOKEN) {
    return new Response(
      JSON.stringify({ error: 'No token', blobEnvKeys }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const blobPath = params.path.join('/');
    const blobUrl  = `https://${STORE_ID}.private.blob.vercel-storage.com/${blobPath}`;

    const res = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Blob fetch ${res.status}`, blobUrl }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.arrayBuffer();
    return new Response(data, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
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
