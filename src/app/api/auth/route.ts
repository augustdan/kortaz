import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  LoginSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestSchema,
  RegisterTenantSchema,
} from '@/lib/validations/schemas';
import {
  appendAuditLog,
  authenticateUser,
  mutateDb,
  readDb,
  registerTenantAccount,
  resolveSessionContext,
} from '@/lib/server/store';
import { hashPassword, SESSION_COOKIE_NAME, signSessionToken } from '@/lib/server/auth-crypto';
import { attachSessionCookie, getRequestSession } from '@/lib/server/request-auth';
import { dispatchTransactionalEmail } from '@/lib/integrations/resend';

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false, session: null });
  }
  return NextResponse.json({ authenticated: true, session });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action === 'logout') {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    if (action === 'register') {
      const parsed = RegisterTenantSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Dados de cadastro inválidos.' },
          { status: 400 }
        );
      }

      const result = await registerTenantAccount(parsed.data);
      if (!result.ok || !result.profileId) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const db = await readDb();
      const session = resolveSessionContext(db, result.profileId, result.tenantId);
      const res = NextResponse.json({
        ok: true,
        tenantId: result.tenantId,
        slug: result.slug,
        session,
      }, { status: 201 });
      return attachSessionCookie(res, result.profileId, result.tenantId ?? null);
    }

    if (action === 'password_reset_request') {
      const parsed = PasswordResetRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const resetResult = await mutateDb(async (db) => {
        const profile = db.profiles.find(
          (p) => p.email.toLowerCase() === parsed.data.email.toLowerCase()
        );
        if (!profile) {
          return { found: false };
        }
        const token = crypto.randomBytes(24).toString('hex');
        db.password_reset_tokens.push({
          token,
          email: profile.email,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recuperar-senha?token=${token}`;
        const emailDispatch = await dispatchTransactionalEmail({
          to: profile.email,
          subject: 'Recuperação de senha — Kortaz',
          html: `<p>Olá ${profile.full_name}, clique para redefinir sua senha: <a href="${resetUrl}">${resetUrl}</a></p>`,
        });

        appendAuditLog(db, {
          tenant_id: null,
          actor_profile_id: profile.id,
          actor_email: profile.email,
          action: 'PASSWORD_RESET_REQUESTED',
          entity: 'profiles',
          entity_id: profile.id,
          severity: 'info',
          details: { emailConfigured: emailDispatch.configured },
        });

        return {
          found: true,
          emailConfigured: emailDispatch.configured,
          // Em ambiente sem SMTP/Resend configurado, retorna orientação explícita (sem simular envio externo)
          previewToken: !emailDispatch.configured ? token : undefined,
        };
      });

      return NextResponse.json({
        ok: true,
        message:
          'Se o e-mail estiver cadastrado, as instruções de redefinição foram geradas com segurança.',
        ...resetResult,
      });
    }

    if (action === 'password_reset_confirm') {
      const parsed = PasswordResetConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const confirmResult = await mutateDb((db) => {
        const record = db.password_reset_tokens.find(
          (t) => t.token === parsed.data.token && !t.used_at
        );
        if (!record || new Date(record.expires_at).getTime() < Date.now()) {
          return { ok: false, error: 'Token de recuperação inválido ou expirado.' };
        }
        const profile = db.profiles.find((p) => p.email === record.email);
        if (!profile) return { ok: false, error: 'Usuário não localizado.' };

        profile.password_hash = hashPassword(parsed.data.newPassword);
        record.used_at = new Date().toISOString();

        appendAuditLog(db, {
          tenant_id: null,
          actor_profile_id: profile.id,
          actor_email: profile.email,
          action: 'PASSWORD_RESET_COMPLETED',
          entity: 'profiles',
          entity_id: profile.id,
          severity: 'warning',
          details: {},
        });
        return { ok: true };
      });

      if (!confirmResult.ok) {
        return NextResponse.json({ error: confirmResult.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: 'Senha atualizada com sucesso.' });
    }

    // Login padrão (ou ação explícita 'login')
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Credenciais inválidas.' },
        { status: 400 }
      );
    }

    const auth = await authenticateUser(parsed.data);
    if (!auth.ok || !auth.context) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const token = signSessionToken({
      profileId: auth.context.profile.id,
      tenantId: auth.context.tenant?.id ?? null,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    const res = NextResponse.json({ ok: true, token, session: auth.context });
    return attachSessionCookie(
      res,
      auth.context.profile.id,
      auth.context.tenant?.id ?? null
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno de autenticação.' },
      { status: 500 }
    );
  }
}
