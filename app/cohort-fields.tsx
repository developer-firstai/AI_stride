'use client';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { AGE_BANDS, GENDERS, PREFECTURES, REGIONS, AREA_PREFECTURES, Filters } from '@/lib/competition';
export function CohortFields({ prefix = 'entry' }: {
    prefix?: string;
}) { return <div className="cohort-fields">{([{ name: 'age_band', label: '年代', options: AGE_BANDS }, { name: 'gender', label: '性別', options: GENDERS }, { name: 'prefecture', label: '都道府県', options: PREFECTURES }]).map(f => <div key={f.name}><Label htmlFor={prefix + f.name}>{f.label}</Label><NativeSelect id={prefix + f.name} name={f.name} defaultValue="" required><NativeSelectOption value="" disabled>選択してください</NativeSelectOption>{f.options.map(o => <NativeSelectOption key={o} value={o}>{o}</NativeSelectOption>)}</NativeSelect></div>)}</div>; }
export function RankingFilters({ value, onChange, prefix = 'ranking', includeRole = false }: {
    value: Filters;
    onChange: (f: Filters) => void;
    prefix?: string;
    includeRole?: boolean;
}) { const fields = [...(includeRole ? [{ name: 'role', label: '職種', options: ['engineer', 'founder'] }] : []), { name: 'age_band', label: '年代', options: AGE_BANDS }, { name: 'gender', label: '性別', options: GENDERS }, { name: 'region', label: '地方', options: REGIONS }, { name: 'prefecture', label: '都道府県', options: value.region && value.region !== 'all' ? AREA_PREFECTURES[value.region] : PREFECTURES }]; return <div className="ranking-filters">{fields.map(f => <div key={f.name}><Label htmlFor={prefix + f.name}>{f.label}</Label><NativeSelect id={prefix + f.name} value={value[f.name as keyof Filters] ?? 'all'} onChange={e => onChange({ ...value, [f.name]: e.target.value, ...(f.name === 'region' ? { prefecture: 'all' } : {}) })}><NativeSelectOption value="all">すべて</NativeSelectOption>{f.options.map(o => <NativeSelectOption key={o} value={o}>{o === 'engineer' ? 'AIエンジニア' : o === 'founder' ? '経営者' : o}</NativeSelectOption>)}</NativeSelect></div>)}</div>; }
