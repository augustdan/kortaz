import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { RoleCode, SessionContext } from '@/lib/types/domain';
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from '@/lib/server/auth-crypto';
import { readDb, resolveSessionContext } from '@/lib/server/store';
import { assertPermission, type AppResource, type PermissionAction } from '@/lib/domain/permissions';
import { checkRateLimit } from '@/lib/server/rate-limit';

export async function getRequestSession(request?: Request): Promise<SessionContext | null> {
  let token: string | undefined;

  if (request) {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (match) {
        token = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
      }
    }
  }

  if (!token) {
    try {
      const store = await cookies();
      token = store.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const db = await readDb();
  return resolveSessionContext(db, payload.profileId, payload.tenantId);
}

export async function requireAuthorizedSession(params: {
  request: Request;
  resource: AppResource;
  action: PermissionAction;
  targetTenantId?: string | null;
}): Promise<
  | { ok: true; session: SessionContext }
  | { ok: false; response: NextResponse }
> {
  const ip = params.request.headers.get('x-forwarded-for') || 'local';
  const rl = checkRateLimit({ key: `${ip}:${params.resource}`, maxRequests: 180, windowMs: 60_000 });
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Muitas requisições em sequência. Aguarde alguns segundos.' },
        { status: 429 }
      ),
    };
  }

  const session = await getRequestSession(params.request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sessão não autenticada. Faça login para continuar.' },
        { status: 401 }
      ),
    };
  }

  // Isolamento estrito multi-tenant: usuário de um tenant jamais acessa outro tenant
  if (
    params.targetTenantId &&
    session.roleCode !== 'SUPER_ADMIN' &&
    session.tenant?.id !== params.targetTenantId
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Acesso negado: isolamento multi-tenant violado.' },
        { status: 403 }
      ),
    };
  }

  const db = await readDb();
  const permCheck = assertPermission({
    roleCode: session.roleCode,
    resource: params.resource,
    action: params.action,
    customPermissions: db.permissions,
    roleId: session.membership?.role_id,
  });

  if (!permCheck.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: permCheck.error }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

export function attachSessionCookie(
  response: NextResponse,
  profileId: string,
  tenantId: string | null
): NextResponse {
  const token = signSessionToken({
    profileId,
    tenantId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export function roleFromEmailForDemo(roleCode: RoleCode): string {
  switch (roleCode) {
    case 'SUPER_ADMIN':
      return 'superadmin@barberos.com.br';
    case 'OWNER':
      return 'dono@exclusiva.com.br';
    case 'MANAGER':
      return 'gerente@exclusiva.com.br';
    case 'BARBER':
      return 'lucas@exclusiva.com.br';
    case 'RECEPTIONIST':
      return 'recepcao@exclusiva.com.br';
    case 'CUSTOMER':
      return 'cliente@exclusiva.com.br';
  }
}
