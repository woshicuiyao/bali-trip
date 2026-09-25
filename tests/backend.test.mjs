import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/bali-trip/handler.ts';
import { createStore } from '../supabase/functions/bali-trip/store.ts';
import { invitationUrl } from '../app/lib/share.ts';
import { hashToken, readOnlyInvite } from '../supabase/functions/bali-trip/access.ts';

const editToken = 'e'.repeat(43), viewToken = 'v'.repeat(43);
const access = { editHash: await hashToken(editToken), viewHashes: [await hashToken(viewToken), await hashToken(await readOnlyInvite(editToken))] };
const origin = 'https://woshicuiyao.github.io';
function fixture() {
  let snapshot = { data: { days: [{id:'day-01',date:'2026-09-30'}, {id:'day-02',date:'2026-10-01'}],
    events: [], stays: [], flights: [], tasks: [{id:'task-1',title:'Check packing',done:{},owners:['sunto'],kind:'packing'}],
    bookings: [], foods: [], history: [] }, version: 7, updatedAt: '2026-09-24T00:00:00Z' };
  const store = {
    async read() { return structuredClone(snapshot); },
    async compareAndSet(next, version) { if (snapshot.version !== version) return false; snapshot = structuredClone(next); return true; },
  };
  const config = { async loadAccess(){return access}, allowedOrigins: [origin], store };
  return { config, store, handle: createHandler(config) };
}
function request(path = 'trip', { token = editToken, method = 'GET', body, from = origin } = {}) {
  return new Request(`https://example.supabase.co/functions/v1/bali-trip/${path}`, {
    method, headers: { ...(from ? {Origin:from}:{}), ...(token?{Authorization:`Bearer ${token}`} : {}), 'Content-Type':'application/json'},
    ...(body ? {body:JSON.stringify(body)}:{}),
  });
}
const mutation = { version:7,actor:'sunto',mutation:{collection:'tasks',id:'task-1',action:'update',changes:{done:{sunto:true}}} };

test('missing and invalid invites cannot read private trip data', async () => {
  const {handle}=fixture();
  for (const token of ['', 'wrong-invite']) {
    const response=await handle(request('trip',{token}));
    assert.equal(response.status,401);assert.equal((await response.json()).data,undefined);
  }
});
test('view invite may read but cannot mutate or retrieve other invitations',async()=>{
  const {handle}=fixture();
  const read=await handle(request('trip',{token:viewToken}));assert.equal((await read.json()).role,'view');
  assert.equal((await handle(request('trip',{token:viewToken,method:'PUT',body:mutation}))).status,403);
  assert.equal((await handle(request('share',{token:viewToken}))).status,403);
});
test('edits persist and appear to a different reader with history',async()=>{
  const {handle}=fixture();
  const written=await handle(request('trip',{method:'PUT',body:mutation}));assert.equal(written.status,200);
  const read=await (await handle(request('trip',{token:viewToken}))).json();
  assert.equal(read.data.tasks[0].done.sunto,true);assert.equal(read.version,8);
  assert.equal(read.data.history[0].actor,'sunto');assert.equal(read.data.history[0].title,'Check packing');
});
test('simultaneous edits do not silently overwrite the winning update',async()=>{
  const {handle}=fixture();
  const other=structuredClone(mutation);other.actor='Carson';other.mutation.changes={title:'Changed by Carson'};
  const results=await Promise.all([handle(request('trip',{method:'PUT',body:mutation})),handle(request('trip',{method:'PUT',body:other}))]);
  assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  const loser=await results.find(x=>x.status===409).json();assert.equal(loser.version,8);
  const read=await (await handle(request())).json();assert.equal(read.version,8);assert.equal(read.data.history.length,1);
});
test('invalid mutation fields are rejected without saving',async()=>{
  const {handle,store}=fixture();const input=structuredClone(mutation);input.mutation.changes={id:'overwritten'};
  assert.equal((await handle(request('trip',{method:'PUT',body:input}))).status,400);assert.equal((await store.read()).version,7);
});
test('allowed Pages origin supports preflight; unknown origins cannot write',async()=>{
  const {handle}=fixture();const preflight=await handle(request('trip',{method:'OPTIONS',token:''}));
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  assert.match(preflight.headers.get('access-control-allow-headers'),/authorization/);
  const denied=await handle(request('trip',{method:'PUT',body:mutation,from:'https://unrelated.example'}));
  assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
});
test('unconfigured secrets and unavailable database fail closed',async()=>{
  const {config}=fixture();assert.equal((await createHandler({...config,async loadAccess(){return {...access,editHash:''}}})(request())).status,503);
  const handler=createHandler({...config,store:{async read(){throw Error('internal secret diagnostic')},async compareAndSet(){throw Error('no')}}});
  const r=await handler(request());assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/internal secret/);
});
test('editor can share a derived read-only invitation without exposing edit access', async()=>{
  const {handle}=fixture();const share=await (await handle(request('share'))).json();
  assert.notEqual(share.viewToken,editToken);assert.equal(share.viewToken.length,43);
  assert.equal((await (await handle(request('trip',{token:share.viewToken}))).json()).role,'view');
  assert.equal((await handle(request('trip',{token:share.viewToken,method:'PUT',body:mutation}))).status,403);
});
test('flight changes retain local time zones and next-day arrival entries',async()=>{
  const {handle,store}=fixture();
  const input={version:7,actor:'sunto',mutation:{collection:'flights',id:'flight-test',action:'add',changes:{person:'sunto',number:'TEST123',airline:'Test',departure:{city:'Test',airport:'SGN',terminal:'',date:'2026-09-30',time:'23:00',timezone:'Asia/Ho_Chi_Minh'},arrival:{city:'Test',airport:'SZX',terminal:'',date:'2026-10-01',time:'02:00',timezone:'Asia/Shanghai'}}}};
  assert.equal((await handle(request('trip',{method:'PUT',body:input}))).status,200);
  const read=await store.read();assert.equal(read.data.flights[0].duration,120);
  assert.equal(read.data.events.find(x=>x.type==='arrival').dayId,'day-02');
});
test('share URLs retain the GitHub project subdirectory',()=>{
  const shared=new URL(invitationUrl(`${origin}/bali-trip/?tracking=old#invite=old`,viewToken));
  assert.equal(shared.pathname,'/bali-trip/');assert.equal(shared.search,'');assert.equal(shared.hash,`#invite=${viewToken}`);
});
test('database update filters by version and detects a raced update',async(t)=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async(url,init)=>{requests.push({url:String(url),init});return Response.json([])});
  const store=createStore('https://example.supabase.co','server-only-test-key');
  assert.equal(await store.compareAndSet({data:{},version:8,updatedAt:'now'},7),false);
  assert.match(requests[0].url,/version=eq.7/);assert.equal(requests[0].init.method,'PATCH');
  assert.equal(JSON.parse(requests[0].init.body).version,8);
});
