'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import type { AppResource, PermissionAction } from '@/lib/domain/permissions';

export function PermissionGuard({
  resource,
  action = 'can_view',
  children,
}: {
  resource: AppResource;
  action?: PermissionAction;
  children: React.ReactNode;
}) {
  const { data, can } = useWorkspace();

  if (!data) return null;

  if (!can(resource, action)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[#E05252]/40 bg-[#151515] p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-[#E05252]" />
        <h2 className="mt-4 font-serif text-2xl font-semibold text-[#F5F2EC]">
          Permissão Insuficiente
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#A5A5A5]">
          Seu perfil atual (<strong className="text-[#C9A063]">{data.session.roleCode}</strong>) não
          possui autorização para acessar o módulo <strong>{resource}</strong>. Caso precise de
          acesso, solicite ao proprietário em Configurações &rarr; Permissões.
        </p>
        <Link
          href="/app/agenda"
          className="mt-6 inline-block rounded-lg bg-[#C9A063] px-5 py-2.5 text-xs font-bold text-[#0B0B0B]"
        >
          Voltar para Minha Agenda
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
