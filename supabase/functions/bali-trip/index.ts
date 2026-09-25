import { createHandler } from './handler.ts';
import { createStore } from './store.ts';

const namedKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const store = createStore(Deno.env.get('SUPABASE_URL') || '', namedKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
Deno.serve(createHandler({
  loadAccess: () => store.readAccess(),
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'https://woshicuiyao.github.io').split(',').map(x => x.trim()).filter(Boolean),
  store,
}));
