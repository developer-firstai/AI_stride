export const SPORTS = { walking: { label: 'ウォーキング', unit: '歩', phase: 'pilot' }, sleep: { label: '睡眠', unit: '', phase: 'planned' } } as const;
export const AGE_BANDS = ['20歳未満', '20代', '30代', '40代', '50代', '60代', '70代以上', '回答しない'];
export const GENDERS = ['男性', '女性', 'その他', '回答しない'];
export const AREA_PREFECTURES: Record<string, string[]> = { 北海道: ['北海道'], 東北: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'], 関東: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'], 中部: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'], 近畿: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'], 中国: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'], 四国: ['徳島県', '香川県', '愛媛県', '高知県'], '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'], 海外: ['海外'], 未回答: ['回答しない'] };
export const REGIONS = Object.keys(AREA_PREFECTURES);
export const PREFECTURES = Object.values(AREA_PREFECTURES).flat();
export type Cohort = {
    age_band: string;
    gender: string;
    prefecture: string;
    region: string;
};
export type Filters = {
    role?: string;
    age_band?: string;
    gender?: string;
    region?: string;
    prefecture?: string;
};
export function cohort(input: {
    age_band?: unknown;
    gender?: unknown;
    prefecture?: unknown;
}): Cohort { if (typeof input.age_band !== 'string' || !AGE_BANDS.includes(input.age_band) || typeof input.gender !== 'string' || !GENDERS.includes(input.gender) || typeof input.prefecture !== 'string' || !PREFECTURES.includes(input.prefecture))
    throw new Error('年代・性別・都道府県を選択してください。'); return { age_band: input.age_band, gender: input.gender, prefecture: input.prefecture, region: REGIONS.find(r => AREA_PREFECTURES[r].includes(input.prefecture as string))! }; }
export function validFilters(input: unknown): Filters { if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('部門条件を確認してください。'); const options: Record<string, string[]> = { role: ['engineer', 'founder'], age_band: AGE_BANDS, gender: GENDERS, region: REGIONS, prefecture: PREFECTURES }; const out: Record<string, string> = {}; for (const [k, v] of Object.entries(input)) {
    if (!(k in options) || typeof v !== 'string' || (v !== 'all' && !options[k].includes(v)))
        throw new Error('部門条件を確認してください。');
    if (v !== 'all')
        out[k] = v;
} return out; }
export function matches(row: object, filters: Filters) { return Object.entries(filters).every(([key, value]) => !value || value === 'all' || (row as Record<string, unknown>)[key] === value); }
export function ranked<T extends {
    total: number;
}>(rows: T[]) { let previous: number | undefined, rank = 0; return [...rows].sort((a, b) => b.total - a.total).map((r, i) => { if (r.total !== previous)
    rank = i + 1; previous = r.total; return { ...r, rank }; }); }
export function divisionLabel(filters: Filters) { return Object.values(filters).filter(v => v && v !== 'all').map(v => v === 'engineer' ? 'AIエンジニア' : v === 'founder' ? '経営者' : v).join(' / ') || '総合'; }
