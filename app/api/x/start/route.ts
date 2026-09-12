import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { settings, db } from '@/lib/league';
import { randomToken, hash } from '@/lib/crypto';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { const origin = new URL(request.url).origin; const redirect = (path: string) => Response.redirect(origin + path, 303); try {
    const c = settings();
    if (!c.X_CLIENT_ID || !c.X_CLIENT_SECRET)
        return redirect('/?x_error=not_configured');
    const user = await getChatGPTUser();
    if (!user)
        return redirect(chatGPTSignInPath('/api/x/start'));
    const state = randomToken(), verifier = randomToken(), stateHash = await hash(state);
    await db().batch([db().prepare('DELETE FROM oauth_states WHERE expires_at<? OR user_id=?').bind(Date.now(), user.userId), db().prepare('INSERT INTO oauth_states(state_hash,user_id,verifier,expires_at) VALUES(?,?,?,?)').bind(stateHash, user.userId, verifier, Date.now() + 600000)]);
    const params = new URLSearchParams({ response_type: 'code', client_id: c.X_CLIENT_ID, redirect_uri: origin + '/api/x/callback', scope: 'tweet.read users.read', state, code_challenge: await hash(verifier), code_challenge_method: 'S256' });
    return new Response(null, { status: 303, headers: { Location: 'https://x.com/i/oauth2/authorize?' + params, 'Cache-Control': 'no-store', 'Set-Cookie': `ai_stride_x_state=${state}; HttpOnly; SameSite=Lax; Path=/api/x; Max-Age=600${origin.startsWith('https:') ? '; Secure' : ''}` } });
}
catch {
    return redirect('/?x_error=unavailable');
} }
