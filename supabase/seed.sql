-- ============================================================================
-- NAASIFY — seed data (idempotent: safe to run multiple times)
-- Run AFTER supabase/schema.sql.
-- Prices are stored in NGN; the app displays USD by default via the
-- currency converter (lib/fx.ts + lib/money.ts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- The 9 cloud services NAASIFY sells
-- ----------------------------------------------------------------------------
insert into public.naasify_services (slug, name, description, icon_key, sort_order) values
  ('backend-hosting',  'Backend Hosting',  'Scalable API and server hosting with autoscaling, SSL and zero-downtime deploys.', 'server',   1),
  ('frontend-hosting', 'Frontend Hosting', 'Blazing-fast static and SSR frontend hosting on a global edge network.',           'monitor',  2),
  ('smtp-emailing',    'SMTP Emailing',    'Transactional email delivery with high deliverability, templates and analytics.',  'mail',     3),
  ('database',         'Database',         'Managed Postgres and MySQL databases with automated backups and pooling.',         'database', 4),
  ('storage',          'Storage',          'S3-compatible object storage with CDN delivery and signed URLs.',                  'drive',    5),
  ('domain-names',     'Domain Names',     'Register and manage domain names with free WHOIS privacy and DNS management.',     'globe',    6),
  ('cloud-computing',  'Cloud Computing',  'On-demand compute instances and serverless functions for any workload.',           'cpu',      7),
  ('vps',              'VPS',              'High-performance virtual private servers with root access and NVMe storage.',      'box',      8),
  ('vpn',              'VPN',              'Secure private networking and VPN endpoints for teams and infrastructure.',        'shield',   9)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- Per-service plan ladder: Starter / Pro (highlighted) / Enterprise
-- Annual base prices in NGN; quarterly = 30%, half-yearly = 55% of annual.
-- ----------------------------------------------------------------------------
insert into public.naasify_plans (service_id, name, billing_cycle, price, currency, features, is_highlighted, is_active, sort_order)
select
  s.id,
  t.name,
  c.cycle,
  round(t.annual * c.mult),
  'NGN',
  t.features,
  t.is_highlighted,
  true,
  t.sort_order
from public.naasify_services s
cross join (values
  (
    'Starter', 1, false, 45000,
    '["Fair-use resource allocation","SSL included","Community support","99.5% uptime SLA"]'::jsonb
  ),
  (
    'Pro', 2, true, 90000,
    '["Generous resource allocation","SSL + custom domains","Priority email support","99.9% uptime SLA","Free migration"]'::jsonb
  ),
  (
    'Enterprise', 3, false, 180000,
    '["Dedicated resources","SSL + custom domains","24/7 priority support","99.99% uptime SLA","Free migration","Custom integrations"]'::jsonb
  )
) as t (name, sort_order, is_highlighted, annual, features)
cross join (values
  ('quarterly', 0.30),
  ('half_yearly', 0.55),
  ('annual', 1.00)
) as c (cycle, mult)
where not exists (
  select 1 from public.naasify_plans p
  where p.service_id = s.id and p.name = t.name and p.billing_cycle = c.cycle
);

-- ----------------------------------------------------------------------------
-- Bundle plans (service_id NULL) — the 3 pricing-page tier cards.
-- Middle card "All-in-One" bundles EVERY service for ₦350,000 / year.
-- ----------------------------------------------------------------------------
insert into public.naasify_plans (service_id, name, billing_cycle, price, currency, features, is_highlighted, is_active, sort_order)
select b.service_id, b.name, b.cycle, b.price, 'NGN', b.features, b.is_highlighted, true, b.sort_order
from (values
  -- Launch (entry tier)
  (null::uuid, 'Launch', 'quarterly',   45000, '["Frontend hosting","1 database","5 GB storage","Community support"]'::jsonb, false, 1),
  (null::uuid, 'Launch', 'half_yearly', 82500, '["Frontend hosting","1 database","5 GB storage","Community support"]'::jsonb, false, 1),
  (null::uuid, 'Launch', 'annual',     150000, '["Frontend hosting","1 database","5 GB storage","Community support"]'::jsonb, false, 1),
  -- All-in-One (middle tier — everything included, ₦350,000 / year)
  (null::uuid, 'All-in-One', 'quarterly',   105000, '["Backend hosting","Frontend hosting","SMTP emailing","Managed database","Object storage","Domain name","Cloud computing","VPS","VPN","Priority support"]'::jsonb, true, 2),
  (null::uuid, 'All-in-One', 'half_yearly', 192500, '["Backend hosting","Frontend hosting","SMTP emailing","Managed database","Object storage","Domain name","Cloud computing","VPS","VPN","Priority support"]'::jsonb, true, 2),
  (null::uuid, 'All-in-One', 'annual',      350000, '["Backend hosting","Frontend hosting","SMTP emailing","Managed database","Object storage","Domain name","Cloud computing","VPS","VPN","Priority support"]'::jsonb, true, 2),
  -- Enterprise (top tier)
  (null::uuid, 'Enterprise', 'quarterly',   225000, '["Everything in All-in-One","Dedicated resources","24/7 priority support","99.99% uptime SLA","Custom integrations","Dedicated account manager"]'::jsonb, false, 3),
  (null::uuid, 'Enterprise', 'half_yearly', 412500, '["Everything in All-in-One","Dedicated resources","24/7 priority support","99.99% uptime SLA","Custom integrations","Dedicated account manager"]'::jsonb, false, 3),
  (null::uuid, 'Enterprise', 'annual',      750000, '["Everything in All-in-One","Dedicated resources","24/7 priority support","99.99% uptime SLA","Custom integrations","Dedicated account manager"]'::jsonb, false, 3)
) as b (service_id, name, cycle, price, features, is_highlighted, sort_order)
where not exists (
  select 1 from public.naasify_plans p
  where p.service_id is not distinct from b.service_id
    and p.name = b.name
    and p.billing_cycle = b.cycle
);
