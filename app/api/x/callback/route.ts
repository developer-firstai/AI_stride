import { getChatGPTUser } from '@/app/chatgpt-auth';
import { db, settings } from '@/lib/league';
import { hash } from '@/lib/crypto';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { const url = new URL(request.url), origin = url.origin; const finish = (query: string) => new Response(null, { status: 303, headers: { Location: origin + '/?' + query, 'Cache-Control': 'no-store', 'Set-Cookie': `ai_stride_x_state=; HttpOnly; SameSite=Lax; Path=/api/x; Max-Age=0${origin.startsWith('https:') ? '; Secure' : ''}` } }); try {
    const user = await getChatGPTUser();
    if (!user)
        return finish('x_error=login');
    const state = url.searchParams.get('state'), cookie = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('ai_stride_x_state='))?.split('=')[1];
    if (!state || state.length > 200 || !cookie || state !== cookie)
        return finish('x_error=state');
    const stored = await db().prepare('DELETE FROM oauth_states WHERE state_hash=? AND user_id=? AND expires_at>? RETURNING verifier').bind(await hash(state), user.userId, Date.now()).first<{
        verifier: string;
    }>();
    if (!stored)
        return finish('x_error=state');
    if (url.searchParams.has('error'))
        return finish('x_error=cancelled');
    const code = url.searchParams.get('code'), c = settings();
    if (!code || code.length > 2000 || !c.X_CLIENT_ID || !c.X_CLIENT_SECRET)
        return finish('x_error=not_configured');
    const response = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(encodeURIComponent(c.X_CLIENT_ID) + ':' + encodeURIComponent(c.X_CLIENT_SECRET)), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: origin + '/api/x/callback', code_verifier: stored.verifier }), signal: AbortSignal.timeout(15000) });
    const token = await response.json() as {
        access_token?: string;
    };
    if (!response.ok || !token.access_token)
        return finish('x_error=exchange');
    const meResponse = await fetch('https://api.x.com/2/users/me', { headers: { Authorization: 'Bearer ' + token.access_token }, signal: AbortSignal.timeout(15000) });
    const me = await meResponse.json() as {
        data?: {
            id: string;
            username: string;
            name: string;
        };
    };
    if (!meResponse.ok || !me.data || !/^\d+$/.test(me.data.id) || !/^\w{1,15}$/.test(me.data.username))
        return finish('x_error=identity');
    const existing = await db().prepare('SELECT user_id,x_id FROM x_accounts WHERE user_id=? OR x_id=?').bind(user.userId, me.data.id).all<{
        user_id: string;
        x_id: string;
    }>();
    if (existing.results.some(r => r.user_id !== user.userId || r.x_id !== me.data!.id))
        return finish('x_error=already_linked');
    await db().prepare('INSERT INTO x_accounts(user_id,x_id,username,name,linked_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET username=excluded.username,name=excluded.name,linked_at=excluded.linked_at WHERE x_accounts.x_id=excluded.x_id').bind(user.userId, me.data.id, me.data.username, me.data.name.slice(0, 100), new Date().toISOString()).run();
    return finish('x_connected=1');
}
catch {
    return finish('x_error=unavailable');
} }
