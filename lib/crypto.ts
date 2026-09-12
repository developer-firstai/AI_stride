import { settings, AppError } from './league';
export function base64url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
export function randomToken() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
export async function hash(value: string) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
async function key() { const secret = settings().TOKEN_ENCRYPTION_KEY; if (!secret)
    throw new AppError('受取情報の保存設定を運営者が準備中です。', 503); return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
export async function seal(value: string, context: string) { const iv = crypto.getRandomValues(new Uint8Array(12)); const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, await key(), new TextEncoder().encode(value)); return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(data)) }); }
export async function unseal(value: string, context: string) { const { iv, data } = JSON.parse(value); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), additionalData: new TextEncoder().encode(context) }, await key(), new Uint8Array(data))); }
