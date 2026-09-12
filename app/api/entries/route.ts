import { identity, payload, approved, fail, db, AppError } from '@/lib/league';
import { entryStatement } from '@/lib/ranking';
export async function POST(request: Request) { try {
    const u = await identity(), p = await payload(request), m = await approved(u.userId);
    const statement = await entryStatement(u.userId, String(m.role), p);
    const result = await statement.run();
    if (!result.meta.changes)
        throw new AppError('今月はすでにエントリー済みです。参加区分は月内に変更できません。', 409);
    return Response.json({ ok: true });
}
catch (e) {
    return fail(e);
} }
