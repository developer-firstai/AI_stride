import { db, AppError, todayJST } from './league';
import { cohort, ranked, matches, Filters } from './competition';
export type RankedMember = {
    id: string;
    name: string;
    company: string;
    role: string;
    age_band: string;
    gender: string;
    region: string;
    prefecture: string;
    x_username: string;
    total: number;
    days: number;
    verified_days: number;
};
export async function leaderboard(month: string, filters: Filters = {}) { const result = await db().prepare("SELECT m.id,m.name,m.company,e.role,e.age_band,e.gender,e.region,e.prefecture,SUM(s.steps) AS total,COUNT(s.date) AS days,SUM(CASE WHEN s.source='device' THEN 1 ELSE 0 END) AS verified_days FROM entries e JOIN members m ON m.id=e.user_id JOIN steps s ON s.user_id=e.user_id AND s.date>=? AND s.date<? WHERE e.month=? AND e.metric='walking' AND m.status='approved' GROUP BY m.id ORDER BY total DESC,e.created_at ASC").bind(month + '-01', month + '-32', month).all<RankedMember>(); return ranked(result.results.filter(r => matches(r, filters))); }
export async function xAccount(userId: string) { return db().prepare('SELECT x_id,username,name,linked_at FROM x_accounts WHERE user_id=?').bind(userId).first<{
    x_id: string;
    username: string;
    name: string;
    linked_at: string;
}>(); }
export async function entryStatement(userId: string, role: string, p: {
    age_band?: unknown;
    gender?: unknown;
    prefecture?: unknown;
    consent?: unknown;
    metric?: unknown;
}) { if (p.metric && p.metric !== 'walking')
    throw new AppError('睡眠部門はウォーキングの実証後に開始予定です。'); if (p.consent !== true)
    throw new AppError('参加区分の公開と大会ルールへの同意が必要です。'); let c; try {
    c = cohort(p);
}
catch (e) {
    throw new AppError((e as Error).message);
} const x = await xAccount(userId); if (!x)
    throw new AppError('Xアカウントを連携してからエントリーしてください。', 403); return db().prepare("INSERT INTO entries(user_id,month,metric,role,age_band,gender,prefecture,region,x_id,x_username,created_at) VALUES(?,?,'walking',?,?,?,?,?,?,?,?) ON CONFLICT(user_id,month,metric) DO NOTHING").bind(userId, todayJST().slice(0, 7), role, c.age_band, c.gender, c.prefecture, c.region, x.x_id, x.username, new Date().toISOString()); }
