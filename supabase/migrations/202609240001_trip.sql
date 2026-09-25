-- No itinerary or credentials belong in this migration or the public repository.
create table if not exists public.journeys (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null check (version > 0),
  updated_at timestamptz not null default now()
);
alter table public.journeys enable row level security;
revoke all on public.journeys from anon, authenticated;
grant select, insert, update on public.journeys to service_role;
comment on table public.journeys is 'Invitation-protected travel snapshots. Access through the bali-trip edge function only.';

create table if not exists public.journey_access (
  id text primary key references public.journeys(id),
  edit_hash text not null check (edit_hash ~ '^[a-f0-9]{64}$'),
  view_hashes text[] not null check (cardinality(view_hashes) > 0)
);
alter table public.journey_access enable row level security;
revoke all on public.journey_access from anon, authenticated;
grant select on public.journey_access to service_role;
comment on table public.journey_access is 'SHA-256 invitation digests only; readable by the edge function, never public clients.';
