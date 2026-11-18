-- ============================================================================
-- Seed Inicial BarberOS — Planos SaaS + Tenant Demonstrativo
-- ============================================================================

insert into public.subscription_plans (code, name, tagline, price_monthly, is_custom_pricing, max_barbers, max_monthly_appointments, max_branches, trial_days, is_popular, sort_order)
values
  ('free', 'Plano Gratuito', 'Ideal para barbeiros autônomos iniciarem sua presença digital.', 0.00, false, 1, 30, 1, 0, false, 1),
  ('starter', 'Plano Starter', 'Para pequenas barbearias organizando a agenda e o caixa.', 29.90, false, 2, 150, 1, 14, false, 2),
  ('pro', 'Plano Pro', 'Gestão completa com financeiro, comissões, CRM e Pix integrado.', 59.90, false, 5, null, 1, 14, true, 3),
  ('premium', 'Plano Premium', 'Operação avançada com estoque, fidelidade e automações WhatsApp.', 99.90, false, 10, null, 1, 14, false, 4),
  ('business', 'Plano Business', 'Para redes e franquias com até 3 unidades e visão consolidada.', 199.90, false, 25, null, 3, 14, false, 5),
  ('enterprise', 'Plano Enterprise', 'Estrutura dedicada, API aberta e unidades ilimitadas sob consulta.', 0.00, true, null, null, 999, 30, false, 6)
on conflict (code) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  max_barbers = excluded.max_barbers,
  max_monthly_appointments = excluded.max_monthly_appointments,
  max_branches = excluded.max_branches;
