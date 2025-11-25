-- Portfolio managers table
create table if not exists public.portfolio_managers (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  display_name text not null,
  bio text,
  verified boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  roi_annualized double precision not null default 0,
  sharpe_ratio double precision not null default 0,
  total_followers integer not null default 0,
  performance_start_date timestamptz,
  applied_at timestamptz not null default now(),
  approved_at timestamptz,
  track_record jsonb,
  management_fee_percent double precision not null default 0
);

-- Followers table
create table if not exists public.portfolio_followers (
  id uuid primary key default gen_random_uuid(),
  follower_wallet text not null,
  manager_wallet text not null references public.portfolio_managers(wallet_address) on delete cascade,
  allocation_amount numeric(38, 10) not null default 0,
  copy_percent integer not null default 100 check (copy_percent >= 0 and copy_percent <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_portfolio_managers_status_roi on public.portfolio_managers (approval_status, roi_annualized desc);
create index if not exists idx_portfolio_followers_manager on public.portfolio_followers (manager_wallet);
create index if not exists idx_portfolio_followers_follower on public.portfolio_followers (follower_wallet);

-- RLS (optional basic policies; adjust as needed)
alter table public.portfolio_managers enable row level security;
alter table public.portfolio_followers enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'portfolio_managers' and policyname = 'pm_select_all') then
    create policy pm_select_all on public.portfolio_managers for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'portfolio_managers' and policyname = 'pm_insert_any') then
    create policy pm_insert_any on public.portfolio_managers for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'portfolio_managers' and policyname = 'pm_update_admin_only') then
    create policy pm_update_admin_only on public.portfolio_managers for update using (false) with check (false);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'portfolio_followers' and policyname = 'pf_select_all') then
    create policy pf_select_all on public.portfolio_followers for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'portfolio_followers' and policyname = 'pf_insert_any') then
    create policy pf_insert_any on public.portfolio_followers for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'portfolio_followers' and policyname = 'pf_update_owner_only') then
    create policy pf_update_owner_only on public.portfolio_followers for update using (false) with check (false);
  end if;
end $$;


