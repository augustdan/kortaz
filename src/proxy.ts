import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Cabeçalhos essenciais de segurança para produção
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const path = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get('barberos_session')?.value);

  // Proteção rápida na borda: redireciona usuários sem cookie de sessão ao tentar abrir /app ou /admin
  if ((path.startsWith('/app') || path.startsWith('/admin')) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
};
