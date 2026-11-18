# BarberOS — Plataforma SaaS Multi-Tenant para Gestão de Barbearias

O **BarberOS** é uma plataforma SaaS completa para barbearias autônomas, médias, premium e redes com múltiplas unidades. Projetado em Next.js App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL (com RLS e prevenção de conflito por `EXCLUDE USING gist`) e integrações oficiais preparadas para Mercado Pago (Pix/Cartão/Webhooks), WhatsApp Business API e Resend.

---

## Arquitetura & Principais Módulos

- **Páginas Públicas (`/`, `/precos`, `/s/[slug]`, `/agendar/[slug]`)**: Landing page SaaS, comparativo de planos e página pública personalizável da barbearia com agendamento interativo em 4 etapas (Serviço &rarr; Barbeiro &rarr; Data e Hora &rarr; Resumo e Pagamento), avaliações e lista de espera automática.
- **Painel Administrativo (`/app/*`)**: Dashboard em tempo real com 12 indicadores e gráficos, calendário diário/semanal/mensal, agendamentos e lista de espera, CRM com segmentação (VIP, inativos 45d+, risco de falta), profissionais/metas, catálogo de serviços, financeiro completo (fluxo de caixa, sangria/suprimento, contas a pagar/receber, exportação CSV/PDF), comissões imutáveis, estoque com baixa automática por serviço, automações WhatsApp/fidelidade, relatórios de inteligência de negócio, multiunidades/RBAC e assinatura.
- **Painel Super Admin (`/admin/*`)**: Métricas SaaS isoladas (MRR, ARR, Churn), gestão/suspensão de barbearias, editor dinâmico de preços e limites dos planos, cupons globais, configurações e logs de auditoria.
- **Segurança & LGPD (`/privacidade`, `/termos`)**: Isolamento estrito por `tenant_id`, Row Level Security em todas as tabelas, cookies de sessão `HttpOnly` assinados via HMAC-SHA256, senhas com `scrypt`, rate limiting e portal de exportação/anonimização LGPD.

---

## Instalação Local

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env.local` e preencha os valores desejados:
   ```bash
   cp .env.example .env.local
   ```
   > **Modo local imediato:** Sem credenciais externas de Supabase configuradas, o backend server-side persiste todas as 38 entidades em `.data/barberos-store.json` com mutex transacional e seed demonstrativo.

3. **Execute a suíte de testes automatizados:**
   ```bash
   npm test
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`, `http://localhost:3000/s/barbearia-exclusiva` ou `http://localhost:3000/login`.

---

## Configuração do Banco Supabase (PostgreSQL + RLS)

As migrations versionadas estão em `supabase/migrations/`:
- `20261118000001_core_tenants_auth_rbac.sql`
- `20261118000002_operations_appointments_exclusion.sql`
- `20261118000003_financial_payments_commissions.sql`
- `20261118000004_crm_loyalty_inventory_notifications.sql`
- `20261118000005_saas_subscriptions_audit_rls.sql`

Para aplicar em um projeto Supabase:
```bash
npx supabase link --project-ref <SEU_PROJECT_REF>
npx supabase db push
```
E execute `supabase/seed.sql` para criar os 6 planos iniciais (`Gratuito`, `Starter`, `Pro`, `Premium`, `Business`, `Enterprise`).

---

## Integrações Externas (Sem Simulação)

- **Mercado Pago**: Defina `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY` e `MERCADO_PAGO_WEBHOOK_SECRET`. Configure a URL de webhook em sua conta Mercado Pago apontando para `https://seudominio.com/api/webhooks/mercadopago`.
- **WhatsApp Business API**: Defina `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_API_URL`. Enquanto não configuradas, as mensagens ficam registradas em `notification_jobs` com status `integration_not_configured`.
- **Resend (E-mail)**: Defina `RESEND_API_KEY` e `RESEND_FROM_EMAIL`.

---

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Importe o projeto na [Vercel](https://vercel.com).
3. Adicione todas as variáveis de ambiente listadas em `.env.example` nas configurações do projeto (nunca prefixe `SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PAGO_ACCESS_TOKEN` ou `BARBEROS_SESSION_SECRET` com `NEXT_PUBLIC_`).
4. Clique em **Deploy**. O Next.js App Router será compilado e publicado automaticamente no runtime Node.js.
