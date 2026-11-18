import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const tempDir = path.join(os.tmpdir(), `barberos-test-${Date.now()}`);
const tempDbFile = path.join(tempDir, 'store.json');
process.env.BARBEROS_DATA_FILE = tempDbFile;
process.env.BARBEROS_SESSION_SECRET = 'test-secret-key-for-barberos-unit-suite';

import {
  addBarberWithPlanGuard,
  applyAppointmentAction,
  authenticateUser,
  createAppointmentTransactional,
  mutateDb,
  readDb,
  registerTenantAccount,
  resetDbForTesting,
} from '@/lib/server/store';
import { buildZonedIso } from '@/lib/domain/scheduling';
import { verifyMercadoPagoWebhookSignature } from '@/lib/integrations/mercadopago';
import { POST as authPost } from '@/app/api/auth/route';
import { GET as stateGet } from '@/app/api/state/route';
import { POST as appointmentsPost } from '@/app/api/appointments/route';
import { PATCH as appointmentPatch } from '@/app/api/appointments/[id]/route';
import { POST as cashRegisterPost } from '@/app/api/cash-register/route';
import { GET as adminGet, POST as adminPost } from '@/app/api/admin/route';
import { POST as paymentCheckoutPost } from '@/app/api/payments/checkout/route';
import { POST as webhookMpPost } from '@/app/api/webhooks/mercadopago/route';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/server/auth-crypto';

function makeCookieHeader(profileId: string, tenantId: string | null): string {
  const token = signSessionToken({
    profileId,
    tenantId,
    exp: Date.now() + 3600_000,
  });
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

function futureWeekdayDateStr(daysAhead = 3): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1); // evita domingo
  return d.toISOString().slice(0, 10);
}

