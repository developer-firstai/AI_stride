import { leaderboard, xAccount, entryStatement } from '@/lib/ranking';
import { validFilters } from '@/lib/competition';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { db, identity, isAdmin, approved, AppError, fail, payload, todayJST, saveRecords, settings } from '@/lib/league';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        const user = await getChatGPTUser(), xConfigured = !!(settings().X_CLIENT_ID && settings().X_CLIENT_SECRET);
        if (!user)
            return Response.json({ user: null, member: null, rows: [], records: [], admin: false, pending: [], hpConfigured: false, xConfigured, xAccount: null, entry: null, currentEntry: null }, { headers: { 'Cache-Control': 'no-store' } });
        const url = new URL(request.url), month = url.searchParams.get('month') ?? todayJST().slice(0, 7);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
            throw new AppError('年月を確認してください。');
        let filters;
        try {
            filters = validFilters(Object.fromEntries(['role', 'age_band', 'gender', 'region', 'prefecture'].filter(k => url.searchParams.has(k)).map(k => [k, url.searchParams.get(k)])));
        }
        catch (e) {
            throw new AppError((e as Error).message);
        }
        const database = db();
        const [member, administrator, ranking, records, connection, x, entry, currentEntry] = await Promise.all([
            database.prepare('SELECT * FROM members WHERE id=?').bind(user.userId).first(), isAdmin(user.userId), leaderboard(month, filters),
            database.prepare('SELECT date,steps,source FROM steps WHERE user_id=? AND date LIKE ? ORDER BY date DESC').bind(user.userId, month + '-%').all(),
            database.prepare('SELECT expires_at,last_sync FROM connections WHERE user_id=?').bind(user.userId).first(), xAccount(user.userId),
            database.prepare("SELECT * FROM entries WHERE user_id=? AND month=? AND metric='walking'").bind(user.userId, month).first(),
            database.prepare("SELECT * FROM entries WHERE user_id=? AND month=? AND metric='walking'").bind(user.userId, todayJST().slice(0, 7)).first()
        ]);
        const pending = administrator ? (await database.prepare("SELECT m.*,x.username AS x_username FROM members m LEFT JOIN x_accounts x ON x.user_id=m.id ORDER BY m.created_at DESC").all()).results : [];
        return Response.json({ user: { id: user.userId, name: user.displayName }, member, admin: administrator, rows: administrator || member?.status === 'approved' ? ranking : [], records: records.results, pending, connection, hpConfigured: !!(settings().HP_CLIENT_ID && settings().HP_CLIENT_SECRET && settings().TOKEN_ENCRYPTION_KEY), xConfigured, xAccount: x, entry, currentEntry }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return fail(e);
    }
}
export async function POST(request: Request) {
    try {
        const u = await identity(), p = await payload(request);
        if (p.action === 'join') {
            const name = typeof p.name === 'string' ? p.name.trim() : '', company = typeof p.company === 'string' ? p.company.trim() : '';
            if (!name || name.length > 60 || !company || company.length > 100 || !['engineer', 'founder'].includes(p.role) || p.consent !== true)
                throw new AppError('表示名・所属・対象職種と同意を確認してください。');
            let url;
            try {
                url = new URL(p.profile);
            }
            catch {
                throw new AppError('確認できる公開プロフィールURLを入力してください。');
            }
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 500)
                throw new AppError('公開プロフィールのURLを確認してください。');
            const m = await db().prepare('SELECT status FROM members WHERE id=?').bind(u.userId).first();
            if (m && m.status !== 'rejected')
                throw new AppError('参加申請はすでに受け付けています。');
            const entry = await entryStatement(u.userId, p.role, p);
            await db().batch([db().prepare("INSERT INTO members(id,name,company,role,profile,status,created_at) VALUES(?,?,?,?,?,'pending',?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,company=excluded.company,role=excluded.role,profile=excluded.profile,status='pending'").bind(u.userId, name, company, p.role, url.href, new Date().toISOString()), entry]);
            return Response.json({ ok: true });
        }
        if (p.action === 'record') {
            await approved(u.userId);
            if (!Array.isArray(p.records))
                throw new AppError('記録を確認してください。');
            await saveRecords(u.userId, p.records.map((r: {
                date: string;
                steps: number;
            }) => ({ date: r.date, steps: r.steps })), p.csv === true ? 'csv' : 'manual');
            return Response.json({ ok: true, count: p.records.length });
        }
        if (p.action === 'bootstrap') {
            if (typeof p.key !== 'string' || !settings().ADMIN_SETUP_KEY)
                throw new AppError('管理者用の初期設定キーを確認してください。', 403);
            const a = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p.key))), b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(settings().ADMIN_SETUP_KEY)));
            let diff = 0;
            for (let i = 0; i < a.length; i++)
                diff |= a[i] ^ b[i];
            if (diff)
                throw new AppError('初期設定キーが一致しません。', 403);
            await db().prepare('INSERT INTO admins(slot,user_id) VALUES(1,?) ON CONFLICT(slot) DO NOTHING').bind(u.userId).run();
            if (!await isAdmin(u.userId))
                throw new AppError('運営者アカウントは設定済みです。', 403);
            return Response.json({ ok: true });
        }
        if (p.action === 'review') {
            if (!await isAdmin(u.userId))
                throw new AppError('運営者のみ操作できます。', 403);
            if (!['approved', 'rejected'].includes(p.status) || typeof p.id !== 'string')
                throw new AppError('審査結果を確認してください。');
            const result = await db().prepare('UPDATE members SET status=? WHERE id=?').bind(p.status, p.id).run();
            if (!result.meta.changes)
                throw new AppError('申請が見つかりません。', 404);
            return Response.json({ ok: true });
        }
        throw new AppError('操作を確認してください。');
    }
    catch (e) {
        return fail(e);
    }
}
