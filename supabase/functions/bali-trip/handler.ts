import { apply, requestSchema } from './mutation.ts';
import type { Trip } from './model.ts';
import { hashToken, readOnlyInvite, type AccessConfig } from './access.ts';

export type StoredSnapshot = { data: Trip; version: number; updatedAt: string };
export type TripStore = {
  read(): Promise<StoredSnapshot>;
  compareAndSet(snapshot: StoredSnapshot, expectedVersion: number): Promise<boolean>;
};
type Config = { loadAccess(): Promise<AccessConfig>; allowedOrigins: string[]; store: TripStore };

export function createHandler(config: Config) {
  return async function handle(req: Request): Promise<Response> {
    const origin = req.headers.get('origin');
    const allowed = !origin || config.allowedOrigins.includes(origin);
    const headers: Record<string, string> = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    };
    if (origin && allowed) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
    if (!allowed) return reply({ error: '请求来源无效。' }, 403);
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...headers,
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Max-Age': '600',
      } });
    }
    const path = new URL(req.url).pathname.replace(/\/$/, '').split('/').pop();
    if (!['trip', 'share', 'health'].includes(path || '')) return reply({ error: '地址不存在。' }, 404);
    let access: AccessConfig;
    try {
      access = await config.loadAccess();
      if (!/^[a-f0-9]{64}$/.test(access.editHash) || !access.viewHashes.length ||
          access.viewHashes.some(hash => !/^[a-f0-9]{64}$/.test(hash) || hash === access.editHash)) throw Error('Invalid access config');
    } catch { return reply({ error: '行程服务尚未配置完成。' }, 503); }
    if (path === 'health' && req.method === 'GET') {
      try { await config.store.read(); return reply({ status: 'ok' }); }
      catch { return reply({ status: 'unavailable' }, 503); }
    }
    const token = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1] || '';
    const tokenHash = token ? await hashToken(token) : '';
    const role = tokenHash === access.editHash ? 'edit' : access.viewHashes.includes(tokenHash) ? 'view' : null;
    if (!role) return reply({ error: '请通过完整的同行邀请链接打开行程。' }, 401);
    if (path === 'share') {
      if (req.method !== 'GET') return reply({ error: '请求方式无效。' }, 405);
      if (role !== 'edit') return reply({ error: '此链接只能查看。' }, 403);
      const viewToken = await readOnlyInvite(token);
      if (!access.viewHashes.includes(await hashToken(viewToken))) return reply({error:'分享权限尚未配置完成。'},503);
      return reply({ viewToken });
    }
    if (path !== 'trip' || !['GET', 'PUT'].includes(req.method)) return reply({ error: '请求方式无效。' }, 405);
    if (req.method === 'PUT' && role !== 'edit') return reply({ error: '此链接只能查看，请使用共同编辑邀请。' }, 403);

    let input: ReturnType<typeof requestSchema.parse> | undefined;
    if (req.method === 'PUT') {
      try {
        const body = await req.text();
        if (new TextEncoder().encode(body).length > 20000) return reply({ error: '内容过长。' }, 413);
        input = requestSchema.parse(JSON.parse(body));
      } catch { return reply({ error: '请检查填写的内容和时间格式。' }, 400); }
    }
    try {
      const current = await config.store.read();
      if (!input) return reply({ ...current, role });
      const conflict = (snapshot: StoredSnapshot) => reply({ ...snapshot, role,
        error: '同行者刚刚更新了行程。已加载最新内容，请确认后再保存。',
      }, 409);
      if (current.version !== input.version) return conflict(current);
      let result: ReturnType<typeof apply>;
      try { result = apply(current.data, input.mutation); }
      catch (error) {
        return reply({ error: error instanceof Error && error.name !== 'ZodError'
          ? error.message : '请检查填写的内容和时间格式。' }, 400);
      }
      const record = current.data[input.mutation.collection].find(x => x.id === input!.mutation.id);
      const updatedAt = new Date().toISOString();
      current.data.history.unshift({ id: crypto.randomUUID(), actor: input.actor, time: updatedAt,
        action: result.label,
        title: record?.title || record?.name || record?.number || result.previous?.title || result.previous?.name || result.previous?.number || '行程内容',
      });
      current.data.history = current.data.history.slice(0, 30);
      const next = { data: current.data, version: input.version + 1, updatedAt };
      if (!await config.store.compareAndSet(next, input.version)) return conflict(await config.store.read());
      return reply({ ...next, role, previous: result.previous });
    } catch {
      return reply({ error: '共享数据暂时不可用，请稍后重试。' }, 503);
    }
  };
}
