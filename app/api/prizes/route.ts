import { db, identity, isAdmin, payload, fail, AppError, todayJST } from '@/lib/league';
import { leaderboard } from '@/lib/ranking';
import { validFilters, Filters } from '@/lib/competition';
import { hash, seal, unseal } from '@/lib/crypto';
export const dynamic = 'force-dynamic';
type Prize = {
    id: string;
    month: string;
    metric: string;
    title: string;
    provider: string;
    description: string;
    delivery: string;
    filters: string;
    top_n: number;
    status: string;
};
async function admin(id: string) { if (!await isAdmin(id))
    throw new AppError('運営者のみ操作できます。', 403); }
async function prize(id: unknown) { if (typeof id !== 'string')
    throw new AppError('賞品を選択してください。'); const p = await db().prepare('SELECT * FROM prizes WHERE id=?').bind(id).first<Prize>(); if (!p)
    throw new AppError('賞品が見つかりません。', 404); return p; }
async function candidates(p: Prize) { if (p.month >= todayJST().slice(0, 7))
    throw new AppError('入賞者の確定は対象月が終了してから行えます。'); return (await leaderboard(p.month, JSON.parse(p.filters) as Filters)).filter(r => r.rank <= p.top_n && r.total > 0); }
export async function GET(request: Request) {
    try {
        const u = await identity(), administrator = await isAdmin(u.userId), params = new URL(request.url).searchParams;
        if (params.has('claim')) {
            await admin(u.userId);
            const id = params.get('claim')!;
            const award = await db().prepare('SELECT claim FROM awards WHERE id=?').bind(id).first<{
                claim: string | null;
            }>();
            if (!award?.claim)
                throw new AppError('受取情報はまだ登録されていません。', 404);
            return Response.json({ claim: JSON.parse(await unseal(award.claim, id)) }, { headers: { 'Cache-Control': 'no-store' } });
        }
        const month = params.get('month') ?? todayJST().slice(0, 7);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
            throw new AppError('対象月を選択してください。');
        const rules = await db().prepare("SELECT * FROM prizes WHERE month=? AND metric='walking' AND (?=1 OR status!='draft') ORDER BY created_at").bind(month, administrator ? 1 : 0).all<Prize>();
        const result = await db().prepare("SELECT a.id,a.prize_id,a.name,a.rank,a.score,a.status,a.created_at,a.sent_at,a.received_at,p.title,p.provider,p.delivery,p.month,CASE WHEN a.user_id=? THEN 1 ELSE 0 END AS is_mine FROM awards a JOIN prizes p ON p.id=a.prize_id WHERE p.month=? ORDER BY a.rank,a.created_at").bind(u.userId, month).all();
        return Response.json({ prizes: rules.results.map(p => ({ ...p, filters: JSON.parse(p.filters) })), awards: administrator || !!(await db().prepare("SELECT id FROM members WHERE id=? AND status='approved'").bind(u.userId).first()) ? result.results : result.results.filter(a => a.is_mine === 1), admin: administrator }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return fail(e);
    }
}
export async function POST(request: Request) {
    try {
        const u = await identity(), p = await payload(request);
        if (p.action === 'save') {
            await admin(u.userId);
            if (p.metric && p.metric !== 'walking')
                throw new AppError('睡眠部門の賞品設定は、実証後の次フェーズで利用可能になります。');
            if (typeof p.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month) || p.month < todayJST().slice(0, 7))
                throw new AppError('当月以降を選択してください。');
            const title = typeof p.title === 'string' ? p.title.trim() : '', provider = typeof p.provider === 'string' ? p.provider.trim() : '', description = typeof p.description === 'string' ? p.description.trim() : '';
            if (!title || title.length > 100 || !provider || provider.length > 100 || !description || description.length > 1000 || !Number.isInteger(p.top_n) || p.top_n < 1 || p.top_n > 100 || !['postal', 'digital'].includes(p.delivery))
                throw new AppError('賞品名・提供企業・内容・対象順位・受取方法を確認してください。');
            let filters;
            try {
                filters = validFilters(p.filters ?? {});
            }
            catch (e) {
                throw new AppError((e as Error).message);
            }
            const id = typeof p.id === 'string' ? p.id : crypto.randomUUID();
            const old = await db().prepare('SELECT status FROM prizes WHERE id=?').bind(id).first();
            if (old && old.status !== 'draft')
                throw new AppError('公開後の賞品条件は変更できません。');
            const result = await db().prepare("INSERT INTO prizes(id,month,metric,title,provider,description,delivery,filters,top_n,status,created_at) VALUES(?,?,'walking',?,?,?,?,?,?,'draft',?) ON CONFLICT(id) DO UPDATE SET month=excluded.month,title=excluded.title,provider=excluded.provider,description=excluded.description,delivery=excluded.delivery,filters=excluded.filters,top_n=excluded.top_n WHERE prizes.status='draft'").bind(id, p.month, title, provider, description, p.delivery, JSON.stringify(filters), p.top_n, new Date().toISOString()).run();
            if (!result.meta.changes)
                throw new AppError('賞品条件が更新されています。再読み込みしてください。', 409);
            return Response.json({ ok: true, id });
        }
        if (p.action === 'publish') {
            await admin(u.userId);
            const rule = await prize(p.id);
            if (rule.month < todayJST().slice(0, 7))
                throw new AppError('過去月に賞品条件を新規公開することはできません。');
            if (p.confirm !== true)
                throw new AppError('同順位の方を含む入賞者全員への提供条件を確認してください。');
            const r = await db().prepare("UPDATE prizes SET status='published' WHERE id=? AND status='draft'").bind(rule.id).run();
            if (!r.meta.changes)
                throw new AppError('公開済みです。', 409);
            return Response.json({ ok: true });
        }
        if (p.action === 'preview' || p.action === 'finalize') {
            await admin(u.userId);
            const rule = await prize(p.id);
            if (rule.status !== 'published')
                throw new AppError('募集条件を公開した賞品のみ集計できます。');
            const rows = await candidates(rule);
            const signature = await hash(JSON.stringify(rows.map(r => ({ id: r.id, rank: r.rank, total: r.total, days: r.days, verified: r.verified_days }))));
            if (p.action === 'preview')
                return Response.json({ rows, signature });
            if (!rows.length)
                throw new AppError('対象者がいません。');
            if (rows.length > 200)
                throw new AppError('候補者が200名を超えています。運営者向けの一括処理が必要です。');
            if (p.verified !== true || p.signature !== signature)
                throw new AppError('最新の候補者と記録を確認してから確定してください。', 409);
            const now = new Date().toISOString();
            const result = await db().batch([...rows.map(r => db().prepare("INSERT INTO awards(id,prize_id,user_id,name,rank,score,status,confirmed_by,created_at) SELECT ?,?,?,?,?,?,'confirmed',?,? WHERE EXISTS(SELECT 1 FROM prizes WHERE id=? AND status='published') ON CONFLICT(id) DO NOTHING").bind(rule.id + ':' + r.id, rule.id, r.id, r.name, r.rank, r.total, u.userId, now, rule.id)), db().prepare("UPDATE prizes SET status='finalized',finalized_at=? WHERE id=? AND status='published'").bind(now, rule.id)]);
            if (!result[result.length - 1].meta.changes)
                throw new AppError('すでに入賞者が確定しています。', 409);
            return Response.json({ ok: true, count: rows.length });
        }
        if (p.action === 'claim') {
            if (typeof p.id !== 'string' || p.consent !== true)
                throw new AppError('受取情報の利用に同意してください。');
            const award = await db().prepare('SELECT a.user_id,a.status,p.delivery FROM awards a JOIN prizes p ON p.id=a.prize_id WHERE a.id=?').bind(p.id).first<{
                user_id: string;
                status: string;
                delivery: string;
            }>();
            if (!award || award.user_id !== u.userId)
                throw new AppError('ご自身の入賞分のみ申請できます。', 403);
            if (!['confirmed', 'claimed'].includes(award.status))
                throw new AppError('発送済みの受取情報は変更できません。');
            const name = typeof p.name === 'string' ? p.name.trim() : '', email = typeof p.email === 'string' ? p.email.trim() : '', address = typeof p.address === 'string' ? p.address.trim() : '';
            if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || (award.delivery === 'postal' && (!address || address.length > 500)))
                throw new AppError('宛名・メールアドレスと、配送の場合は郵便番号を含む住所を入力してください。');
            const claim = await seal(JSON.stringify({ name, email, address: award.delivery === 'postal' ? address : '', consentedAt: new Date().toISOString() }), p.id);
            const result = await db().prepare("UPDATE awards SET claim=?,status='claimed' WHERE id=? AND user_id=? AND status IN ('confirmed','claimed')").bind(claim, p.id, u.userId).run();
            if (!result.meta.changes)
                throw new AppError('発送状況が変更されています。', 409);
            return Response.json({ ok: true });
        }
        if (p.action === 'sent') {
            await admin(u.userId);
            const r = await db().prepare("UPDATE awards SET status='sent',sent_at=? WHERE id=? AND status='claimed'").bind(new Date().toISOString(), p.id).run();
            if (!r.meta.changes)
                throw new AppError('受取申請済みの賞品だけを発送済みにできます。');
            return Response.json({ ok: true });
        }
        if (p.action === 'received') {
            const r = await db().prepare("UPDATE awards SET status='received',received_at=? WHERE id=? AND user_id=? AND status='sent'").bind(new Date().toISOString(), p.id, u.userId).run();
            if (!r.meta.changes)
                throw new AppError('ご自身の発送済み賞品だけを受取完了にできます。');
            return Response.json({ ok: true });
        }
        throw new AppError('操作を確認してください。');
    }
    catch (e) {
        return fail(e);
    }
}
