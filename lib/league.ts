import { runtimeEnv } from '@/lib/runtime-env';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const settings = () => runtimeEnv as unknown as {
    DB: D1Database;
    ADMIN_SETUP_KEY?: string;
    TOKEN_ENCRYPTION_KEY?: string;
    HP_CLIENT_ID?: string;
    HP_CLIENT_SECRET?: string;
    X_CLIENT_ID?: string;
    X_CLIENT_SECRET?: string;
};
export function db() { if (!settings().DB)
    throw new Error('記録サービスを準備中です。しばらくしてから再度お試しください。'); return settings().DB; }
export function todayJST() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
export async function identity() { const u = await getChatGPTUser(); if (!u)
    throw new AppError('ログインしてください。', 401); return u; }
export class AppError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export function fail(e: unknown) { if (e instanceof AppError)
    return Response.json({ error: e.message }, { status: e.status }); console.error('League operation failed', e instanceof Error ? e.name : 'error'); return Response.json({ error: 'データを読み込み・保存できませんでした。入力を残したまま再試行できます。' }, { status: 503 }); }
export function sameOrigin(r: Request) { if (r.headers.get('origin') !== new URL(r.url).origin)
    throw new AppError('このサイトの画面から操作してください。', 403); }
export async function payload(r: Request) { sameOrigin(r); const raw = await r.text(); if (raw.length > 40000)
    throw new AppError('一度に送信できるデータ量を超えています。'); try {
    return JSON.parse(raw);
}
catch {
    throw new AppError('入力データを確認してください。');
} }
export async function approved(id: string) { const m = await db().prepare('SELECT * FROM members WHERE id=?').bind(id).first(); if (!m || m.status !== 'approved')
    throw new AppError('運営者の参加承認後に利用できます。', 403); return m; }
export async function isAdmin(id: string) { return !!await db().prepare('SELECT user_id FROM admins WHERE user_id=?').bind(id).first(); }
export function validateRecord(r: {
    date?: unknown;
    steps?: unknown;
}) { const date = r.date, steps = r.steps, t = todayJST(); if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date || date.slice(0, 7) !== t.slice(0, 7) || date > t)
    throw new AppError('当月の今日までの実在する日付を指定してください。'); if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 0 || steps > 100000)
    throw new AppError('歩数は0〜100,000の整数で入力してください。'); return { date, steps }; }
export async function saveRecords(id: string, records: {
    date: string;
    steps: number;
    source?: string;
}[], source: string) { const entry = await db().prepare("SELECT user_id FROM entries WHERE user_id=? AND month=? AND metric='walking'").bind(id, todayJST().slice(0, 7)).first(); if (!entry)
    throw new AppError('今月のX連携エントリーを完了してください。', 403); const unique = new Set(); for (const r of records) {
    validateRecord(r);
    if (unique.has(r.date))
        throw new AppError('同じ日付が複数含まれています。');
    unique.add(r.date);
} if (!records.length || records.length > 31)
    throw new AppError('1〜31日分の記録を指定してください。'); const now = new Date().toISOString(); await db().batch(records.map(r => db().prepare("INSERT INTO steps(user_id,date,steps,source,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET steps=excluded.steps,source=excluded.source,updated_at=excluded.updated_at").bind(id, r.date, r.steps, r.source ?? source, now))); }
