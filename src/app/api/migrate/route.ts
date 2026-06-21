// GET /api/migrate — production DB migration runner
// REMOVE THIS FILE after migrations are complete
import { query } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET() {
  try {
    const results: string[] = [];

    // Add image_url to categories if not exists
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT`);
    results.push('categories.image_url: OK');

    return ok({ results });
  } catch (err) {
    return serverError(err);
  }
}