describe('BarberOS — Suíte Completa de Testes (Seção 25)', () => {
  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    await resetDbForTesting();
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('1 & 4. Cadastro e Criação de Barbearia cria tenant, matriz, barbeiro e assinatura isolada', async () => {
    const res = await registerTenantAccount({
      ownerName: 'Eduardo Mendes',
      email: 'eduardo@imperialcut.com.br',
      phone: '(11) 98765-4321',
      password: 'SenhaForte123',
      barbershopName: 'Imperial Cut Studio',
      slug: 'imperial-cut',
      city: 'Curitiba',
      state: 'PR',
      address: 'Rua XV de Novembro, 400',
      planCode: 'pro',
    });

    expect(res.ok).toBe(true);
    expect(res.slug).toBe('imperial-cut');

    const db = await readDb();
    const tenant = db.tenants.find((t) => t.id === res.tenantId);
    const branch = db.branches.find((b) => b.tenant_id === res.tenantId);
    const barber = db.barbers.find((b) => b.tenant_id === res.tenantId);
    const sub = db.subscriptions.find((s) => s.tenant_id === res.tenantId);

    expect(tenant?.name).toBe('Imperial Cut Studio');
    expect(branch?.is_headquarters).toBe(true);
    expect(barber?.name).toBe('Eduardo Mendes');
    expect(sub?.plan_id).toBe('plan-pro');
  });

  it('2. Login autentica credenciais válidas e rejeita senha inválida', async () => {
    const valid = await authenticateUser({
      email: 'dono@exclusiva.com.br',
      password: 'BarberOS@2026',
    });
    expect(valid.ok).toBe(true);
    expect(valid.context?.roleCode).toBe('OWNER');
    expect(valid.context?.tenant?.id).toBe('tenant-exclusiva');

    const invalid = await authenticateUser({
      email: 'dono@exclusiva.com.br',
      password: 'SenhaErrada',
    });
    expect(invalid.ok).toBe(false);
  });

  it('3. Recuperação de senha gera token válido e redefine a senha com sucesso', async () => {
    const reqReset = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'password_reset_request',
        email: 'lucas@exclusiva.com.br',
      }),
    });
    const resReset = await authPost(reqReset);
    const jsonReset = await resReset.json();
    expect(resReset.status).toBe(200);
    expect(jsonReset.previewToken).toBeTruthy();

    const reqConfirm = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'password_reset_confirm',
        token: jsonReset.previewToken,
        newPassword: 'NovaSenha@2027',
      }),
    });
    const resConfirm = await authPost(reqConfirm);
    expect(resConfirm.status).toBe(200);

    const authNew = await authenticateUser({
      email: 'lucas@exclusiva.com.br',
      password: 'NovaSenha@2027',
    });
    expect(authNew.ok).toBe(true);
  });

  it('5. Isolamento multi-tenant impede acesso cruzado entre barbearias', async () => {
    const ownerBCookie = makeCookieHeader('profile-owner-b', 'tenant-navalha');

    // Tentativa de ler dados do tenant Exclusiva usando sessão do tenant Navalha
    const reqCross = new Request('http://localhost/api/state?tenantId=tenant-exclusiva', {
      headers: { cookie: ownerBCookie },
    });
    const resCross = await stateGet(reqCross);
    expect(resCross.status).toBe(403);

    // Leitura do próprio tenant retorna apenas seus registros
    const reqOwn = new Request('http://localhost/api/state', {
      headers: { cookie: ownerBCookie },
    });
    const resOwn = await stateGet(reqOwn);
    const jsonOwn = await resOwn.json();
    expect(resOwn.status).toBe(200);
    expect(jsonOwn.tenant.id).toBe('tenant-navalha');
    expect(jsonOwn.appointments.every((a: { tenant_id: string }) => a.tenant_id === 'tenant-navalha')).toBe(true);
  });

  it('6 & 7. Criação de agendamento e prevenção de conflito/race condition em requisições simultâneas', async () => {
    const dateStr = futureWeekdayDateStr(4);
    const startsAt = buildZonedIso(dateStr, '15:00');

    // Duas chamadas concorrentes simultâneas para o mesmo barbeiro e mesmo horário
    const [r1, r2] = await Promise.all([
      createAppointmentTransactional({
        tenantId: 'tenant-exclusiva',
        branchId: 'branch-exclusiva-jardins',
        barberId: 'barber-lucas',
        serviceIds: ['svc-corte'],
        startsAt,
        customerName: 'Cliente A Simultâneo',
        customerPhone: '(11) 91111-1111',
      }),
      createAppointmentTransactional({
        tenantId: 'tenant-exclusiva',
        branchId: 'branch-exclusiva-jardins',
        barberId: 'barber-lucas',
        serviceIds: ['svc-corte'],
        startsAt,
        customerName: 'Cliente B Simultâneo',
        customerPhone: '(11) 92222-2222',
      }),
    ]);

    const successes = [r1, r2].filter((r) => r.ok);
    const conflicts = [r1, r2].filter((r) => !r.ok && r.statusCode === 409);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
  });

  it('8 & 9. Remarcação valida conflitos e Cancelamento aciona Lista de Espera automática', async () => {
    const dateStr = futureWeekdayDateStr(5);
    const slot1 = buildZonedIso(dateStr, '10:00');
    const slot2 = buildZonedIso(dateStr, '11:00');

    const created = await createAppointmentTransactional({
      tenantId: 'tenant-exclusiva',
      branchId: 'branch-exclusiva-jardins',
      barberId: 'barber-lucas',
      serviceIds: ['svc-corte'],
      startsAt: slot1,
      customerName: 'Roberto Remarcado',
      customerPhone: '(11) 93333-4444',
    });
    expect(created.ok).toBe(true);

    // Adiciona um cliente na lista de espera para slot2
    const waitReq = new Request('http://localhost/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'waitlist',
        tenantId: 'tenant-exclusiva',
        branchId: 'branch-exclusiva-jardins',
        serviceId: 'svc-corte',
        barberId: 'barber-lucas',
        desiredDate: dateStr,
        desiredPeriod: 'morning',
        customerName: 'Interessado Lista Espera',
        customerPhone: '(11) 98888-9999',
      }),
    });
    const waitRes = await appointmentsPost(waitReq);
    expect(waitRes.status).toBe(201);

    // Remarcar para 11:00
    const resched = await applyAppointmentAction({
      tenantId: 'tenant-exclusiva',
      appointmentId: created.appointment!.id,
      action: 'reschedule',
      newStartsAt: slot2,
    });
    expect(resched.ok).toBe(true);
    expect(resched.appointment?.starts_at).toBe(slot2);

    // Cancelar às 11:00 -> deve notificar lista de espera dessa data!
    const ownerCookie = makeCookieHeader('profile-owner-a', 'tenant-exclusiva');
    const cancelRes = await appointmentPatch(
      new Request(`http://localhost/api/appointments/${created.appointment!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: ownerCookie },
        body: JSON.stringify({ tenantId: 'tenant-exclusiva', action: 'cancel' }),
      }),
      { params: Promise.resolve({ id: created.appointment!.id }) }
    );
    const cancelJson = await cancelRes.json();
    expect(cancelRes.status).toBe(200);
    expect(cancelJson.notifiedWaitlistCount).toBeGreaterThanOrEqual(1);
  });

  it('10 & 11. Pagamentos não aprovam sem Webhook e assinatura HMAC Mercado Pago é validada', async () => {
    const ownerCookie = makeCookieHeader('profile-owner-a', 'tenant-exclusiva');

    // Sem MERCADO_PAGO_ACCESS_TOKEN configurado, não simula pagamento aprovado!
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const payRes = await paymentCheckoutPost(
      new Request('http://localhost/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: ownerCookie },
        body: JSON.stringify({
          tenantId: 'tenant-exclusiva',
          appointmentId: 'appt-3',
          method: 'pix',
          amount: 50,
        }),
      })
    );
    const payJson = await payRes.json();
    expect(payRes.status).toBe(422);
    expect(payJson.code).toBe('INTEGRATION_NOT_CONFIGURED');
    expect(payJson.status).toBe('pending');

    // Validação criptográfica da assinatura do Webhook Mercado Pago
    const secret = 'mp-webhook-secret-123';
    const dataId = '99887766';
    const reqId = 'req-abc-01';
    const ts = '1700000000';
    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const validHmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignatureHeader: `ts=${ts},v1=${validHmac}`,
        xRequestIdHeader: reqId,
        dataId,
        secret,
      }).valid
    ).toBe(true);

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignatureHeader: `ts=${ts},v1=assinatura_adulterada`,
        xRequestIdHeader: reqId,
        dataId,
        secret,
      }).valid
    ).toBe(false);

    // Endpoint webhook rejeita assinatura inválida com 401
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    const webhookRes = await webhookMpPost(
      new Request('http://localhost/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `ts=${ts},v1=assinatura_falsa`,
          'x-request-id': reqId,
        },
        body: JSON.stringify({ data: { id: dataId } }),
      })
    );
    expect(webhookRes.status).toBe(401);
  });

  it('12. Comissões calculam corretamente e preservam snapshot histórico após alteração da regra', async () => {
    const dateStr = futureWeekdayDateStr(6);
    const created = await createAppointmentTransactional({
      tenantId: 'tenant-exclusiva',
      branchId: 'branch-exclusiva-jardins',
      barberId: 'barber-lucas',
      serviceIds: ['svc-corte'], // R$ 50,00 | regra atual Lucas = 50% -> R$ 25,00
      startsAt: buildZonedIso(dateStr, '14:00'),
      customerName: 'Cliente Comissão',
      customerPhone: '(11) 97777-8888',
    });

    const completed = await applyAppointmentAction({
      tenantId: 'tenant-exclusiva',
      appointmentId: created.appointment!.id,
      action: 'complete',
      paymentMethod: 'cash',
    });

    expect(completed.ok).toBe(true);
    expect(completed.generatedCommissions).toHaveLength(1);
    const commId = completed.generatedCommissions![0].id;
    expect(completed.generatedCommissions![0].commission_amount).toBe(25);

    // Altera a regra do Lucas de 50% para 70% posteriormente
    await mutateDb((db) => {
      const rule = db.commission_rules.find((r) => r.barber_id === 'barber-lucas');
      if (rule) rule.value = 70;
    });

    const dbAfter = await readDb();
    const preserved = dbAfter.commissions.find((c) => c.id === commId);
    expect(preserved?.commission_amount).toBe(25);
    expect(preserved?.applied_rule_value).toBe(50);
  });

  it('13 & 14. Assinaturas aplicam cupom SaaS e Limite de Plano bloqueia sem apagar dados', async () => {
    // Tenant Navalha está no Plano Starter (limite = 2 profissionais; já possui 1)
    const addSecond = await addBarberWithPlanGuard({
      tenantId: 'tenant-navalha',
      branchId: 'branch-navalha-centro',
      name: 'Segundo Barbeiro',
      specialty: 'Fade',
      defaultCommissionPercent: 50,
      monthlyRevenueGoal: 4000,
    });
    expect(addSecond.ok).toBe(true);

    // Tentativa de criar o 3º barbeiro deve ser bloqueada (402) mantendo os 2 já salvos!
    const addThird = await addBarberWithPlanGuard({
      tenantId: 'tenant-navalha',
      branchId: 'branch-navalha-centro',
      name: 'Terceiro Barbeiro Bloqueado',
      specialty: 'Barba',
      defaultCommissionPercent: 50,
      monthlyRevenueGoal: 4000,
    });
    expect(addThird.ok).toBe(false);
    expect(addThird.statusCode).toBe(402);

    // Upgrade do tenant Navalha para Plano Pro usando cupom BARBEROS20 via API
    const ownerBCookie = makeCookieHeader('profile-owner-b', 'tenant-navalha');
    const upgradeRes = await adminPost(
      new Request('http://localhost/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: ownerBCookie },
        body: JSON.stringify({
          action: 'change_tenant_plan',
          tenantId: 'tenant-navalha',
          planCode: 'pro',
          couponCode: 'BARBEROS20',
        }),
      })
    );
    expect(upgradeRes.status).toBe(200);

    // Agora o 3º barbeiro passa sem problemas e os dados antigos continuam intactos!
    const addThirdAfterUpgrade = await addBarberWithPlanGuard({
      tenantId: 'tenant-navalha',
      branchId: 'branch-navalha-centro',
      name: 'Terceiro Barbeiro Liberado',
      specialty: 'Barba',
      defaultCommissionPercent: 50,
      monthlyRevenueGoal: 4000,
    });
    expect(addThirdAfterUpgrade.ok).toBe(true);
  });

  it('15. Permissões RBAC bloqueiam BARBER no financeiro e OWNER no console Super Admin', async () => {
    const barberCookie = makeCookieHeader('profile-barber-lucas', 'tenant-exclusiva');
    const ownerCookie = makeCookieHeader('profile-owner-a', 'tenant-exclusiva');
    const superAdminCookie = makeCookieHeader('profile-superadmin', null);

    // Barbeiro não pode movimentar caixa/financeiro
    const cashRes = await cashRegisterPost(
      new Request('http://localhost/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: barberCookie },
        body: JSON.stringify({
          action: 'bleed',
          tenantId: 'tenant-exclusiva',
          branchId: 'branch-exclusiva-jardins',
          amount: 50,
        }),
      })
    );
    expect(cashRes.status).toBe(403);

    // Proprietário comum não pode acessar Console Super Admin
    const ownerAdminRes = await adminGet(
      new Request('http://localhost/api/admin', {
        headers: { cookie: ownerCookie },
      })
    );
    expect(ownerAdminRes.status).toBe(403);

    // Super Admin tem acesso completo ao Console Super Admin
    const superAdminRes = await adminGet(
      new Request('http://localhost/api/admin', {
        headers: { cookie: superAdminCookie },
      })
    );
    expect(superAdminRes.status).toBe(200);
  });
});
