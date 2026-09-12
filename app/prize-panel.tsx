'use client';
import { useCallback, useEffect, useState } from 'react';
import { Gift, Plus, ShieldCheck, PackageCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RankingFilters } from './cohort-fields';
import { divisionLabel, Filters } from '@/lib/competition';
type Prize = {
    id: string;
    month: string;
    title: string;
    provider: string;
    description: string;
    filters: Filters;
    top_n: number;
    delivery: string;
    status: string;
};
type Award = {
    id: string;
    prize_id: string;
    name: string;
    rank: number;
    score: number;
    status: string;
    is_mine: number;
    title: string;
    provider: string;
    delivery: string;
};
type Candidate = {
    id: string;
    name: string;
    rank: number;
    total: number;
    days: number;
    verified_days: number;
};
const statuses: Record<string, string> = { confirmed: '入賞確定', claimed: '受取申請済み', sent: '発送・送付済み', received: '受取完了' };
export default function PrizePanel({ month, admin, authenticated }: {
    month: string;
    admin: boolean;
    authenticated: boolean;
}) {
    const [prizes, setPrizes] = useState<Prize[]>([]), [awards, setAwards] = useState<Award[]>([]), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [dialog, setDialog] = useState(''), [selected, setSelected] = useState<Prize | null>(null), [award, setAward] = useState<Award | null>(null), [filters, setFilters] = useState<Filters>({}), [confirmed, setConfirmed] = useState(false), [preview, setPreview] = useState<{
        rows: Candidate[];
        signature: string;
    } | null>(null), [claimData, setClaimData] = useState<{
        name: string;
        email: string;
        address: string;
        consentedAt: string;
    } | null>(null);
    const reload = useCallback(async (signal?: AbortSignal) => { if (!authenticated)
        return; setLoading(true); try {
        const r = await fetch('/api/prizes?month=' + month, { signal });
        const d = await r.json() as {
            prizes: Prize[];
            awards: Award[];
            error?: string;
        };
        if (!r.ok)
            throw new Error(d.error);
        setPrizes(d.prizes);
        setAwards(d.awards);
    }
    catch (e) {
        if ((e as Error).name !== 'AbortError') {
            setError((e as Error).message);
            setPrizes([]);
            setAwards([]);
        }
    }
    finally {
        if (!signal?.aborted)
            setLoading(false);
    } }, [month, authenticated]);
    useEffect(() => { const c = new AbortController(); void reload(c.signal); setNotice(''); setError(''); return () => c.abort(); }, [reload]);
    async function action(body: unknown, message = '保存しました。') { setBusy(true); setError(''); try {
        const r = await fetch('/api/prizes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json() as {
            error?: string;
            rows?: Candidate[];
            signature?: string;
        };
        if (!r.ok)
            throw new Error(d.error);
        await reload();
        setNotice(message);
        return d;
    }
    catch (e) {
        setError((e as Error).message);
        return null;
    }
    finally {
        setBusy(false);
    } }
    const open = (kind: string, p?: Prize, a?: Award) => { setDialog(kind); setSelected(p ?? null); setAward(a ?? null); setConfirmed(false); setPreview(null); setError(''); setClaimData(null); setFilters(p?.filters ?? {}); };
    const close = () => { setDialog(''); setClaimData(null); setPreview(null); };
    async function review(p: Prize) { open('finalize', p); const d = await action({ action: 'preview', id: p.id }, ''); if (d?.rows && d.signature)
        setPreview({ rows: d.rows, signature: d.signature }); }
    async function inspect(a: Award) { open('delivery', undefined, a); setBusy(true); try {
        const r = await fetch('/api/prizes?claim=' + encodeURIComponent(a.id));
        const d = await r.json() as {
            claim: typeof claimData;
            error?: string;
        };
        if (!r.ok)
            throw new Error(d.error);
        setClaimData(d.claim);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <div className="prize-panel"><div className="prize-intro"><span className="eyebrow">FIRST AI × SPONSORS</span><h3>続けた一歩に、次の楽しみを。</h3><p>月間の上位入賞者に、First AI・協賛企業から賞品を贈呈。対象部門と内容は、確定したものから掲載します。</p><div className="award-process"><span>01 月間集計</span><span>02 運営確認</span><span>03 賞品贈呈</span></div></div>{error && !dialog && <p role="alert" className="error-box">{error}</p>}{notice && <p className="success-box" role="status">{notice}</p>}
 {admin && <div className="prize-admin-head"><span>賞品は下書きで保存し、提供内容の確定後に公開します。</span><Button onClick={() => open('edit')}><Plus size={16}/>賞品を登録</Button></div>}
 {!authenticated ? <div className="empty"><Gift size={32}/><h3>賞品プログラム</h3><p>ログインすると、公開済みの賞品と入賞結果を確認できます。</p><a className="outline-link mt-4" href="/signin-with-chatgpt?return_to=/" target="_top">ログイン</a></div> : loading ? <div className="empty" role="status">賞品を読み込み中…</div> : !prizes.length ? <div className="empty"><Gift size={36}/><h3>今月の賞品は調整中です</h3><p>賞品名・協賛企業・対象順位が確定したら、ここでお知らせします。</p></div> : <div className="prize-grid">{prizes.map(p => <article key={p.id} className="prize-card"><div className="prize-provider"><Gift size={18}/>{p.provider}<span>{p.status === 'draft' ? '下書き' : p.status === 'finalized' ? '結果確定' : '募集条件公開'}</span></div><h3>{p.title}</h3><p>{p.description}</p><div className="prize-condition"><strong>{divisionLabel(p.filters)}</strong><span>部門内 上位{p.top_n}位</span></div><small>{p.delivery === 'postal' ? '配送賞品' : 'デジタル賞品'}・対象月 {p.month}・同順位の方も対象</small>{admin && <div className="prize-actions">{p.status === 'draft' ? <><Button variant="outline" onClick={() => open('edit', p)}>編集</Button><Button onClick={() => open('publish', p)}>条件を公開</Button></> : p.status === 'published' ? <Button variant="outline" disabled={busy || p.month >= new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7)} onClick={() => review(p)}>入賞候補を確認</Button> : <span className="status-tag approved">入賞者確定済み</span>}</div>}</article>)}</div>}
 {awards.length > 0 && <section className="awards-section"><h3><PackageCheck size={20}/>入賞結果・賞品の受取</h3>{awards.map(a => <article className="award-row" key={a.id}><div><span className="award-rank">{a.rank}位</span><strong>{a.name}{a.is_mine === 1 ? '（あなた）' : ''}</strong><p>{a.title} / {a.provider}</p><span className="muted">{a.score.toLocaleString()}歩 ・ {statuses[a.status]}</span></div><div className="prize-actions">{a.is_mine === 1 && ['confirmed', 'claimed'].includes(a.status) && <Button onClick={() => open('claim', undefined, a)}>{a.status === 'claimed' ? '受取先を修正' : '受取先を登録'}</Button>}{a.is_mine === 1 && a.status === 'sent' && <Button disabled={busy} onClick={() => action({ action: 'received', id: a.id }, '賞品の受取を記録しました。')}>受け取りました</Button>}{admin && ['claimed', 'sent', 'received'].includes(a.status) && <Button variant="outline" onClick={() => inspect(a)}>受取情報・発送</Button>}</div></article>)}</section>}
 <p className="prize-footnote">ランキングは暫定です。月末後、運営者が参加資格と記録を確認して入賞者を確定します。同順位は全員が対象。受取先は入賞者本人と運営者だけが扱います。</p>
 <Dialog open={!!dialog} onOpenChange={v => { if (!v)
        close(); }}><DialogContent className="app-dialog prize-dialog"><DialogHeader><DialogTitle>{dialog === 'edit' ? '賞品と対象部門を登録' : dialog === 'publish' ? '賞品条件を公開' : dialog === 'finalize' ? '入賞者を確認・確定' : dialog === 'claim' ? '賞品の受取先を登録' : '受取情報・発送状況'}</DialogTitle><DialogDescription>{dialog === 'edit' ? '賞品を提供する企業と内容を確認してから公開してください。' : dialog === 'claim' ? 'この情報はFirst AIの運営者が賞品の送付・連絡に利用します。' : '内容を確認して操作を完了してください。'}</DialogDescription></DialogHeader>{error && <p role="alert" className="error-box">{error}</p>}
 {dialog === 'edit' && <form className="form-stack" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); if (await action({ action: 'save', id: selected?.id, month: f.get('month'), title: f.get('title'), provider: f.get('provider'), description: f.get('description'), top_n: Number(f.get('top_n')), delivery: f.get('delivery'), filters }, '賞品の下書きを保存しました。'))
        close(); }}><Label htmlFor="prize-month">対象月</Label><Input id="prize-month" name="month" type="month" defaultValue={selected?.month ?? month} min={new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7)} required/><Label htmlFor="provider">提供企業</Label><Input id="provider" name="provider" defaultValue={selected?.provider ?? 'First AI'} maxLength={100} required/><Label htmlFor="prize-title">賞品名</Label><Input id="prize-title" name="title" defaultValue={selected?.title} maxLength={100} required placeholder="確定した賞品名"/><Label htmlFor="prize-desc">賞品の内容・提供条件</Label><Textarea id="prize-desc" name="description" defaultValue={selected?.description} maxLength={1000} required placeholder="1人あたりの提供内容など"/><Label htmlFor="top-n">対象となる上位順位</Label><Input id="top-n" name="top_n" type="number" min={1} max={100} defaultValue={selected?.top_n ?? 3} required/><Label htmlFor="delivery">受取方法</Label><NativeSelect id="delivery" name="delivery" defaultValue={selected?.delivery ?? 'postal'}><NativeSelectOption value="postal">配送</NativeSelectOption><NativeSelectOption value="digital">デジタル送付</NativeSelectOption></NativeSelect><p>対象部門（組み合わせて指定できます）</p><RankingFilters value={filters} onChange={setFilters} includeRole prefix="prize-"/><p className="muted">同順位がある場合は、入賞人数が順位の数より多くなることがあります。</p><Button type="submit" disabled={busy}>下書きを保存</Button></form>}
 {dialog === 'publish' && selected && <div className="form-stack"><h3>{selected.title}</h3><p>{selected.provider}から、{selected.month}の{divisionLabel(selected.filters)}上位{selected.top_n}位に贈呈します。</p><p>{selected.description}</p><div className="check-row"><Checkbox id="publish-consent" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)}/><label htmlFor="publish-consent">提供企業と賞品の内容を確認し、同順位を含む入賞者全員に提供できることを確認しました。公開後は条件を変更できません。</label></div><Button disabled={busy || !confirmed} onClick={async () => { if (await action({ action: 'publish', id: selected.id, confirm: confirmed }, '賞品条件を公開しました。'))
        close(); }}>この条件で公開</Button></div>}
 {dialog === 'finalize' && selected && <div className="form-stack"><p>{selected.title} / {divisionLabel(selected.filters)}</p>{preview ? <><div className="candidate-list">{preview.rows.length ? preview.rows.map(r => <div key={r.id}><strong>{r.rank}位 {r.name}</strong><span>{r.total.toLocaleString()}歩 / {r.days}日</span><small>{r.verified_days === r.days ? '全日機器連携' : '自己申告を含む・記録確認が必要'}</small></div>) : <p>対象者がいません。</p>}</div><div className="check-row"><Checkbox id="winner-consent" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)}/><label htmlFor="winner-consent">候補者全員の参加資格・測定記録と、賞品の提供準備を確認しました。確定結果は変更できません。</label></div><Button disabled={busy || !confirmed || !preview.rows.length} onClick={async () => { if (await action({ action: 'finalize', id: selected.id, verified: confirmed, signature: preview.signature }, '入賞者を確定しました。本人が受取先を登録できます。'))
        close(); }}>この{preview.rows.length}名を入賞確定</Button></> : <p>候補者を読み込んでいます。</p>}</div>}
 {dialog === 'claim' && award && <form className="form-stack" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); if (await action({ action: 'claim', id: award.id, name: f.get('name'), email: f.get('email'), address: f.get('address'), consent: confirmed }, '受取先を登録しました。運営者の送付をお待ちください。'))
        close(); }}><p><strong>{award.title}</strong> / {award.provider}</p><Label htmlFor="claim-name">受取人の宛名</Label><Input id="claim-name" name="name" maxLength={100} required autoComplete="name"/><Label htmlFor="claim-email">連絡用メールアドレス</Label><Input id="claim-email" name="email" type="email" maxLength={254} required autoComplete="email"/>{award.delivery === 'postal' && <><Label htmlFor="claim-address">郵便番号・配送先住所</Label><Textarea id="claim-address" name="address" maxLength={500} required autoComplete="street-address"/></>}<div className="check-row"><Checkbox id="claim-consent" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)}/><label htmlFor="claim-consent">First AIの運営者が、入力した情報を賞品の送付・受取連絡のために利用することに同意します。</label></div><Button type="submit" disabled={busy || !confirmed}>受取先を保存</Button></form>}
 {dialog === 'delivery' && award && <div className="form-stack"><p>{award.name} / {award.title}</p>{claimData && <div className="delivery-detail"><p><strong>宛名</strong><br />{claimData.name}</p><p><strong>連絡先</strong><br />{claimData.email}</p>{claimData.address && <p><strong>配送先</strong><br />{claimData.address}</p>}</div>}<p>現在：{statuses[award.status]}</p>{award.status === 'claimed' && <><div className="check-row"><Checkbox id="sent-consent" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)}/><label htmlFor="sent-consent">賞品の配送またはデジタル送付を実施しました。この操作では送信・発送は行われません。</label></div><Button disabled={busy || !confirmed} onClick={async () => { if (await action({ action: 'sent', id: award.id }, '発送・送付済みとして記録しました。'))
        close(); }}>発送・送付済みにする</Button></>}</div>}
 </DialogContent></Dialog></div>;
}
